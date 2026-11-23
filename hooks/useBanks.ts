"use client";

import { useCallback, useEffect, useState } from "react";
import bankAccountService from "@/services/bank-account.service";
import type { Bank } from "@/types/bank-account.type";

/** Bank catalog from the backend: `banks` is empty until loaded; `error` is set on failure until `retry`. */
export function useBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    bankAccountService
      .getBanks()
      .then((list) => active && setBanks(list))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  return { banks, loading: !error && banks.length === 0, error, retry };
}
