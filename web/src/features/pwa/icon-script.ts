/**
 * Makes the Home Screen icon follow the phone's light/dark appearance.
 *
 * iOS reads a website's icon at the moment it is added to the Home Screen. Someone adding the app
 * while their phone is in dark mode therefore gets the dark icon (a green S on near-black) instead
 * of the green square, which iOS would otherwise darken on its own into an all-black tile.
 * Apple documents no supported way to do this for websites; this swap is the one people report
 * working, and it is harmless where it doesn't.
 *
 * Runs in <head> on every page, before React exists, so it works on the sign-in page and the
 * plain-HTML public pages too. Keep it tiny and dependency-free.
 */
export const iconScript = `(function(){try{var q=matchMedia("(prefers-color-scheme: dark)");var a=function(){var l=document.querySelector('link[rel="apple-touch-icon"]');if(l)l.setAttribute("href",q.matches?"/apple-touch-icon-dark.png":"/apple-touch-icon.png")};a();document.addEventListener("DOMContentLoaded",a);q.addEventListener("change",a)}catch(e){}})()`;
