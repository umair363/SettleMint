import { LANGUAGE_CODES, LANGUAGE_STORAGE_KEY, RTL_LANGUAGES } from "@settlemint/client/i18n/languages";

/**
 * Runs in <head> before first paint: sets lang/dir so right-to-left pages
 * never flip after loading, and marks non-English pages as waiting for their
 * text (see globals.css) with a safety timeout. Pages not yet translated keep
 * English. Keep in step with matchLanguage above.
 */
export function languageScript(untranslatedPaths: readonly string[]) {
  return `(function(){try{var r=document.documentElement;if(${JSON.stringify(untranslatedPaths)}.indexOf(location.pathname.replace(/\\/+$/,"")||"/")>=0)return;var codes=${JSON.stringify(LANGUAGE_CODES)},rtl=${JSON.stringify(RTL_LANGUAGES)};var p=null;try{p=localStorage.getItem("${LANGUAGE_STORAGE_KEY}")}catch(e){}var l=codes.indexOf(p)>=0?p:null;if(!l){var t=navigator.languages||[navigator.language||"en"];for(var i=0;i<t.length&&!l;i++){var b=String(t[i]).toLowerCase().split(/[-_]/)[0];if(codes.indexOf(b)>=0)l=b}}l=l||"en";r.lang=l;r.dir=rtl.indexOf(l)>=0?"rtl":"ltr";if(l!=="en"){r.setAttribute("data-i18n-pending","");setTimeout(function(){r.removeAttribute("data-i18n-pending")},3000)}}catch(e){}})()`;
}
