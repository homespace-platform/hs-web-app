"use client";
import { useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { changeRentCity, readRentState, writeRentState } from "@/lib/rent-filter-state";
import type { FilterState } from "@/components/rent/RentFilterSidebar";

const EVENT = "homespace:rent-query-changed";
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener); window.addEventListener(EVENT, listener);
  return () => { window.removeEventListener("popstate", listener); window.removeEventListener(EVENT, listener); };
}
function snapshot() { return window.location.pathname + window.location.search; }
const serverSnapshot = () => "";

export function updateRentQuery(query: string, replace = false) {
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  if (url === window.location.pathname + window.location.search + window.location.hash) return;
  if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

export function useRentUrlState() {
  // Path changes also re-render persistent Header consumers after Next client-side navigation.
  usePathname();
  const location = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const state = useMemo(() => readRentState(location.includes("?") ? location.slice(location.indexOf("?")) : ""), [location]);
  function setFilter(value: FilterState | ((previous: FilterState) => FilterState)) {
    const previous = readRentState(window.location.search).filter;
    updateRentQuery(writeRentState(window.location.search, typeof value === "function" ? value(previous) : value));
  }
  function setPage(page: number) {
    updateRentQuery(writeRentState(window.location.search, readRentState(window.location.search).filter, page));
  }
  function setCity(cityId: string) { updateRentQuery(changeRentCity(window.location.search, cityId)); }
  return { ...state, ready: location !== "", setFilter, setPage, setCity };
}
