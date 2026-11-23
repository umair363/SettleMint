import type { ActivityDto } from "@settlemint/shared";
import type { useTranslations } from "use-intl";

export interface ActivityLine {
  text: string;
  /** Money to show next to the sentence, if any. */
  amount?: { minor: number; currency: string };
  kind: "expense" | "payment" | "member" | "group";
  deleted?: boolean;
  /** The same sentence split so names and items can be shown bold. */
  parts: { text: string; strong: boolean }[];
}

export type ActivityT = ReturnType<typeof useTranslations<"activity">>;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * One readable sentence per event, in the viewer's language. "You" forms are
 * separate messages (selected by `who`) because many languages conjugate them
 * differently from "Ana added…".
 */
export function describeActivity(e: ActivityDto, myUserId: string | undefined, t: ActivityT): ActivityLine {
  const plain = describe(e, myUserId, t, (v) => v);
  // Names and items are wrapped in invisible markers, so any language's sentence can be split around them.
  const marked = describe(e, myUserId, t, (v) => `${OPEN}${v}${CLOSE}`);
  const parts: ActivityLine["parts"] = [];
  marked.text.split(OPEN).forEach((chunk, i) => {
    const [strong, rest] = i === 0 ? ["", chunk] : chunk.split(CLOSE);
    if (strong) parts.push({ text: strong, strong: true });
    if (rest) parts.push({ text: rest, strong: false });
  });
  return { ...plain, parts };
}

const OPEN = "\u2062";
const CLOSE = "\u2063";

function describe(
  e: ActivityDto,
  myUserId: string | undefined,
  t: ActivityT,
  mark: (v: string) => string,
): Omit<ActivityLine, "parts"> {
  const d = e.data;
  const me = Boolean(e.actorUserId && e.actorUserId === myUserId);
  const who = { who: me ? "me" : "other", name: mark(e.actorName ?? t("someone")) };
  const money =
    typeof d.amount === "number" && typeof d.currency === "string" ? { minor: d.amount, currency: d.currency } : undefined;
  const after = (d.after ?? {}) as Record<string, unknown>;
  const item = mark(str(d.description));

  switch (e.type) {
    case "expense.created":
      if (d.recurring) return { kind: "expense", text: t("recurringAdded", { item }), amount: money };
      return { kind: "expense", text: t("expenseAdded", { ...who, item }), amount: money };
    case "recurring.created":
      return { kind: "expense", text: t("recurringSet", { ...who, item, frequency: str(d.frequency) }), amount: money };
    case "recurring.stopped":
      return { kind: "expense", text: t("recurringStopped", { ...who, item }) };
    case "expense.updated":
      return {
        kind: "expense",
        text: t("expenseEdited", { ...who, item: mark(str(after.description)) }),
        amount:
          typeof after.amount === "number" && typeof after.currency === "string"
            ? { minor: after.amount, currency: after.currency }
            : undefined,
      };
    case "expense.deleted":
      return { kind: "expense", text: t("expenseDeleted", { ...who, item }), amount: money, deleted: true };
    case "expense.restored":
      return { kind: "expense", text: t("expenseRestored", { ...who, item }), amount: money };
    case "settlement.created": {
      const fromMe = e.viewerMemberId !== null && d.fromMemberId === e.viewerMemberId;
      const toMe = e.viewerMemberId !== null && d.toMemberId === e.viewerMemberId;
      const dir = fromMe ? "out" : toMe ? "in" : "other";
      return {
        kind: "payment",
        text: t("paid", { dir, from: mark(str(d.fromName) || t("someone")), to: mark(str(d.toName) || t("someone")) }),
        amount: money,
      };
    }
    case "settlement.updated":
      return { kind: "payment", text: t("paymentEdited", who) };
    case "settlement.deleted":
      return { kind: "payment", text: t("paymentDeleted", who), amount: money, deleted: true };
    case "settlement.restored":
      return { kind: "payment", text: t("paymentRestored", who), amount: money };
    case "member.added":
      return { kind: "member", text: t("memberAdded", { ...who, member: mark(str(d.displayName)) }) };
    case "member.joined":
      return { kind: "member", text: t("memberJoined", { name: str(d.displayName) ? mark(str(d.displayName)) : who.name }) };
    case "member.renamed":
      return { kind: "member", text: t("memberRenamed", { ...who, from: mark(str(d.from)), to: mark(str(d.to)) }) };
    case "member.left":
      return { kind: "member", text: t("memberLeft", { name: str(d.displayName) ? mark(str(d.displayName)) : who.name }) };
    case "member.removed":
      return { kind: "member", text: t("memberRemoved", { ...who, member: mark(str(d.displayName)) }) };
    case "group.created":
      return { kind: "group", text: t("groupCreated", who) };
    case "group.imported":
      return { kind: "group", text: t("groupImported", who) };
    case "group.deleted":
      return { kind: "group", text: t("groupDeleted", who) };
    case "group.restored":
      return { kind: "group", text: t("groupRestored", who) };
    default:
      return { kind: "group", text: t("groupUpdated", who) };
  }
}
