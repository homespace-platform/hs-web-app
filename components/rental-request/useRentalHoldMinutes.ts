"use client";

import { useEffect, useState } from "react";
import rentalRequestService from "@/services/rental-request.service";

/** Hold duration (minutes) from the rental policy endpoint; null until known or when the call fails (screens then show no number). */
export function useRentalHoldMinutes(enabled = true) {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    rentalRequestService.getPolicy()
      .then((policy) => { if (active) setMinutes(Number(policy?.holdMinutes) || null); })
      .catch(() => { if (active) setMinutes(null); });
    return () => { active = false; };
  }, [enabled]);
  return minutes;
}
