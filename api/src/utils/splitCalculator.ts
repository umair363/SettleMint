// splitCalculator.ts

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface SplitInput {
  userId: string;
  value?: number; // Depending on type: exact amount, percentage (0-100), or number of shares
}

export interface SplitResult {
  userId: string;
  amountOwed: number;
}

/**
 * Advanced Split Engine
 * Takes a total expense amount, the type of split, and the participant values.
 * Computes exact cent-accurate amounts, ensuring no floating-point pennies are lost.
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: SplitInput[]
): SplitResult[] {
  if (participants.length === 0) {
    throw new Error("Cannot split an expense with 0 participants.");
  }

  // Work in cents to avoid floating point math errors
  const totalCents = Math.round(totalAmount * 100);
  let remainingCents = totalCents;
  const results: SplitResult[] = [];

  switch (splitType) {
    case "EQUAL": {
      const perPersonCents = Math.floor(totalCents / participants.length);
      participants.forEach((p) => {
        results.push({ userId: p.userId, amountOwed: perPersonCents / 100 });
        remainingCents -= perPersonCents;
      });
      break;
    }

    case "EXACT": {
      let sumExactCents = 0;
      participants.forEach((p) => {
        const amt = Math.round((p.value || 0) * 100);
        sumExactCents += amt;
        results.push({ userId: p.userId, amountOwed: amt / 100 });
      });
      if (sumExactCents !== totalCents) {
        throw new Error("Exact split amounts must sum up to the total expense amount.");
      }
      return results; // No penny distribution needed
    }

    case "PERCENTAGE": {
      let sumPercentages = 0;
      participants.forEach((p) => {
        sumPercentages += p.value || 0;
        const assignedCents = Math.floor(totalCents * ((p.value || 0) / 100));
        results.push({ userId: p.userId, amountOwed: assignedCents / 100 });
        remainingCents -= assignedCents;
      });
      if (Math.abs(sumPercentages - 100) > 0.01) {
        throw new Error("Percentages must sum up to 100%.");
      }
      break;
    }

    case "SHARES": {
      let totalShares = 0;
      participants.forEach((p) => (totalShares += p.value || 0));
      if (totalShares === 0) throw new Error("Total shares cannot be zero.");

      participants.forEach((p) => {
        const shareRatio = (p.value || 0) / totalShares;
        const assignedCents = Math.floor(totalCents * shareRatio);
        results.push({ userId: p.userId, amountOwed: assignedCents / 100 });
        remainingCents -= assignedCents;
      });
      break;
    }

    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }

  // Distribute any remaining pennies (due to flooring) round-robin to the first N participants
  let i = 0;
  while (remainingCents > 0) {
    // Add 1 cent to the current person
    results[i].amountOwed = Math.round((results[i].amountOwed * 100) + 1) / 100;
    remainingCents -= 1;
    i = (i + 1) % results.length;
  }

  return results;
}
