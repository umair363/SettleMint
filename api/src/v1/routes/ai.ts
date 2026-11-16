import { and, eq, lt, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { scanReceiptBody, todayIn, type ReceiptScanDto } from "@settlemint/shared";
import { requireUser } from "../app";
import { aiUsage, user as users } from "../db/schema";
import { AppError } from "../errors";
import { normalizeReceipt, ReceiptReadError, type ReceiptReader } from "../services/receipts";

declare module "fastify" {
  interface FastifyInstance {
    receiptReader: ReceiptReader | null;
  }
}

const period = () => new Date().toISOString().slice(0, 7);

export const aiRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * Read a receipt photo into merchant, date, total and line items. The photo
   * is sent to the AI provider and never stored by SettleMint.
   */
  app.post(
    "/ai/receipt",
    {
      bodyLimit: 6 * 1024 * 1024,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: { body: scanReceiptBody },
    },
    async (req): Promise<ReceiptScanDto> => {
      const me = requireUser(req);
      const reader = app.receiptReader;
      if (!reader) throw new AppError(503, "AI_UNAVAILABLE", "Receipt scanning isn't switched on yet");
      const limit = app.config.aiScansPerMonth;

      // Count the scan up front (atomically, so rapid taps can't exceed the limit).
      await app.db
        .insert(aiUsage)
        .values({ userId: me.id, period: period(), scans: 0 })
        .onConflictDoNothing();
      const [counted] = await app.db
        .update(aiUsage)
        .set({ scans: sql`${aiUsage.scans} + 1` })
        .where(and(eq(aiUsage.userId, me.id), eq(aiUsage.period, period()), lt(aiUsage.scans, limit)))
        .returning({ scans: aiUsage.scans });
      if (!counted) {
        throw new AppError(429, "AI_QUOTA", `You've used all ${limit} receipt scans for this month`);
      }

      const refund = () =>
        app.db
          .update(aiUsage)
          .set({ scans: sql`greatest(${aiUsage.scans} - 1, 0)` })
          .where(and(eq(aiUsage.userId, me.id), eq(aiUsage.period, period())));

      try {
        const [profile] = await app.db.select({ currency: users.defaultCurrency }).from(users).where(eq(users.id, me.id));
        const raw = await reader.read({ data: req.body.image.replace(/^data:[^,]+,/, ""), mimeType: req.body.mimeType });
        // "Future" means later than today anywhere on Earth (receipts use local dates).
        const receipt = normalizeReceipt(raw, req.body.currency ?? profile?.currency ?? "USD", todayIn("Pacific/Kiritimati"));
        return { ...receipt, scansLeft: Math.max(0, limit - counted.scans) };
      } catch (err) {
        await refund();
        if (err instanceof ReceiptReadError) {
          throw new AppError(422, "AI_FAILED", `${err.message}. Try a sharper photo, or enter it by hand.`);
        }
        req.log.error({ err }, "receipt scan failed");
        throw new AppError(502, "AI_FAILED", "Couldn't read the receipt right now. Try again, or enter it by hand.");
      }
    },
  );
};
