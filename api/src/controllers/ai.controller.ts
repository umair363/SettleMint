import { FastifyRequest, FastifyReply } from "fastify";
import { scanReceipt } from "../utils/receiptScanner";
import { parseNaturalLanguageExpense } from "../utils/mintBotParser";

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

    const { base64Image } = request.body as { base64Image: string };

    if (!base64Image) {
      return reply.code(400).send({ error: "Missing base64Image in request body" });
    }

    // Pass the image buffer/string to our Claude Vision pipeline
    const scanResult = await scanReceipt(base64Image);

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

    const { text } = request.body as { text: string };

    if (!text) {
      return reply.code(400).send({ error: "Missing text in request body" });
    }

    // Pass the text to our MintBot NLP pipeline
    const parseResult = await parseNaturalLanguageExpense(text);

    return reply.code(200).send({ result: parseResult });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Failed to parse natural language" });
  }
};
