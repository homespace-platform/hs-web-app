export function normalizeLocationText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim().replace(/\s+/g, " ");
}

export function locationMatches(name: string, query: string): boolean {
  return normalizeLocationText(name).includes(normalizeLocationText(query));
}
