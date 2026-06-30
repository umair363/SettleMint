// mintBotParser.ts

import { SplitType } from "./splitCalculator";

export interface ParsedExpenseIntent {
  description: string;
  totalAmount: number;
  currency: string;
  paidByNickname: string; // "me", "hamza", etc.
  splitType: SplitType;
  participantsNicknames: string[]; // e.g. ["me", "hamza", "sara"]
  confidence: number;
}

/**
 * Natural Language Expense Parser (MintBot)
 * Extracts structured expense commands from plain text.
 * Example input: "Dinner 4500 split 3 ways I paid"
 * In production, this uses an LLM (Claude) to extract parameters dynamically.
 */
export async function parseNaturalLanguageExpense(text: string): Promise<ParsedExpenseIntent> {
  const normalized = text.toLowerCase();
  
  // Basic heuristic fallback if LLM is down, but ideally this calls an LLM endpoint.
  // We simulate an LLM parsing here for demonstration.
  
  const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)/);
  const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  
  const currencyMatch = normalized.match(/\b(usd|eur|pkr|gbp)\b/);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : "USD";
  
  let paidByNickname = "unknown";
  if (normalized.includes("i paid") || normalized.includes("me paid") || normalized.includes("paid by me")) {
    paidByNickname = "me";
  }

  return {
    description: "MintBot Extracted Expense", // In prod: LLM provides "Dinner"
    totalAmount,
    currency,
    paidByNickname,
    splitType: "EQUAL", // Default assumption, LLM could extract PERCENTAGE or EXACT
    participantsNicknames: ["me"], // In prod: ["me", "hamza", "sara"]
    confidence: totalAmount > 0 ? 0.8 : 0.2, // If we found an amount, we're confident
  };
}
