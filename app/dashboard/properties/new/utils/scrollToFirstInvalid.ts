/** Scrolls to (and focuses) the first element of `ids` in DOM order. Returns false if none is mounted. */
export function scrollToFirstInvalid(ids: string[]): boolean {
  const els = ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!els.length) return false;
  els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const el = els[0];
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const target = el.matches("input,select,textarea,button,[tabindex]")
    ? el
    : el.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea,button");
  target?.focus({ preventScroll: true });
  return true;
}
