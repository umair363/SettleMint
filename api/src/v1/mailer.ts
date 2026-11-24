export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  /** Set to show the file inside the message body (cid:...). */
  contentId?: string;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Resend in production; logs to the console when no key is set. */
export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || "SettleMint <onboarding@resend.dev>";
  if (!key) {
    return {
      async send(mail) {
        console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
      },
    };
  }
  return {
    async send(mail) {
      const { Resend } = await import("resend");
      const { error } = await new Resend(key).emails.send({ from, ...mail });
      if (error) throw new Error(`Email failed: ${error.message}`);
    },
  };
}

/** Keeps sent mail in memory, for tests. */
export function createMemoryMailer(): Mailer & { sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    async send(mail) {
      sent.push(mail);
    },
  };
}

const OTP_SUBJECT: Record<string, string> = {
  "sign-in": "Your SettleMint sign-in code",
  "email-verification": "Confirm your email for SettleMint",
  "forget-password": "Reset your SettleMint password",
  "change-email": "Confirm your new email for SettleMint",
};

export function otpEmail(to: string, otp: string, type: string): Mail {
  const subject = OTP_SUBJECT[type] ?? "Your SettleMint code";
  const text = `Your code is ${otp}. It expires in 10 minutes. If you didn't ask for it, you can ignore this email.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px">
<p style="font-size:16px;color:#111">Your SettleMint code is</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111">${escapeHtml(otp)}</p>
<p style="font-size:14px;color:#555">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  return { to, subject, text, html };
}
