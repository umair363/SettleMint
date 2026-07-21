import { FastifyRequest, FastifyReply } from "fastify";
import { scanReceipt } from "../utils/receiptScanner";
import { parseNaturalLanguageExpense } from "../utils/mintBotParser";
import { receiptScanSchema, mintBotParseSchema } from "@settlemint/shared";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// POST /api/ai/scan-receipt
export const scanReceiptImage = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = receiptScanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    // Gemini Vision pipeline — extracts merchant/total/items from the image.
    const scanResult = await scanReceipt(parsed.data.imageBase64, parsed.data.mimeType);

    return reply.code(200).send({ result: scanResult });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Failed to scan receipt" });
  }
};

// POST /api/ai/parse-nlp
export const parseNaturalLanguage = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const parsed = mintBotParseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    // MintBot NLP pipeline — extracts a structured expense intent from free text.
    const parseResult = await parseNaturalLanguageExpense(parsed.data.text);

    return reply.code(200).send({ result: parseResult });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Failed to parse natural language" });
  }
};
