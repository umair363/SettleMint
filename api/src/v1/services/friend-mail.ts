import type { Mail } from "../mailer";
import { escapeHtml } from "../mailer";
import { noticeLanguage, type NoticeLanguage } from "./notification-text";
import { reminderCopy, reminderDir } from "./reminder-copy";

/** Friend requests and invitations, in the recipient's language. Unlike reminders, these do name who is asking. */
interface FriendCopy {
  push(name: string): string;
  reqSubject(name: string): string;
  reqIntro(name: string): string;
  reqButton: string;
  invSubject(name: string): string;
  invIntro(name: string): string;
  invButton: string;
  why(name: string): string;
}

const COPY: Record<NoticeLanguage, FriendCopy> = {
  en: {
    push: (n) => `${n} wants to add you as a friend.`,
    reqSubject: (n) => `${n} wants to add you on SettleMint`,
    reqIntro: (n) => `${n} would like to split costs with you on SettleMint.`,
    reqButton: "See the request",
    invSubject: (n) => `${n} invited you to SettleMint`,
    invIntro: (n) => `${n} invited you to split costs on SettleMint. It's free, and you don't need an account to start.`,
    invButton: "Open the invitation",
    why: (n) => `You're getting this because ${n} typed your email address.`,
  },
  es: {
    push: (n) => `${n} quiere añadirte como amigo.`,
    reqSubject: (n) => `${n} quiere añadirte en SettleMint`,
    reqIntro: (n) => `${n} quiere repartir gastos contigo en SettleMint.`,
    reqButton: "Ver la solicitud",
    invSubject: (n) => `${n} te ha invitado a SettleMint`,
    invIntro: (n) => `${n} te invita a repartir gastos en SettleMint. Es gratis y no necesitas una cuenta para empezar.`,
    invButton: "Abrir la invitación",
    why: (n) => `Recibes esto porque ${n} escribió tu correo electrónico.`,
  },
  pt: {
    push: (n) => `${n} quer adicionar você como amigo.`,
    reqSubject: (n) => `${n} quer adicionar você no SettleMint`,
    reqIntro: (n) => `${n} gostaria de dividir despesas com você no SettleMint.`,
    reqButton: "Ver o pedido",
    invSubject: (n) => `${n} convidou você para o SettleMint`,
    invIntro: (n) => `${n} convidou você para dividir despesas no SettleMint. É grátis e você não precisa de conta para começar.`,
    invButton: "Abrir o convite",
    why: (n) => `Você recebe isto porque ${n} digitou o seu e-mail.`,
  },
  fr: {
    push: (n) => `${n} souhaite vous ajouter comme ami.`,
    reqSubject: (n) => `${n} souhaite vous ajouter sur SettleMint`,
    reqIntro: (n) => `${n} aimerait partager des dépenses avec vous sur SettleMint.`,
    reqButton: "Voir la demande",
    invSubject: (n) => `${n} vous invite sur SettleMint`,
    invIntro: (n) => `${n} vous invite à partager des dépenses sur SettleMint. C’est gratuit et vous n’avez pas besoin de compte pour commencer.`,
    invButton: "Ouvrir l’invitation",
    why: (n) => `Vous recevez ceci car ${n} a saisi votre adresse e-mail.`,
  },
  de: {
    push: (n) => `${n} möchte dich als Freund hinzufügen.`,
    reqSubject: (n) => `${n} möchte dich bei SettleMint hinzufügen`,
    reqIntro: (n) => `${n} möchte mit dir bei SettleMint Kosten teilen.`,
    reqButton: "Anfrage ansehen",
    invSubject: (n) => `${n} hat dich zu SettleMint eingeladen`,
    invIntro: (n) => `${n} hat dich eingeladen, bei SettleMint Kosten zu teilen. Es ist kostenlos, und du brauchst zum Start kein Konto.`,
    invButton: "Einladung öffnen",
    why: (n) => `Du erhältst das, weil ${n} deine E-Mail-Adresse eingegeben hat.`,
  },
  hi: {
    push: (n) => `${n} आपको दोस्त बनाना चाहते हैं।`,
    reqSubject: (n) => `${n} आपको SettleMint पर जोड़ना चाहते हैं`,
    reqIntro: (n) => `${n} SettleMint पर आपके साथ खर्च बाँटना चाहते हैं।`,
    reqButton: "अनुरोध देखें",
    invSubject: (n) => `${n} ने आपको SettleMint पर बुलाया है`,
    invIntro: (n) => `${n} ने आपको SettleMint पर खर्च बाँटने के लिए बुलाया है। यह मुफ़्त है और शुरू करने के लिए खाते की ज़रूरत नहीं।`,
    invButton: "निमंत्रण खोलें",
    why: (n) => `आपको यह इसलिए मिला क्योंकि ${n} ने आपका ईमेल पता डाला।`,
  },
  ur: {
    push: (n) => `${n} آپ کو دوست بنانا چاہتے ہیں۔`,
    reqSubject: (n) => `${n} آپ کو SettleMint پر شامل کرنا چاہتے ہیں`,
    reqIntro: (n) => `${n} SettleMint پر آپ کے ساتھ اخراجات بانٹنا چاہتے ہیں۔`,
    reqButton: "درخواست دیکھیں",
    invSubject: (n) => `${n} نے آپ کو SettleMint پر مدعو کیا ہے`,
    invIntro: (n) => `${n} نے آپ کو SettleMint پر اخراجات بانٹنے کے لیے مدعو کیا ہے۔ یہ مفت ہے اور شروع کرنے کے لیے اکاؤنٹ کی ضرورت نہیں۔`,
    invButton: "دعوت کھولیں",
    why: (n) => `آپ کو یہ اس لیے ملا کہ ${n} نے آپ کا ای میل ایڈریس درج کیا۔`,
  },
  ar: {
    push: (n) => `يريد ${n} إضافتك كصديق.`,
    reqSubject: (n) => `يريد ${n} إضافتك على SettleMint`,
    reqIntro: (n) => `يرغب ${n} في تقاسم المصاريف معك على SettleMint.`,
    reqButton: "عرض الطلب",
    invSubject: (n) => `دعاك ${n} إلى SettleMint`,
    invIntro: (n) => `دعاك ${n} لتقاسم المصاريف على SettleMint. الخدمة مجانية ولا تحتاج إلى حساب للبدء.`,
    invButton: "افتح الدعوة",
    why: (n) => `وصلتك هذه الرسالة لأن ${n} كتب بريدك الإلكتروني.`,
  },
};

export const friendCopy = (locale: string | null | undefined) => COPY[noticeLanguage(locale)];

/** A name that is safe in a subject line and a notification: one line, trimmed. */
export const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim().slice(0, 60);

export interface FriendMailInput {
  to: string;
  locale: string | null;
  /** The person asking. */
  fromName: string;
  /** A request to an existing account, or an invitation to someone new. */
  kind: "request" | "invite";
  /** Where the button goes: the app's friends screen, or the invitation link. */
  url: string;
  stopUrl: string;
}

export function friendMail(input: FriendMailInput): Mail {
  const c = friendCopy(input.locale);
  const stop = reminderCopy(input.locale).stop;
  const dir = reminderDir(input.locale);
  const lang = (input.locale ?? "en").split(/[-_]/)[0] || "en";
  const name = oneLine(input.fromName);
  const subject = input.kind === "request" ? c.reqSubject(name) : c.invSubject(name);
  const intro = input.kind === "request" ? c.reqIntro(name) : c.invIntro(name);
  const button = input.kind === "request" ? c.reqButton : c.invButton;
  const e = escapeHtml;
  const text = [intro, "", `${button}: ${input.url}`, "", c.why(name), `${stop}: ${input.stopUrl}`].join("\n");
  const html = `<!doctype html><html lang="${e(lang)}" dir="${dir}"><body style="margin:0;background:#f7faf8">
<div dir="${dir}" style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:460px;margin:0 auto;padding:32px 20px;color:#131c18">
<p style="margin:0 0 28px;font-size:18px;line-height:1.5">${e(intro)}</p>
<p style="margin:0"><a href="${e(input.url)}" style="display:inline-block;background:#4fdaa3;color:#002a1a;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:999px">${e(button)}</a></p>
<p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#67706c">${e(c.why(name))}<br><a href="${e(input.stopUrl)}" style="color:#67706c">${e(stop)}</a></p>
</div></body></html>`;
  return { to: input.to, subject, text, html, headers: { "List-Unsubscribe": `<${input.stopUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}
