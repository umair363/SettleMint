import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { formatMoney, isCurrencyCode } from "@settlemint/shared";
import { sendNotification } from "web-push";
import type { Db } from "../db/client";
import { groups, members, pushSubscriptions, user } from "../db/schema";
import { noticeText } from "./notification-text";

export type PushTarget =
  | { kind: "web"; endpoint: string; p256dh: string; auth: string }
  /** A phone: endpoint is its Expo push token. */
  | { kind: "expo"; endpoint: string };

/** Delivers one notification. `gone` means the browser unsubscribed: forget it. */
export interface PushSender {
  send(target: PushTarget, payload: string): Promise<{ gone: boolean; detail?: string }>;
}

export function webPushSender(vapid: { publicKey: string; privateKey: string; subject: string }): PushSender {
  return {
    async send(target, payload) {
      if (target.kind !== "web") throw new Error("not a web push target");
      try {
        await sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          payload,
          { vapidDetails: vapid, TTL: 24 * 60 * 60, urgency: "normal" },
        );
        return { gone: false };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          const body = String((err as { body?: unknown }).body ?? "").slice(0, 200);
          return { gone: true, detail: `${status} from ${new URL(target.endpoint).host}${body ? `: ${body}` : ""}` };
        }
        throw err;
      }
    },
  };
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Phones, through Expo's push service (free; it hands notifications to Apple
 * and Google). An access token is only needed if "enhanced security" is
 * switched on for the Expo project.
 */
export function expoPushSender(opts: { accessToken?: string; fetch?: typeof fetch } = {}): PushSender {
  const doFetch = opts.fetch ?? fetch;
  return {
    async send(target, payload) {
      const p = JSON.parse(payload) as { title: string; body: string; url: string; tag: string };
      const res = await doFetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
        },
        body: JSON.stringify({
          to: target.endpoint,
          title: p.title,
          body: p.body,
          sound: "default",
          channelId: "activity",
          // The app opens the group when the notification is tapped.
          data: { groupId: p.tag },
        }),
      });
      if (!res.ok) throw new Error(`Expo push service answered ${res.status}`);
      const json = (await res.json()) as { data?: { status: string; message?: string; details?: { error?: string } } };
      const ticket = json.data;
      if (ticket?.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") return { gone: true, detail: "DeviceNotRegistered from Expo" };
        throw new Error(`Expo push failed: ${ticket.details?.error ?? ticket.message ?? "unknown"}`);
      }
      return { gone: false };
    },
  };
}

/** Routes each device to its service; browsers only when Web Push keys are set. */
export function combinedSender(web: PushSender | null, expo: PushSender): PushSender {
  return {
    send(target, payload) {
      if (target.kind === "expo") return expo.send(target, payload);
      if (!web) return Promise.resolve({ gone: false });
      return web.send(target, payload);
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
      const actorName = people.find((p) => p.memberId === n.actorMemberId)?.name;
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
          // In the recipient's language and number format.
          const amount = money(r.locale);
          const say = noticeText(r.locale);
          const actor = actorName ?? say.someone;
          let body: string;
          switch (n.type) {
            case "expense.created":
              body = say.added(actor, str(d.description), amount);
              break;
            case "expense.updated":
              body = say.edited(actor, str((d.after as Record<string, unknown>)?.description));
              break;
            case "expense.deleted":
              body = say.deleted(actor, str(d.description));
              break;
            case "settlement.created":
              body =
                r.memberId === d.toMemberId
                  ? say.paidYou(str(d.fromName) || say.someone, amount)
                  : say.recordedYouPaid(actor, str(d.toName) || say.them, amount);
              break;
            default:
              body = say.joined(str(d.displayName) || actor);
          }
          const payload = JSON.stringify({
            title: `${group.emoji ? `${group.emoji} ` : ""}${group.name}`,
            body,
            url: `${webUrl}/group?id=${n.groupId}`,
            tag: n.groupId,
          });
          try {
            const target: PushTarget =
              s.kind === "expo"
                ? { kind: "expo", endpoint: s.endpoint }
                : { kind: "web", endpoint: s.endpoint, p256dh: s.p256dh ?? "", auth: s.auth ?? "" };
            const result = await sender.send(target, payload);
            if (result.gone) {
              gone++;
              log?.info({ detail: result.detail }, "push subscription gone");
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
