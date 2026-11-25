/**
 * True on a computer with a mouse. Fields only focus themselves there: on a phone
 * that would throw the keyboard up before anyone asked for it.
 */
export function hasFinePointer(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches;
}
