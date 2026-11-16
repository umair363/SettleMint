import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { formatMoney, isCurrencyCode } from "@settlemint/shared";
import { sendNotification } from "web-push";
import type { Db } from "../db/client";
import { groups, members, pushSubscriptions, user } from "../db/schema";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Delivers one notification. `gone` means the browser unsubscribed: forget it. */
export interface PushSender {
  send(target: PushTarget, payload: string): Promise<{ gone: boolean }>;
}

export function webPushSender(vapid: { publicKey: string; privateKey: string; subject: string }): PushSender {
  return {
    async send(target, payload) {
      try {
        await sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          payload,
          { vapidDetails: vapid, TTL: 24 * 60 * 60, urgency: "normal" },
        );
        return { gone: false };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return { gone: true };
        throw err;
      }
    },
  };
}

/** What a request did, as recorded by recordActivity. */
export interface ActivityNotice {
  groupId: string;
  type: string;
  actorUserId: string | null;
  actorMemberId: string | null;
  data: Record<string, unknown>;
}

type PushLog = { error: (o: object, m: string) => void; info: (o: object, m: string) => void };

const NOTIFY = new Set(["expense.created", "expense.updated", "expense.deleted", "settlement.created", "member.joined"]);

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function createNotifier(db: Db, sender: PushSender, webUrl: string) {
  async function dispatch(notices: ActivityNotice[], log?: PushLog) {
    for (const n of notices.filter((x) => NOTIFY.has(x.type))) {
      const [group] = await db.select({ name: groups.name, emoji: groups.emoji }).from(groups).where(eq(groups.id, n.groupId));
      if (!group) continue;
      const people = await db
        .select({ memberId: members.id, userId: members.userId, name: members.displayName, locale: user.locale })
        .from(members)
        .leftJoin(user, eq(user.id, members.userId))
        .where(and(eq(members.groupId, n.groupId), isNull(members.leftAt), isNotNull(members.userId)));
      const actorName = people.find((p) => p.memberId === n.actorMemberId)?.name ?? "Someone";
      const d = n.data;
      const money = (locale: string | null) =>
        typeof d.amount === "number" && typeof d.currency === "string" && isCurrencyCode(d.currency)
          ? formatMoney(d.amount, d.currency, { locale: locale ?? "en" })
          : "";

      // Payments only concern the two people involved; everything else the whole group.
      let recipients = people.filter((p) => p.userId && p.userId !== n.actorUserId);
      if (n.type === "settlement.created") {
        recipients = recipients.filter((p) => p.memberId === d.fromMemberId || p.memberId === d.toMemberId);
      }
      if (!recipients.length) continue;

      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.userId, recipients.map((r) => r.userId!)));
      if (!subs.length) continue;

      let sent = 0;
      let gone = 0;
      await Promise.allSettled(
        subs.map(async (s) => {
          const r = recipients.find((x) => x.userId === s.userId)!;
          const amount = money(r.locale);
          let body: string;
          switch (n.type) {
            case "expense.created":
              body = `${actorName} added “${str(d.description)}”${amount ? ` · ${amount}` : ""}`;
              break;
            case "expense.updated":
              body = `${actorName} edited “${str((d.after as Record<string, unknown>)?.description)}”`;
              break;
            case "expense.deleted":
              body = `${actorName} deleted “${str(d.description)}”`;
              break;
            case "settlement.created":
              body =
                r.memberId === d.toMemberId
                  ? `${str(d.fromName) || "Someone"} paid you ${amount}`
                  : `${actorName} recorded that you paid ${str(d.toName) || "them"} ${amount}`;
              break;
            default:
              body = `${str(d.displayName) || actorName} joined the group`;
          }
          const payload = JSON.stringify({
            title: `${group.emoji ? `${group.emoji} ` : ""}${group.name}`,
            body,
            url: `${webUrl}/group?id=${n.groupId}`,
            tag: n.groupId,
          });
          try {
            const result = await sender.send({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
            if (result.gone) {
              gone++;
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
            } else sent++;
          } catch (err) {
            log?.error({ err }, "push failed");
          }
        }),
      );
      log?.info({ type: n.type, groupId: n.groupId, sent, gone, failed: subs.length - sent - gone }, "notifications sent");
    }
  }
  // Deliveries still in flight, so shutdown (and tests) can wait for them.
  const pending = new Set<Promise<void>>();
  return {
    dispatch(notices: ActivityNotice[], log?: PushLog) {
      const p = dispatch(notices, log).catch((err) => log?.error({ err }, "notifications failed"));
      pending.add(p);
      void p.finally(() => pending.delete(p));
      return p;
    },
    async idle() {
      while (pending.size) await Promise.allSettled([...pending]);
    },
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
