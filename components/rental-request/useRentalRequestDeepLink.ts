"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import rentalRequestService from "@/services/rental-request.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";

const PARAM = "requestId";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Remove only `requestId`; keep every other query parameter and the hash. */
function stripRequestParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Opens `?requestId=<uuid>` from a notification link: loads the authorized detail by id
 * (no list scan, no status filter), checks the verified user against the page side,
 * and hands the fresh request to `onOpen`. Every failure path clears the param so the
 * same link can be opened again. Returns `clearDeepLink` for every modal close path.
 */
export function useRentalRequestDeepLink(options: {
  initialized: boolean;
  authenticated: boolean;
  userId: string | null;
  mode: "RECEIVED" | "SENT";
  login: (redirectPath: string) => void;
  onOpen: (request: RentalRequestResponse | null) => void;
}) {
  const rawId = useSearchParams().get(PARAM);
  const { initialized, authenticated, userId, mode, login } = options;
  const onOpenRef = useRef(options.onOpen);
  useEffect(() => {
    onOpenRef.current = options.onOpen;
  });
  const loginRequested = useRef(false);
  const linkActive = useRef(false);

  useEffect(() => {
    if (!rawId) {
      // Browser back removed the param: close what the link opened.
      if (linkActive.current) {
        linkActive.current = false;
        onOpenRef.current(null);
      }
      return;
    }
    if (!initialized) return;
    if (!authenticated || !userId) {
      if (!authenticated && !loginRequested.current) {
        loginRequested.current = true;
        login(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      }
      return;
    }
    if (!UUID.test(rawId)) {
      toast.info("Liên kết yêu cầu thuê không hợp lệ.");
      stripRequestParam();
      return;
    }

    let disposed = false;
    linkActive.current = true;
    onOpenRef.current(null);
    void rentalRequestService
      .getRequestById(rawId)
      .then((request) => {
        if (disposed) return;
        // Never infer page ownership from a 200: the verified user must be on this side.
        const ownerSide = mode === "RECEIVED" ? request.ownerId : request.renterId;
        if (request.id !== rawId || ownerSide !== userId) {
          toast.info("Yêu cầu thuê không thuộc phía tài khoản bạn đang xem.");
          linkActive.current = false;
          stripRequestParam();
          return;
        }
        onOpenRef.current(request);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        linkActive.current = false;
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 403 || status === 404) {
          toast.info("Yêu cầu thuê không còn tồn tại hoặc bạn không có quyền xem.");
        } else {
          toast.error("Không thể mở yêu cầu thuê lúc này. Vui lòng thử lại.");
        }
        stripRequestParam();
      });
    return () => {
      disposed = true;
    };
  }, [rawId, initialized, authenticated, userId, mode, login]);

  return useCallback(() => {
    linkActive.current = false;
    stripRequestParam();
  }, []);
}
