export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

// Single source of truth — previously duplicated with drift across
// budget/page.tsx, budget/analytics/page.tsx, and AddExpenseForm.tsx.
export const CATEGORIES: Category[] = [
  { id: "food", label: "Food & Drink", emoji: "🍽️", color: "#FF6B6B" },
  { id: "transport", label: "Transport", emoji: "🚕", color: "#FFA94D" },
  { id: "accommodation", label: "Accommodation", emoji: "🏨", color: "#74C0FC" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬", color: "#B197FC" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "#F783AC" },
  { id: "bills", label: "Bills & Utilities", emoji: "💡", color: "#63E6BE" },
  { id: "groceries", label: "Groceries", emoji: "🛒", color: "#A9E34B" },
  { id: "health", label: "Health", emoji: "💊", color: "#74C0FC" },
  { id: "other", label: "Other", emoji: "📌", color: "#adb5bd" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export function getCategoryMeta(id: string | undefined | null): Category {
  const fallback = CATEGORIES[CATEGORIES.length - 1];
  if (!id) return fallback;
  return CATEGORIES.find((c) => c.id === id.toLowerCase()) ?? fallback;
}

export const WALLETS = [
  { id: "card", label: "Card", emoji: "💳" },
  { id: "cash", label: "Cash", emoji: "💵" },
  { id: "bank", label: "Bank", emoji: "🏦" },
] as const;

export const WALLET_IDS = ["card", "cash", "bank"] as const;
export type WalletId = (typeof WALLET_IDS)[number];
