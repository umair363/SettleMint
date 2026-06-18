// settlementEngine.ts
// Calculates the optimal settlement plan for a group of users

export interface Expense {
  id: string;
  amount: number;
  paidBy: string;
}

export interface ExpenseSplit {
  expenseId: string;
  userId: string;
  amountOwed: number;
  isSettled: boolean;
}

export interface Settlement {
  paidBy: string;
  paidTo: string;
  amount: number;
}

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

/**
 * Calculates the exact net balance for each user in the group.
 * Positive balance means the user is OWED money.
 * Negative balance means the user OWES money.
 */
export function calculateBalances(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // 1. Add what they paid for expenses (they are owed this money)
  for (const exp of expenses) {
    if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
    balances[exp.paidBy] += Number(exp.amount);
  }

  // 2. Subtract what they owe from splits
  for (const split of splits) {
    if (!balances[split.userId]) balances[split.userId] = 0;
    balances[split.userId] -= Number(split.amountOwed);
  }

  // 3. Apply settlements (repayments)
  for (const st of settlements) {
    if (!balances[st.paidBy]) balances[st.paidBy] = 0;
    if (!balances[st.paidTo]) balances[st.paidTo] = 0;
    
    // The person who paid the settlement reduces their debt (balance goes up)
    balances[st.paidBy] += Number(st.amount);
    // The person who received it reduces their credit (balance goes down)
    balances[st.paidTo] -= Number(st.amount);
  }

  // Fix floating point errors
  for (const userId in balances) {
    balances[userId] = Math.round(balances[userId] * 100) / 100;
  }

  return balances;
}

/**
 * Calculates the minimum number of transactions needed to settle all debts.
 * Uses a greedy algorithm: match highest debtor with highest creditor.
 */
export function calculateSuggestedSettlements(balances: Record<string, number>): SettlementTransaction[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(balances)) {
    if (balance < -0.01) debtors.push({ userId, amount: Math.abs(balance) });
    else if (balance > 0.01) creditors.push({ userId, amount: balance });
  }

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];

  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.amount, creditor.amount);
    
    // Fix floating point accuracy
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: roundedAmount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return transactions;
}
