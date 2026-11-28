"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { contractService } from "@/services/contract.service";
import { isClosedRequest } from "@/lib/rental-request-presentation";
import type { ContractResponse } from "@/types/contract.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";

const LOOKUP_STATUSES = ["ACCEPTED", "COMPLETED", "CANCELLED_BY_SYSTEM", "CANCELLED_BY_RENTER", "CANCELLED_BY_OWNER", "EXPIRED"];

/**
 * Lease contract and deposit agreement of each request on the page.
 * Looked up once per set of ids; only ACCEPTED requests (still moving) are polled, closed ones never are.
 */
export function useRequestContracts(requests: RentalRequestResponse[]) {
  const [contractsByRequest, setContractsByRequest] = useState<Record<string, ContractResponse | null>>({});
  const [agreementsByRequest, setAgreementsByRequest] = useState<Record<string, ContractResponse | null>>({});

  const lookup = useCallback(async (ids: string[], isCancelled: () => boolean) => {
    const entries = await Promise.all(ids.map(async (id) => {
      try { return [id, await contractService.getByRentalRequest(id, true)] as const; }
      catch { return [id, undefined] as const; }
    }));
    if (isCancelled()) return;
    // Deposit ACTIVE means signed receipt, never an active tenancy or a billable lease.
    setAgreementsByRequest((prev) => {
      const next = { ...prev };
      for (const [id, agreement] of entries) if (agreement !== undefined) next[id] = agreement;
      return next;
    });
    setContractsByRequest((prev) => {
      const next = { ...prev };
      for (const [id, agreement] of entries) if (agreement !== undefined) next[id] = agreement?.agreementKind === "DEPOSIT" ? null : agreement;
      return next;
    });
  }, []);

  // Keyed by the id set so a silent refresh that changes nothing does not refetch every contract.
  const allKey = useMemo(() => requests.filter((r) => LOOKUP_STATUSES.includes(r.status)).map((r) => r.id).join(","), [requests]);
  const activeKey = useMemo(() => requests.filter((r) => !isClosedRequest(r.status) && LOOKUP_STATUSES.includes(r.status)).map((r) => r.id).join(","), [requests]);

  useEffect(() => {
    if (!allKey) return;
    let cancelled = false;
    void lookup(allKey.split(","), () => cancelled);
    return () => { cancelled = true; };
  }, [allKey, lookup]);

  useEffect(() => {
    if (!activeKey) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void lookup(activeKey.split(","), () => cancelled);
    }, 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeKey, lookup]);

  // A confirmed first payment without a lease means Core is drafting it right now: ask often so the card flips quickly.
  const waitingKey = useMemo(() => requests
    .filter((r) => r.status === "ACCEPTED" && r.initialPayment?.status === "CONFIRMED" && !contractsByRequest[r.id])
    .map((r) => r.id).join(","), [requests, contractsByRequest]);

  useEffect(() => {
    if (!waitingKey) return;
    let cancelled = false;
    let busy = false;
    // shortcut: fast polling stops after 2 minutes (e.g. missing template); the 30 s poll above carries on.
    const stopAt = Date.now() + 120000;
    const interval = window.setInterval(() => {
      if (Date.now() > stopAt) return window.clearInterval(interval);
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      void lookup(waitingKey.split(","), () => cancelled).finally(() => { busy = false; });
    }, 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [waitingKey, lookup]);

  const refreshContracts = useCallback(() => {
    if (allKey) void lookup(allKey.split(","), () => false);
  }, [allKey, lookup]);

  const rememberContract = useCallback((requestId: string, contract: ContractResponse) => {
    setContractsByRequest((previous) => ({ ...previous, [requestId]: contract }));
  }, []);
  return { contractsByRequest, agreementsByRequest, rememberContract, refreshContracts };
}
