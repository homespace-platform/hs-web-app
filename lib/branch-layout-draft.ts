/**
 * Keeps an unsaved floor-map draft on this device, per user and branch: the App Router cannot
 * block browser Back, so the draft is offered again instead. Storage failures are ignored.
 */
import type { LayoutDraft } from "@/types/branch-layout.type";

export interface StoredDraft {
  /** Server revision the draft was edited from. */
  revision: number;
  draft: LayoutDraft;
}

const storageKey = (userId: string, branchId: string) => `hs.branch-layout-draft.${userId}.${branchId}`;

type Node = { key?: unknown; id?: unknown; label?: unknown; roomCode?: unknown; rows?: unknown; slots?: unknown } | null;

/** The whole tree the editor relies on: every node has its own key, since edits find nodes by key. */
function isDraft(value: unknown): value is LayoutDraft {
  const keys = new Set<string>();
  const all = (nodes: unknown, check: (node: NonNullable<Node>) => boolean) =>
    Array.isArray(nodes) && nodes.every((node: Node) => {
      if (!node || typeof node.key !== "string" || !node.key || keys.has(node.key)) return false;
      keys.add(node.key);
      return (node.id === undefined || typeof node.id === "string") && check(node);
    });
  return all(value, (floor) => typeof floor.label === "string" && all(floor.rows, (row) =>
    typeof row.label === "string" && all(row.slots, (slot) => slot.roomCode === null || typeof slot.roomCode === "string")));
}

export function readStoredDraft(userId: string | undefined, branchId: string): StoredDraft | null {
  if (!userId) return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(userId, branchId)) ?? "null") as StoredDraft | null;
    return value && Number.isInteger(value.revision) && isDraft(value.draft) ? value : null;
  } catch {
    return null;
  }
}

/** `null` removes the stored draft. */
export function writeStoredDraft(userId: string | undefined, branchId: string, value: StoredDraft | null): void {
  if (!userId) return;
  try {
    if (value) window.localStorage.setItem(storageKey(userId, branchId), JSON.stringify(value));
    else window.localStorage.removeItem(storageKey(userId, branchId));
  } catch {
    // Private window or full storage: the in-page draft and leave warnings still work.
  }
}

/** Removes the stored draft only while it is still exactly `owned`; another tab may have written a newer one. */
export function removeStoredDraft(userId: string | undefined, branchId: string, owned: StoredDraft): void {
  if (!userId) return;
  try {
    const key = storageKey(userId, branchId);
    if (window.localStorage.getItem(key) === JSON.stringify(owned)) window.localStorage.removeItem(key);
  } catch {
    // Same as writing: storage is optional.
  }
}
