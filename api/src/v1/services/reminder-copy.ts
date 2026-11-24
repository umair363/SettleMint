import { noticeLanguage, type NoticeLanguage } from "./notification-text";

/**
 * Payment reminders, in the recipient's language. The wording is deliberately
 * general: a payment is waiting to be settled. It never says who is asking.
 */
export interface ReminderCopy {
  /** The notification text. */
  push(amount: string): string;
  subject(group: string): string;
  /** The line above the amount in the email. */
  intro(group: string): string;
  payTitle: string;
  /** Names who the details belong to; only shown when the sender chose to include them. */
  payTo(name: string): string;
  qrHint: string;
  button: string;
  why(group: string): string;
  stop: string;
  /** The page behind the "stop" link. */
  stopPage: { ask: string; confirm: string; done: string; undo: string; back: string };
}

const COPY: Record<NoticeLanguage, ReminderCopy> = {
  en: {
    push: (a) => `A payment of ${a} is waiting to be settled.`,
    subject: (g) => `Payment reminder · ${g}`,
    intro: (g) => `A payment is waiting to be settled in “${g}”.`,
    payTitle: "How to pay",
    payTo: (n) => `Pay ${n}`,
    qrHint: "Scan this with your banking app.",
    button: "See how to pay",
    why: (g) => `You're getting this because you're in “${g}” on SettleMint.`,
    stop: "Stop emails like this",
    stopPage: {
      ask: "Stop emails like this from SettleMint?",
      confirm: "Stop these emails",
      done: "Done. You won't get emails like this from SettleMint any more.",
      undo: "Undo",
      back: "Open SettleMint",
    },
  },
  es: {
    push: (a) => `Hay un pago de ${a} pendiente de saldar.`,
    subject: (g) => `Recordatorio de pago · ${g}`,
    intro: (g) => `Hay un pago pendiente de saldar en «${g}».`,
    payTitle: "Cómo pagar",
    payTo: (n) => `Pagar a ${n}`,
    qrHint: "Escanéalo con la app de tu banco.",
    button: "Ver cómo pagar",
    why: (g) => `Recibes esto porque estás en «${g}» en SettleMint.`,
    stop: "Dejar de recibir correos como este",
    stopPage: {
      ask: "¿Dejar de recibir correos como este de SettleMint?",
      confirm: "Dejar de recibirlos",
      done: "Listo. Ya no recibirás correos como este de SettleMint.",
      undo: "Deshacer",
      back: "Abrir SettleMint",
    },
  },
  pt: {
    push: (a) => `Há um pagamento de ${a} à espera de ser acertado.`,
    subject: (g) => `Lembrete de pagamento · ${g}`,
    intro: (g) => `Há um pagamento à espera de ser acertado em “${g}”.`,
    payTitle: "Como pagar",
    payTo: (n) => `Pagar a ${n}`,
    qrHint: "Leia com o app do seu banco.",
    button: "Ver como pagar",
    why: (g) => `Você recebe isto porque está em “${g}” no SettleMint.`,
    stop: "Parar de receber e-mails como este",
    stopPage: {
      ask: "Parar de receber e-mails como este do SettleMint?",
      confirm: "Parar de receber",
      done: "Pronto. Você não receberá mais e-mails como este do SettleMint.",
      undo: "Desfazer",
      back: "Abrir o SettleMint",
    },
  },
  fr: {
    push: (a) => `Un paiement de ${a} attend d’être réglé.`,
    subject: (g) => `Rappel de paiement · ${g}`,
    intro: (g) => `Un paiement attend d’être réglé dans « ${g} ».`,
    payTitle: "Comment payer",
    payTo: (n) => `Payer ${n}`,
    qrHint: "Scannez-le avec l’appli de votre banque.",
    button: "Voir comment payer",
    why: (g) => `Vous recevez ceci car vous êtes dans « ${g} » sur SettleMint.`,
    stop: "Ne plus recevoir ces e-mails",
    stopPage: {
      ask: "Ne plus recevoir d’e-mails comme celui-ci de SettleMint ?",
      confirm: "Ne plus les recevoir",
      done: "C’est fait. Vous ne recevrez plus d’e-mails comme celui-ci de SettleMint.",
      undo: "Annuler",
      back: "Ouvrir SettleMint",
    },
  },
  de: {
    push: (a) => `Eine Zahlung über ${a} wartet darauf, beglichen zu werden.`,
    subject: (g) => `Zahlungserinnerung · ${g}`,
    intro: (g) => `In „${g}“ wartet eine Zahlung darauf, beglichen zu werden.`,
    payTitle: "So zahlst du",
    payTo: (n) => `An ${n} zahlen`,
    qrHint: "Mit der App deiner Bank scannen.",
    button: "Zahlungsweg ansehen",
    why: (g) => `Du erhältst das, weil du in „${g}“ bei SettleMint bist.`,
    stop: "Keine solchen E-Mails mehr",
    stopPage: {
      ask: "Keine E-Mails wie diese mehr von SettleMint erhalten?",
      confirm: "Keine mehr senden",
      done: "Erledigt. Du bekommst keine E-Mails wie diese mehr von SettleMint.",
      undo: "Rückgängig",
      back: "SettleMint öffnen",
    },
  },
  hi: {
    push: (a) => `${a} का एक भुगतान चुकता होने का इंतज़ार कर रहा है।`,
    subject: (g) => `भुगतान की याद · ${g}`,
    intro: (g) => `“${g}” में एक भुगतान चुकता होने का इंतज़ार कर रहा है।`,
    payTitle: "भुगतान कैसे करें",
    payTo: (n) => `${n} को भुगतान करें`,
    qrHint: "इसे अपने बैंक के ऐप से स्कैन करें।",
    button: "भुगतान का तरीका देखें",
    why: (g) => `आपको यह इसलिए मिला क्योंकि आप SettleMint पर “${g}” में हैं।`,
    stop: "ऐसे ईमेल बंद करें",
    stopPage: {
      ask: "SettleMint के ऐसे ईमेल बंद करें?",
      confirm: "ईमेल बंद करें",
      done: "हो गया। अब आपको SettleMint से ऐसे ईमेल नहीं मिलेंगे।",
      undo: "वापस लें",
      back: "SettleMint खोलें",
    },
  },
  ur: {
    push: (a) => `${a} کی ایک ادائیگی طے ہونے کی منتظر ہے۔`,
    subject: (g) => `ادائیگی کی یاد دہانی · ${g}`,
    intro: (g) => `“${g}” میں ایک ادائیگی طے ہونے کی منتظر ہے۔`,
    payTitle: "ادائیگی کیسے کریں",
    payTo: (n) => `${n} کو ادائیگی کریں`,
    qrHint: "اسے اپنے بینک کی ایپ سے اسکین کریں۔",
    button: "ادائیگی کا طریقہ دیکھیں",
    why: (g) => `آپ کو یہ اس لیے ملا کہ آپ SettleMint پر “${g}” میں ہیں۔`,
    stop: "ایسی ای میلز بند کریں",
    stopPage: {
      ask: "SettleMint کی ایسی ای میلز بند کریں؟",
      confirm: "ای میلز بند کریں",
      done: "ہو گیا۔ اب آپ کو SettleMint سے ایسی ای میلز نہیں ملیں گی۔",
      undo: "واپس کریں",
      back: "SettleMint کھولیں",
    },
  },
  ar: {
    push: (a) => `هناك دفعة بقيمة ${a} بانتظار التسوية.`,
    subject: (g) => `تذكير بالدفع · ${g}`,
    intro: (g) => `هناك دفعة بانتظار التسوية في «${g}».`,
    payTitle: "كيف تدفع",
    payTo: (n) => `ادفع إلى ${n}`,
    qrHint: "امسح الرمز بتطبيق مصرفك.",
    button: "اعرف كيف تدفع",
    why: (g) => `وصلتك هذه الرسالة لأنك في «${g}» على SettleMint.`,
    stop: "إيقاف رسائل كهذه",
    stopPage: {
      ask: "هل تريد إيقاف رسائل كهذه من SettleMint؟",
      confirm: "إيقاف الرسائل",
      done: "تم. لن تصلك رسائل كهذه من SettleMint بعد الآن.",
      undo: "تراجع",
      back: "افتح SettleMint",
    },
  },
};

export const reminderCopy = (locale: string | null | undefined): ReminderCopy => COPY[noticeLanguage(locale)];
export const reminderDir = (locale: string | null | undefined) => (["ar", "ur"].includes(noticeLanguage(locale)) ? "rtl" : "ltr");
