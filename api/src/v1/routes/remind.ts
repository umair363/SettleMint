import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { formatMoney, remindBody, type PaymentHandleDto, type ReminderResultDto } from "@settlemint/shared";
import { requireUser } from "../app";
import { members, paymentHandles, reminderMutes, reminders, user } from "../db/schema";
import { AppError, notFound } from "../errors";
import type { Mailer } from "../mailer";
import { requireMembership } from "../services/access";
import { groupLedger } from "../services/ledger";
import { reminderCopy } from "../services/reminder-copy";
import { mutePage, muteUrl, reminderEmail, REMINDER_COOLDOWN_MS, validMuteToken } from "../services/reminders";

declare module "fastify" {
  interface FastifyInstance {
    mailer: Mailer;
  }
}

const groupParams = z.object({ id: z.uuid() });

/**
 * "Remind" sends a notification and an email to someone who owes me. The text
 * only says a payment is waiting; it never says who is asking. Nothing is
 * sent (and no allowance is used) when the person can't be reached.
 */
export const remindRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/groups/:id/remind",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } }, schema: { params: groupParams, body: remindBody } },
    async (req): Promise<ReminderResultDto> => {
      const me = requireUser(req);
      const { group, me: mine } = await requireMembership(app.db, req.params.id, me.id);
      const { debtorMemberId, includePayment } = req.body;
      if (debtorMemberId === mine.id) throw new AppError(400, "VALIDATION_ERROR", "You can't remind yourself");

      const [debtor] = await app.db
        .select()
        .from(members)
        .where(and(eq(members.id, debtorMemberId), eq(members.groupId, group.id), isNull(members.leftAt)));
      if (!debtor) throw notFound("Member not found");

      // Only for a debt that really exists, worked out here and not taken from the client.
      const ledger = await groupLedger(app.db, group.id, group.simplifyDebts);
      const transfer = ledger.transfers.find((t) => t.fromMemberId === debtor.id && t.toMemberId === mine.id);
      if (!transfer) throw new AppError(409, "CONFLICT", "Nothing is owed between you two right now");

      const [last] = await app.db
        .select({ createdAt: reminders.createdAt })
        .from(reminders)
        .where(
          and(
            eq(reminders.groupId, group.id),
            eq(reminders.fromMemberId, mine.id),
            eq(reminders.toMemberId, debtor.id),
            gt(reminders.createdAt, new Date(Date.now() - REMINDER_COOLDOWN_MS)),
          ),
        )
        .orderBy(desc(reminders.createdAt))
        .limit(1);
      if (last) {
        const nextAllowedAt = new Date(last.createdAt.getTime() + REMINDER_COOLDOWN_MS).toISOString();
        throw new AppError(429, "RATE_LIMITED", "They were reminded recently. Try again tomorrow.", { nextAllowedAt });
      }

      const [debtorUser] = debtor.userId ? await app.db.select().from(user).where(eq(user.id, debtor.userId)) : [];
      const [senderUser] = await app.db.select({ locale: user.locale }).from(user).where(eq(user.id, me.id));
      const locale = debtorUser?.locale ?? senderUser?.locale ?? null;
      const copy = reminderCopy(locale);
      const amount = formatMoney(transfer.amount, group.currency, { locale: locale ?? "en" });
      const groupUrl = `${app.config.webUrl}/group?id=${group.id}`;

      // Notification: everything the person has subscribed on.
      const push = debtor.userId
        ? ((await app.notifier?.pushTo(
            debtor.userId,
            { title: `${group.emoji ? `${group.emoji} ` : ""}${group.name}`, body: copy.push(amount), url: groupUrl, tag: group.id },
            req.log,
          )) ?? 0)
        : 0;

      // Email: their account's address, or the one a group member added for them.
      const to = debtorUser ? (debtorUser.isAnonymous ? null : debtorUser.email) : debtor.contactEmail;
      let email = false;
      if (to) {
        const [muted] = await app.db.select().from(reminderMutes).where(eq(reminderMutes.email, to.toLowerCase())).limit(1);
        if (!muted) {
          let payment: { payeeName: string; handles: PaymentHandleDto[] } | undefined;
          if (includePayment) {
            const rows = await app.db.select().from(paymentHandles).where(eq(paymentHandles.userId, me.id)).orderBy(asc(paymentHandles.position));
            if (rows.length) {
              payment = {
                payeeName: mine.displayName,
                handles: rows.map((h) => ({ id: h.id, kind: h.kind, value: h.value, label: h.label })),
              };
            }
          }
          try {
            await app.mailer.send(
              reminderEmail({
                to,
                locale,
                groupName: group.name,
                amount: transfer.amount,
                currency: group.currency,
                appUrl: groupUrl,
                stopUrl: muteUrl(app.config.apiUrl, app.config.authSecret, to, locale),
                payment,
              }),
            );
            email = true;
          } catch (err) {
            req.log.error({ err }, "reminder email failed");
          }
        }
      }

      if (push === 0 && !email) return { reachable: false, push: 0, email: false, nextAllowedAt: null };
      await app.db.insert(reminders).values({ id: uuidv7(), groupId: group.id, fromMemberId: mine.id, toMemberId: debtor.id });
      return { reachable: true, push, email, nextAllowedAt: new Date(Date.now() + REMINDER_COOLDOWN_MS).toISOString() };
    },
  );
};

const muteQuery = z.object({
  e: z.email().max(254),
  t: z.string().length(40),
  l: z.string().max(35).optional(),
  undo: z.literal("1").optional(),
});

/**
 * The "stop these emails" pages. They sit outside /v1 and need no sign-in:
 * the signed link in each email is the proof. The page asks first (mail
 * scanners open links, and must not switch anything off by themselves); the
 * button, or a mail app's one-click unsubscribe, does it.
 */
export const reminderMuteRoutes: FastifyPluginAsyncZod = async (app) => {
  // One-click unsubscribe from a mail app posts a tiny form body we don't need.
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_req, _body, done) => done(null, {}));

  const cfg = { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };
  const page = (q: z.infer<typeof muteQuery>, state: "ask" | "done") => {
    const base = new URLSearchParams({ e: q.e, t: q.t, ...(q.l ? { l: q.l } : {}) }).toString();
    const action = `${app.config.apiUrl.replace(/\/$/, "")}/reminders/mute?${base}`;
    return mutePage({ locale: q.l ?? null, state, action, undoAction: `${action}&undo=1`, webUrl: app.config.webUrl });
  };
  const send = (reply: import("fastify").FastifyReply, html: string) =>
    reply.header("content-type", "text/html; charset=utf-8").header("cache-control", "no-store").header("referrer-policy", "no-referrer").send(html);

  app.get("/reminders/mute", { ...cfg, schema: { querystring: muteQuery } }, async (req, reply) => {
    if (!validMuteToken(app.config.authSecret, req.query.e, req.query.t)) throw new AppError(403, "FORBIDDEN", "This link isn't valid");
    return send(reply, page(req.query, "ask"));
  });

  app.post("/reminders/mute", { ...cfg, schema: { querystring: muteQuery } }, async (req, reply) => {
    if (!validMuteToken(app.config.authSecret, req.query.e, req.query.t)) throw new AppError(403, "FORBIDDEN", "This link isn't valid");
    const email = req.query.e.toLowerCase();
    if (req.query.undo) {
      await app.db.delete(reminderMutes).where(eq(reminderMutes.email, email));
      return send(reply, page(req.query, "ask"));
    }
    await app.db.insert(reminderMutes).values({ email }).onConflictDoNothing();
    return send(reply, page(req.query, "done"));
  });
};
