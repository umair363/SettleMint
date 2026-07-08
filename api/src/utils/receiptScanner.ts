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
  confidence: number;
}

/**
 * AI Receipt Scanner Service
 * Uses Gemini Vision API to extract receipt data strictly as JSON.
 */
export async function scanReceipt(base64Image: string): Promise<ReceiptScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables. Please add it to enable Receipt Scanning.");
  }

  // Remove the data URI prefix if present (e.g. data:image/jpeg;base64,...)
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const systemInstruction = `You are a highly accurate receipt parsing AI. 
Analyze the provided receipt image and extract the data strictly as JSON matching this schema:
{
  "merchantName": string,
  "totalAmount": number,
  "currency": string (3 letter code, default USD),
  "date": string (YYYY-MM-DD),
  "items": [{"name": string, "price": number}],
  "confidence": number (0 to 1)
}
Return ONLY valid JSON. Do not include markdown code block formatting.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            parts: [
              { text: "Extract the receipt details." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(()=>({}));
      console.error("Gemini Vision API Error:", err);
      throw new Error("Failed to process receipt image with AI");
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("Empty response from AI Vision");

    const parsed = JSON.parse(rawText) as ReceiptScanResult;
    
    return {
      merchantName: parsed.merchantName || "Unknown Merchant",
      totalAmount: parsed.totalAmount || 0,
      currency: parsed.currency || "USD",
      date: parsed.date || new Date().toISOString().split("T")[0],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      confidence: parsed.confidence || 0.9,
    };
  } catch (error) {
    console.error("Receipt Scan Error:", error);
    throw new Error("AI could not read that receipt. Please ensure the image is clear.");
  }
}

