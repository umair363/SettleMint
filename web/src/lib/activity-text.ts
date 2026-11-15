import type { ActivityDto } from "@settlemint/shared";

export interface ActivityLine {
  text: string;
  /** Money to show next to the sentence, if any. */
  amount?: { minor: number; currency: string };
  kind: "expense" | "payment" | "member" | "group";
  deleted?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const quote = (s: string) => (s ? `“${s}”` : "an expense");

/** One readable sentence per event. "You" when the viewer did it. */
export function describeActivity(e: ActivityDto, myUserId: string | undefined): ActivityLine {
  const d = e.data;
  const actor = e.actorUserId && e.actorUserId === myUserId ? "You" : e.actorName ?? "Someone";
  const money =
    typeof d.amount === "number" && typeof d.currency === "string" ? { minor: d.amount, currency: d.currency } : undefined;
  const after = (d.after ?? {}) as Record<string, unknown>;

  switch (e.type) {
    case "expense.created":
      if (d.recurring) return { kind: "expense", text: `Repeating bill added ${quote(str(d.description))}`, amount: money };
      return { kind: "expense", text: `${actor} added ${quote(str(d.description))}`, amount: money };
    case "recurring.created":
      return { kind: "expense", text: `${actor} set ${quote(str(d.description))} to repeat ${str(d.frequency)}`, amount: money };
    case "recurring.stopped":
      return { kind: "expense", text: `${actor} stopped repeating ${quote(str(d.description))}` };
    case "expense.updated":
      return {
        kind: "expense",
        text: `${actor} edited ${quote(str(after.description))}`,
        amount:
          typeof after.amount === "number" && typeof after.currency === "string"
            ? { minor: after.amount, currency: after.currency }
            : undefined,
      };
    case "expense.deleted":
      return { kind: "expense", text: `${actor} deleted ${quote(str(d.description))}`, amount: money, deleted: true };
    case "expense.restored":
      return { kind: "expense", text: `${actor} restored ${quote(str(d.description))}`, amount: money };
    case "settlement.created": {
      const fromMe = e.viewerMemberId !== null && d.fromMemberId === e.viewerMemberId;
      const toMe = e.viewerMemberId !== null && d.toMemberId === e.viewerMemberId;
      const from = fromMe ? "You" : str(d.fromName) || "Someone";
      const to = toMe ? "you" : str(d.toName) || "someone";
      return { kind: "payment", text: `${from} paid ${to}`, amount: money };
    }
    case "settlement.updated":
      return { kind: "payment", text: `${actor} edited a payment` };
    case "settlement.deleted":
      return { kind: "payment", text: `${actor} deleted a payment`, amount: money, deleted: true };
    case "settlement.restored":
      return { kind: "payment", text: `${actor} restored a payment`, amount: money };
    case "member.added":
      return { kind: "member", text: `${actor} added ${str(d.displayName)}` };
    case "member.joined":
      return { kind: "member", text: `${str(d.displayName) || actor} joined` };
    case "member.renamed":
      return { kind: "member", text: `${actor} renamed ${str(d.from)} to ${str(d.to)}` };
    case "member.left":
      return { kind: "member", text: `${str(d.displayName) || actor} left the group` };
    case "member.removed":
      return { kind: "member", text: `${actor} removed ${str(d.displayName)}` };
    case "group.created":
      return { kind: "group", text: `${actor} created the group` };
    case "group.deleted":
      return { kind: "group", text: `${actor} deleted the group` };
    case "group.restored":
      return { kind: "group", text: `${actor} restored the group` };
    default:
      return { kind: "group", text: `${actor} updated the group` };
  }
}
