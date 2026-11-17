import { LANGUAGE_CODES, RTL_LANGUAGES, type Language } from "@settlemint/client/i18n/languages";

// Classes used by the banner below (kept here so Tailwind generates them).
const BOX =
  "safe-bottom fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[var(--radius-lg)] border border-line-strong bg-bg-elevated px-4 py-3 shadow-float";
const TEXT = "flex-1 text-[15px]";
const CTA = "shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover";
const CLOSE = "shrink-0 rounded-full p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg";

export type SuggestTexts = Record<Exclude<Language, "en">, { text: string; cta: string; dismiss: string }>;

/**
 * On the English page: "Esta página está disponible en español", written in
 * that language, for people whose browser prefers it. A few lines of plain
 * script, because the public pages ship no app JavaScript.
 */
export function languageSuggestScript(texts: SuggestTexts) {
  const config = JSON.stringify({ texts, codes: LANGUAGE_CODES, rtl: RTL_LANGUAGES, box: BOX, text: TEXT, cta: CTA, close: CLOSE });
  return `(function(){var C=${config.replace(/</g, "\\u003c")};var K="sm-lang-suggest-dismissed";try{if(localStorage.getItem(K))return}catch(e){}
var tags=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"en"],l=null;
for(var i=0;i<tags.length&&!l;i++){var b=String(tags[i]).toLowerCase().split(/[-_]/)[0];if(C.codes.indexOf(b)>=0)l=b}
if(!l||l==="en"||!C.texts[l])return;var t=C.texts[l];
var d=document.createElement("div");d.lang=l;d.dir=C.rtl.indexOf(l)>=0?"rtl":"ltr";d.setAttribute("role","region");d.setAttribute("aria-label",t.text);d.className=C.box;
var p=document.createElement("p");p.className=C.text;p.textContent=t.text;
var a=document.createElement("a");a.href="/"+l;a.className=C.cta;a.textContent=t.cta;
var x=document.createElement("button");x.type="button";x.className=C.close;x.setAttribute("aria-label",t.dismiss);
x.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
x.onclick=function(){try{localStorage.setItem(K,"1")}catch(e){}d.remove()};
d.appendChild(p);d.appendChild(a);d.appendChild(x);document.body.appendChild(d)})()`;
}
