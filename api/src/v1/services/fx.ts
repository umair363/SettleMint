import { and, desc, eq, lte } from "drizzle-orm";
import { parseRate } from "@settlemint/shared";
import type { DbOrTx } from "../db/client";
import { fxRates } from "../db/schema";
import { AppError } from "../errors";

/** Invert a decimal rate string to 12 decimal places. */
function invertRate(rate: string): string {
  const { num, den } = parseRate(rate);
  const scale = 10n ** 12n;
  const q = (den * scale * 2n + num) / (num * 2n); // rounded
  const whole = q / scale;
  const frac = (q % scale).toString().padStart(12, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/**
 * The rate to convert `from` into `to` for a given date: the value the
 * client sent, otherwise the latest stored rate on or before that date.
 */
export async function resolveRate(
  db: DbOrTx,
  from: string,
  to: string,
  onDate: string,
  provided?: string,
): Promise<string> {
  if (from === to) return "1";
  if (provided) return provided;

  const lookup = async (base: string, quote: string) =>
    (
      await db
        .select({ rate: fxRates.rate })
        .from(fxRates)
        .where(and(eq(fxRates.base, base), eq(fxRates.quote, quote), lte(fxRates.asOf, onDate)))
        .orderBy(desc(fxRates.asOf))
        .limit(1)
    )[0]?.rate;

  const direct = await lookup(from, to);
  if (direct) return direct;
  const inverse = await lookup(to, from);
  if (inverse) return invertRate(inverse);

  throw new AppError(422, "FX_RATE_REQUIRED", `No exchange rate from ${from} to ${to} yet; enter one`, { from, to });
}
