import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Build-time only (the landing page is rendered to static HTML): the inline
// script that brings in the hero's glass lens once the page is idle, with a
// content hash so browsers always fetch the current version.

const version = (file: string) =>
  createHash("sha256")
    .update(readFileSync(join(process.cwd(), "public", "landing", file)))
    .digest("hex")
    .slice(0, 10);

/**
 * Skips devices and settings where the effect costs more than it gives:
 * reduced motion or transparency, Save-Data, little memory or few cores.
 * WebGL2 support is checked by the lens itself.
 */
export function landingMotionScript() {
  const src = `/landing/lens.js?v=${version("lens.js")}`;
  return `(function(){var w=window,d=document;function go(){try{var m=w.matchMedia,n=navigator;if(m("(prefers-reduced-motion: reduce)").matches||m("(prefers-reduced-transparency: reduce)").matches)return;if(n.connection&&n.connection.saveData)return;if((n.deviceMemory&&n.deviceMemory<4)||(n.hardwareConcurrency&&n.hardwareConcurrency<4))return;var s=d.createElement("script");s.type="module";s.src=${JSON.stringify(src)};d.head.appendChild(s)}catch(e){}}function idle(){(w.requestIdleCallback||function(f){setTimeout(f,300)})(go,{timeout:2500})}d.readyState==="complete"?idle():w.addEventListener("load",idle)})()`;
}
