// The card contract contains references, never model-generated card facts or arbitrary URLs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cardListingIds(values: readonly string[] | undefined): string[] {
  // Match the service's absolute safety ceiling; the actual page size comes from the user's request.
  return [...new Set((values || []).filter((id) => typeof id === "string" && UUID.test(id)).map((id) => id.toLowerCase()))].slice(0, 50);
}

// Share only in-flight reads. Do not retain successful prices/statuses across chat reopens.
export function createListingCardLoader<T>(fetchListing: (id: string) => Promise<T>, concurrency = 3) {
  const pending = new Map<string, Promise<T>>();
  const queue: (() => void)[] = [];
  let active = 0;
  return (id: string): Promise<T> => {
    if (!UUID.test(id)) return Promise.reject(new Error("Invalid listing reference"));
    id = id.toLowerCase();
    const existing = pending.get(id);
    if (existing) return existing;
    const request = new Promise<T>((resolve, reject) => {
      const run = () => {
        active += 1;
        Promise.resolve().then(() => fetchListing(id)).then(resolve, reject).finally(() => {
          pending.delete(id);
          active -= 1;
          queue.shift()?.();
        });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
    pending.set(id, request);
    return request;
  };
}

/**
 * First time a listing appears in a conversation it gets a card; later mentions of the same
 * listing (follow-ups reusing earlier results) become text links so nothing renders twice.
 */
export function splitCardsAndLinks(
  messages: readonly { id: string; sender?: string; listingIds?: string[] }[],
): Map<string, { cards: string[]; links: string[] }> {
  const shown = new Set<string>();
  const result = new Map<string, { cards: string[]; links: string[] }>();
  for (const message of messages) {
    if (message.sender === "me") continue;
    const ids = cardListingIds(message.listingIds);
    if (!ids.length) continue;
    const cards = ids.filter((id) => !shown.has(id));
    const links = ids.filter((id) => shown.has(id));
    cards.forEach((id) => shown.add(id));
    result.set(message.id, { cards, links });
  }
  return result;
}
