// receiptScanner.ts

export interface ScannedItem {
  name: string;
  price: number;
}

export interface ReceiptScanResult {
  merchantName: string;
  totalAmount: number;
  currency: string;
  date: string;
  items: ScannedItem[];
  confidence: number; // 0 to 1
}

/**
 * AI Receipt Scanner Service (Claude Vision Simulator)
 * In production, this would send the image buffer to Anthropic's claude-3-5-sonnet API
 * with a prompt to extract the receipt data strictly as JSON.
 */
export async function scanReceipt(base64Image: string): Promise<ReceiptScanResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // NOTE: Production implementation requires Anthropic API key
  // Example prompt:
  // "You are a specialized receipt parser. Extract the merchant name, total amount, currency (3 letter code), date (YYYY-MM-DD), and line items (name, price) from this image. Return ONLY valid JSON matching this schema..."
  
  // Simulated perfect extraction response
  return {
    merchantName: "Carrefour",
    totalAmount: 125.50,
    currency: "USD",
    date: new Date().toISOString().split("T")[0],
    items: [
      { name: "Coffee Beans", price: 15.00 },
      { name: "Avocados", price: 6.50 },
      { name: "Steak", price: 45.00 },
      { name: "Household Supplies", price: 59.00 }
    ],
    confidence: 0.94,
  };
}
