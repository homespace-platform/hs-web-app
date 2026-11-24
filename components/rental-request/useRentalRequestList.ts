"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import rentalRequestService from "@/services/rental-request.service";
import type { RentalRequestResponse, RentalRequestStatus } from "@/types/rental-request.type";

export type RequestFilter = RentalRequestStatus | "ALL" | "CANCELLED";
const CANCELLED_STATUSES: RentalRequestStatus[] = ["CANCELLED_BY_RENTER", "CANCELLED_BY_OWNER", "CANCELLED_BY_SYSTEM"];
const PAGE_SIZE = 8;

/**
 * The server filters by ONE status, so "Đã hủy" (three statuses) asks for each of them and merges: for page p every
 * source only needs its newest p*size rows to produce the newest p*size of the union.
 */
async function loadPage(mode: "RECEIVED" | "SENT", filter: RequestFilter, page: number) {
  const fetchPage = (status: RentalRequestStatus | "ALL", pageNo: number, size: number) =>
    mode === "SENT" ? rentalRequestService.getMyRequests({ status, page: pageNo, size }) : rentalRequestService.getOwnerRequests({ status, page: pageNo, size });
  if (filter !== "CANCELLED") {
    const res = await fetchPage(filter, page, PAGE_SIZE);
    return { rows: res.result || [], totalElements: res.totalElements || 0, totalPages: res.totalPages || 1 };
  }
  const parts = await Promise.all(CANCELLED_STATUSES.map((status) => fetchPage(status, 1, page * PAGE_SIZE)));
  const merged = parts.flatMap((part) => part.result || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = parts.reduce((sum, part) => sum + (part.totalElements || 0), 0);
  return { rows: merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), totalElements: total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** List state of the rental-request page: filter, paging and ticketed loads (a foreground load is never overwritten by an older silent one). */
export function useRentalRequestList({ mode, initialized, authenticated, userId }: {
  mode: "RECEIVED" | "SENT"; initialized: boolean; authenticated: boolean; userId: string | null;
}) {
  const listRequestSeq = useRef(0);
  const listForegroundSeq = useRef(0);
  const listAppliedSeq = useRef(0);
  const [statusFilter, setStatusFilter] = useState<RequestFilter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RentalRequestResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadRequests = useCallback(async (silent: boolean) => {
    if (!initialized || !authenticated || !userId) return;
    // Every load gets a unique ticket. A result applies only if no newer foreground load started (filter/page
    // change) and nothing newer already applied, so an old foreground can't overwrite a fresher silent result.
    const sequence = ++listRequestSeq.current;
    if (!silent) {
      listForegroundSeq.current = sequence;
      setLoading(true);
    }
    const isCurrent = () => sequence >= listForegroundSeq.current && sequence > listAppliedSeq.current;
    try {
      const next = await loadPage(mode, statusFilter, page);
      if (!isCurrent()) return;
      listAppliedSeq.current = sequence;
      setRequests((previous) => (JSON.stringify(previous) === JSON.stringify(next.rows) ? previous : next.rows));
      setTotalElements(next.totalElements);
      setTotalPages(next.totalPages);
    } catch {
      if (!silent && isCurrent()) toast.error("Không thể tải danh sách yêu cầu thuê nhà.");
    } finally {
      // Spinner belongs to the latest foreground load, even if a silent result superseded its data.
      if (!silent && sequence === listForegroundSeq.current) setLoading(false);
    }
  }, [initialized, authenticated, userId, mode, statusFilter, page]);
  const fetchRequests = useCallback(() => loadRequests(false), [loadRequests]);
  // Silent: no skeleton, no toast, and an unchanged page keeps the same array so dependants do not refetch.
  const refreshRequests = useCallback(() => loadRequests(true), [loadRequests]);

  useEffect(() => {
    if (!initialized) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    void fetchRequests();
  }, [initialized, authenticated, fetchRequests]);

  const changeFilter = useCallback((filter: RequestFilter) => { setStatusFilter(filter); setPage(1); }, []);
  return { requests, loading, statusFilter, changeFilter, page, setPage, totalElements, totalPages, fetchRequests, refreshRequests };
}
