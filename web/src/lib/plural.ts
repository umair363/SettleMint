/** "1 expense", "3 expenses" (English for now; full translations come with i18n). */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
