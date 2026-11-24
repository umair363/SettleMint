import { createHmac, timingSafeEqual } from "node:crypto";
import { buildPayAction, formatMoney, type PaymentHandleDto } from "@settlemint/shared";
import type { Mail, MailAttachment } from "../mailer";
import { escapeHtml } from "../mailer";
import { qrPng } from "./qr-png";
import { reminderCopy, reminderDir } from "./reminder-copy";

/** A reminder can go to the same person about the same debt once a day. */
export const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── The "stop these emails" link ──────────────────────────────────────────

/** Proof that whoever holds the link got the email: a signature over the address. */
export function muteToken(secret: string, email: string): string {
  return createHmac("sha256", secret).update(`mute-reminders:${email.toLowerCase()}`).digest("hex").slice(0, 40);
}

export function validMuteToken(secret: string, email: string, token: string): boolean {
  const want = Buffer.from(muteToken(secret, email));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function muteUrl(apiUrl: string, secret: string, email: string, locale: string | null): string {
  const q = new URLSearchParams({ e: email.toLowerCase(), t: muteToken(secret, email), l: locale ?? "en" });
  return `${apiUrl.replace(/\/$/, "")}/reminders/mute?${q.toString()}`;
}

// ─── The email ─────────────────────────────────────────────────────────────

export interface ReminderEmailInput {
  to: string;
  locale: string | null;
  groupName: string;
  amount: number;
  currency: string;
  /** Opens the group in the app. */
  appUrl: string;
  stopUrl: string;
  /** Present only when the sender chose to include their payment details. */
  payment?: { payeeName: string; handles: PaymentHandleDto[] };
}

/** At most this many saved QR codes are put in one email. */
const MAX_QR = 2;

export function reminderEmail(input: ReminderEmailInput): Mail {
  const copy = reminderCopy(input.locale);
  const dir = reminderDir(input.locale);
  const lang = (input.locale ?? "en").split(/[-_]/)[0] || "en";
  const amount = formatMoney(input.amount, input.currency, { locale: input.locale ?? "en" });
  const e = escapeHtml;

  const lines: { label: string; text: string; url?: string }[] = [];
  const attachments: MailAttachment[] = [];
  const qrBlocks: { cid: string; label: string }[] = [];
  if (input.payment) {
    for (const h of input.payment.handles) {
      const action = buildPayAction(h, { amount: input.amount, currency: input.currency, note: input.groupName, payeeName: input.payment.payeeName });
      if (action.qr !== undefined) {
        if (qrBlocks.length < MAX_QR) {
          const cid = `qr${qrBlocks.length + 1}`;
          attachments.push({ filename: `${cid}.png`, content: qrPng(action.qr), contentType: "image/png", contentId: cid });
          qrBlocks.push({ cid, label: action.label });
        }
        continue;
      }
      // upi:// opens nothing in a mail app, so it is shown as text like the copy-only methods.
      const url = action.url && !action.url.startsWith("upi:") ? action.url : undefined;
      lines.push({ label: action.label, text: url ?? action.copy ?? h.value, url });
    }
  }
  const hasPayment = lines.length > 0 || qrBlocks.length > 0;

  const text = [
    copy.intro(input.groupName),
    amount,
    ...(hasPayment
      ? [
          "",
          `${copy.payTitle} · ${copy.payTo(input.payment!.payeeName)}`,
          ...lines.map((l) => `${l.label}: ${l.text}`),
          ...qrBlocks.map((q) => `${q.label}: ${copy.qrHint}`),
        ]
      : []),
    "",
    `${copy.button}: ${input.appUrl}`,
    "",
    copy.why(input.groupName),
    `${copy.stop}: ${input.stopUrl}`,
  ].join("\n");

  const detailsHtml = hasPayment
    ? `<div style="margin:24px 0 0;padding:20px;border:1px solid #e3e9e6;border-radius:16px">
<p style="margin:0 0 4px;font-size:13px;color:#67706c">${e(copy.payTitle)}</p>
<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#131c18">${e(copy.payTo(input.payment!.payeeName))}</p>
${lines
  .map(
    (l) =>
      `<p style="margin:6px 0;font-size:15px;color:#131c18"><span style="color:#67706c">${e(l.label)}</span> · ${
        l.url ? `<a href="${e(l.url)}" style="color:#007655">${e(l.url)}</a>` : `<span style="word-break:break-all">${e(l.text)}</span>`
      }</p>`,
  )
  .join("\n")}
${qrBlocks
  .map(
    (q) => `<div style="margin:16px 0 0;text-align:center">
<img src="cid:${q.cid}" width="220" height="220" alt="${e(q.label)}" style="display:block;margin:0 auto;border-radius:12px;image-rendering:pixelated">
<p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#131c18">${e(q.label)}</p>
<p style="margin:2px 0 0;font-size:13px;color:#67706c">${e(copy.qrHint)}</p>
</div>`,
  )
  .join("\n")}
</div>`
    : "";

  const html = `<!doctype html><html lang="${e(lang)}" dir="${dir}"><body style="margin:0;background:#f7faf8">
<div dir="${dir}" style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:460px;margin:0 auto;padding:32px 20px;color:#131c18">
<p style="margin:0 0 20px;font-size:17px;line-height:1.5">${e(copy.intro(input.groupName))}</p>
<p style="margin:0;font-size:40px;font-weight:700;letter-spacing:-0.02em">${e(amount)}</p>
${detailsHtml}
<p style="margin:28px 0 0"><a href="${e(input.appUrl)}" style="display:inline-block;background:#4fdaa3;color:#002a1a;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:999px">${e(copy.button)}</a></p>
<p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#67706c">${e(copy.why(input.groupName))}<br><a href="${e(input.stopUrl)}" style="color:#67706c">${e(copy.stop)}</a></p>
</div></body></html>`;

  return {
    to: input.to,
    subject: copy.subject(input.groupName),
    text,
    html,
    attachments: attachments.length ? attachments : undefined,
    // Lets mail apps offer their own "unsubscribe" button.
    headers: { "List-Unsubscribe": `<${input.stopUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/** The page behind the "stop" link. */
export function mutePage(opts: { locale: string | null; state: "ask" | "done"; action: string; undoAction: string; webUrl: string }): string {
  const c = reminderCopy(opts.locale).stopPage;
  const e = escapeHtml;
  const dir = reminderDir(opts.locale);
  const lang = (opts.locale ?? "en").split(/[-_]/)[0] || "en";
  const button = (label: string, action: string, primary: boolean) =>
    `<form method="post" action="${e(action)}" style="margin:24px 0 0"><button style="font:inherit;font-weight:600;padding:14px 24px;border-radius:999px;border:${
      primary ? "0;background:#4fdaa3;color:#002a1a" : "1px solid #c9d3cf;background:#fff;color:#131c18"
    };cursor:pointer">${e(label)}</button></form>`;
  return `<!doctype html><html lang="${e(lang)}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SettleMint</title></head>
<body style="margin:0;background:#f7faf8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#131c18">
<main style="max-width:420px;margin:0 auto;padding:64px 24px">
<p style="font-weight:700;letter-spacing:-0.01em;margin:0 0 32px">SettleMint</p>
<h1 style="font-size:22px;line-height:1.3;margin:0">${e(opts.state === "ask" ? c.ask : c.done)}</h1>
${opts.state === "ask" ? button(c.confirm, opts.action, true) : button(c.undo, opts.undoAction, false)}
<p style="margin:32px 0 0"><a href="${e(opts.webUrl)}" style="color:#007655">${e(c.back)}</a></p>
</main></body></html>`;
}
