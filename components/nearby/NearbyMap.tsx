"use client";

import { useEffect, useRef, useState } from "react";
import vietmapgl from "@vietmap/vietmap-gl-js/dist/vietmap-gl";
import { LocateFixed, MapPinOff, RefreshCw } from "lucide-react";
import { createNearbyMap, nearbyMapErrorMessage, type NearbyMapData } from "./nearby-map-controller";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";
import "./nearby-map.css";

export default function NearbyMap(props: NearbyMapData & { latitude: number; longitude: number; radius: number }) {
  const { latitude, longitude, radius } = props;
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createNearbyMap> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!container.current) return;
    let instance: ReturnType<typeof createNearbyMap> | undefined;
    let cancelled = false;
    try {
      instance = createNearbyMap(vietmapgl, container.current, {
        latitude, longitude, radius, apiKey: process.env.NEXT_PUBLIC_VIETMAP_MAP_API_KEY ?? "",
        onReady: () => { if (!cancelled) setStatus("ready"); },
        onError: message => { if (!cancelled) { setErrorMessage(message); setStatus("error"); } },
      });
      controller.current = instance;
    } catch (error) {
      queueMicrotask(() => { if (!cancelled) { setErrorMessage(nearbyMapErrorMessage(error)); setStatus("error"); } });
    }
    return () => {
      cancelled = true;
      controller.current = null;
      instance?.remove();
    };
  }, [latitude, longitude, radius, attempt]);

  useEffect(() => { controller.current?.update(props); }, [props, attempt]);

  return <div className="space-y-2">
    <div className="relative isolate overflow-hidden rounded-xl border border-border bg-muted">
      <div ref={container} inert={status === "error"} aria-hidden={status === "error"} className="h-[360px] w-full md:h-[440px]" role="region" aria-label="Bản đồ tiện ích xung quanh" />
      {status === "loading" && <p role="status" className="absolute inset-x-3 bottom-3 rounded-lg bg-card/95 p-3 text-xs shadow">Đang tải bản đồ...</p>}
      {status === "error" && <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
        <span className="rounded-full bg-muted p-3 text-muted-foreground"><MapPinOff size={26} /></span>
        <p className="text-sm font-semibold">Nền bản đồ chưa tải được</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{errorMessage}</p>
        <button type="button" onClick={() => { setStatus("loading"); setAttempt(n => n + 1); }} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-primary"><RefreshCw size={13} />Thử lại bản đồ</button>
      </div>}
      {status === "ready" && <button type="button" onClick={() => controller.current?.showAll()} className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 text-xs font-medium shadow-sm"><LocateFixed size={14} />Xem tất cả</button>}
    </div>
    <p className="flex items-center gap-2 text-[11px] leading-relaxed text-muted-foreground"><span className="size-2.5 shrink-0 rounded-full bg-blue-600" />Vị trí bài đăng · Số ghim khớp thứ tự trong danh sách</p>
  </div>;
}
