const rates: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  PKR: 278.0,
  INR: 83.0,
  CAD: 1.37,
  AUD: 1.51,
  AED: 3.67,
  SAR: 3.75,
  THB: 36.5,
  SGD: 1.35,
  JPY: 157.0,
  CNY: 7.25,
  CHF: 0.90
};

export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", PKR: "Rs", INR: "₹",
    CAD: "$", AUD: "$", AED: "د.إ", SAR: "﷼", THB: "฿",
    SGD: "$", JPY: "¥", CNY: "¥", CHF: "Fr"
  };
  return symbols[code] || "$";
};

export const convertCurrency = (amount: number, from: string, to: string): number => {
  const cleanFrom = from.toUpperCase();
  const cleanTo = to.toUpperCase();
  
  if (cleanFrom === cleanTo) return amount;
  
  const fromRate = rates[cleanFrom];
  const toRate = rates[cleanTo];
  
  if (!fromRate || !toRate) return amount; // Fallback if rate not found
  
  // Convert from source currency to USD, then from USD to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
};
