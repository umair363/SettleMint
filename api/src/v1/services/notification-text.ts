/**
 * Push notification sentences in the recipient's language (their profile
 * locale). Kept to the handful of events that notify; same languages as the
 * web app.
 */
export type NoticeLanguage = "en" | "es" | "pt" | "fr" | "de" | "hi" | "ur" | "ar";

interface Sentences {
  added(actor: string, item: string, amount: string): string;
  edited(actor: string, item: string): string;
  deleted(actor: string, item: string): string;
  /** The recipient was paid. */
  paidYou(from: string, amount: string): string;
  /** Someone recorded that the recipient paid. */
  recordedYouPaid(actor: string, to: string, amount: string): string;
  joined(name: string): string;
  someone: string;
  them: string;
}

const withAmount = (text: string, amount: string) => (amount ? `${text} · ${amount}` : text);

const TEXT: Record<NoticeLanguage, Sentences> = {
  en: {
    added: (a, i, m) => withAmount(`${a} added “${i}”`, m),
    edited: (a, i) => `${a} edited “${i}”`,
    deleted: (a, i) => `${a} deleted “${i}”`,
    paidYou: (f, m) => `${f} paid you ${m}`,
    recordedYouPaid: (a, t, m) => `${a} recorded that you paid ${t} ${m}`,
    joined: (n) => `${n} joined the group`,
    someone: "Someone",
    them: "them",
  },
  es: {
    added: (a, i, m) => withAmount(`${a} añadió “${i}”`, m),
    edited: (a, i) => `${a} editó “${i}”`,
    deleted: (a, i) => `${a} eliminó “${i}”`,
    paidYou: (f, m) => `${f} te pagó ${m}`,
    recordedYouPaid: (a, t, m) => `${a} registró que pagaste ${m} a ${t}`,
    joined: (n) => `${n} se unió al grupo`,
    someone: "Alguien",
    them: "esa persona",
  },
  pt: {
    added: (a, i, m) => withAmount(`${a} adicionou “${i}”`, m),
    edited: (a, i) => `${a} editou “${i}”`,
    deleted: (a, i) => `${a} excluiu “${i}”`,
    paidYou: (f, m) => `${f} pagou ${m} a você`,
    recordedYouPaid: (a, t, m) => `${a} registrou que você pagou ${m} para ${t}`,
    joined: (n) => `${n} entrou no grupo`,
    someone: "Alguém",
    them: "essa pessoa",
  },
  fr: {
    added: (a, i, m) => withAmount(`${a} a ajouté « ${i} »`, m),
    edited: (a, i) => `${a} a modifié « ${i} »`,
    deleted: (a, i) => `${a} a supprimé « ${i} »`,
    paidYou: (f, m) => `${f} vous a payé ${m}`,
    recordedYouPaid: (a, t, m) => `${a} a enregistré que vous avez payé ${m} à ${t}`,
    joined: (n) => `${n} a rejoint le groupe`,
    someone: "Quelqu’un",
    them: "cette personne",
  },
  de: {
    added: (a, i, m) => withAmount(`${a} hat „${i}“ hinzugefügt`, m),
    edited: (a, i) => `${a} hat „${i}“ bearbeitet`,
    deleted: (a, i) => `${a} hat „${i}“ gelöscht`,
    paidYou: (f, m) => `${f} hat dir ${m} gezahlt`,
    recordedYouPaid: (a, t, m) => `${a} hat eingetragen, dass du ${t} ${m} gezahlt hast`,
    joined: (n) => `${n} ist der Gruppe beigetreten`,
    someone: "Jemand",
    them: "der Person",
  },
  hi: {
    added: (a, i, m) => withAmount(`${a} ने “${i}” जोड़ा`, m),
    edited: (a, i) => `${a} ने “${i}” बदला`,
    deleted: (a, i) => `${a} ने “${i}” हटाया`,
    paidYou: (f, m) => `${f} ने आपको ${m} दिए`,
    recordedYouPaid: (a, t, m) => `${a} ने दर्ज किया कि आपने ${t} को ${m} दिए`,
    joined: (n) => `${n} ग्रुप से जुड़े`,
    someone: "कोई",
    them: "उन्हें",
  },
  ur: {
    added: (a, i, m) => withAmount(`${a} نے “${i}” شامل کیا`, m),
    edited: (a, i) => `${a} نے “${i}” میں ترمیم کی`,
    deleted: (a, i) => `${a} نے “${i}” حذف کیا`,
    paidYou: (f, m) => `${f} نے آپ کو ${m} ادا کیے`,
    recordedYouPaid: (a, t, m) => `${a} نے درج کیا کہ آپ نے ${t} کو ${m} ادا کیے`,
    joined: (n) => `${n} گروپ میں شامل ہوئے`,
    someone: "کوئی",
    them: "انہیں",
  },
  ar: {
    added: (a, i, m) => withAmount(`أضاف ${a} “${i}”`, m),
    edited: (a, i) => `عدّل ${a} “${i}”`,
    deleted: (a, i) => `حذف ${a} “${i}”`,
    paidYou: (f, m) => `دفع لك ${f} ${m}`,
    recordedYouPaid: (a, t, m) => `سجّل ${a} أنك دفعت ${m} إلى ${t}`,
    joined: (n) => `انضم ${n} إلى المجموعة`,
    someone: "شخص ما",
    them: "الطرف الآخر",
  },
};

export function noticeLanguage(locale: string | null | undefined): NoticeLanguage {
  const base = (locale ?? "en").toLowerCase().split(/[-_]/)[0];
  return base in TEXT ? (base as NoticeLanguage) : "en";
}

export const noticeText = (locale: string | null | undefined) => TEXT[noticeLanguage(locale)];
