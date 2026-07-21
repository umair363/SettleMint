// mintBotParser.ts

export type SplitType = "equal" | "unequal" | "percentage" | "shares";

export interface ParsedExpenseIntent {
  description: string;
  totalAmount: number;
  currency: string;
  paidByNickname: string; // "me", "friend", etc.
  splitType: SplitType;
  participantsNicknames: string[];
  confidence: number;
}

/**
 * Natural Language Expense Parser (MintBot)
 * Uses Gemini API to extract structured expense commands from plain text.
 */
export async function parseNaturalLanguageExpense(text: string): Promise<ParsedExpenseIntent> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables. Please add it to enable MintBot.");
  }

  const systemInstruction = `You are a financial assistant for an expense splitting app (like Splitwise). 
Extract the intent from the user's natural language input into a structured JSON format.
Rules for extraction:
1. "description": A short title for the expense (e.g. "Dinner", "Uber").
2. "totalAmount": The total numeric amount. If not found, use 0.
3. "currency": A 3-letter currency code (e.g. "USD", "EUR"). Default to "USD".
4. "paidByNickname": Who paid? Usually "me", but could be a friend's name. Default "me".
5. "splitType": Must be exactly one of: "equal", "unequal", "percentage", "shares". Default "equal".
6. "participantsNicknames": A list of names involved. If the user says "split 3 ways", assume "me" and 2 others.

Respond ONLY with valid JSON. No markdown backticks, no extra text.
Schema:
{
  "description": string,
  "totalAmount": number,
  "currency": string,
  "paidByNickname": string,
  "splitType": "equal" | "unequal" | "percentage" | "shares",
  "participantsNicknames": string[],
  "confidence": number
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: `User Input: "${text}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(()=>({}));
      console.error("Gemini API Error:", err);
      throw new Error("Failed to process with Gemini API");
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(rawText) as ParsedExpenseIntent;
    
    // Ensure safety bounds
    return {
      description: parsed.description || "Expense",
      totalAmount: parsed.totalAmount || 0,
      currency: parsed.currency || "USD",
      paidByNickname: parsed.paidByNickname || "me",
      splitType: parsed.splitType || "equal",
      participantsNicknames: parsed.participantsNicknames || ["me"],
      confidence: parsed.confidence || 0.9,
    };
  } catch (error) {
    console.error("NLP Parse Error:", error);
    throw new Error("AI could not understand that input. Try being more specific.");
  }
}

