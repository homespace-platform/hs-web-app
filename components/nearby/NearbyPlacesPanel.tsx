"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { MapPin, Map as MapIcon, List, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { getNearbyPlaces } from "@/services/nearby.service";
import { NEARBY_GROUPS, NEARBY_RADIUS_METERS, type NearbyGroup, type NearbyPage } from "@/types/nearby.type";
import { nearbyDirectionsUrl, validCoordinates } from "@/lib/nearby-directions";
import { nearbyColor, nearbyDistance } from "@/lib/nearby-presentation";

const NearbyMap = dynamic(() => import("./NearbyMap"), {
  ssr: false,
  loading: () => <div role="status" className="h-[360px] animate-pulse rounded-xl bg-muted md:h-[440px]">Đang tải bản đồ...</div>,
});
const EMPTY_PLACES: NearbyPage["items"] = [];

export default function NearbyPlacesPanel({ listingId, latitude, longitude }: { listingId: string; latitude?: number; longitude?: number }) {
  const radius = NEARBY_RADIUS_METERS;
  const uid = useId();
  const [group, setGroup] = useState<NearbyGroup | "">("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "map">("map");
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const origin = { latitude, longitude };
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([listingId, radius, group, page, attempt]);
  const [result, setResult] = useState<{ key: string; data: NearbyPage | null; error: string }>({ key: "", data: null, error: "" });
  const loading = result.key !== requestKey;
  const data = loading ? null : result.data, error = loading ? "" : result.error;
  const selectedId = selection?.key === requestKey ? selection.id : null;
  const canMap = Boolean(process.env.NEXT_PUBLIC_VIETMAP_MAP_API_KEY);
  const hasListingCoordinates = validCoordinates({ latitude, longitude });

  useEffect(() => {
    const controller = new AbortController();
    getNearbyPlaces(listingId, group, page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data, error: "" }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: "Chưa tải được tiện ích xung quanh. Bạn có thể thử lại." }); });
    return () => controller.abort();
  }, [listingId, group, page, requestKey]);

  if (data?.enabled === false) return null;
  const coverage = data?.coverage.groups ?? [];
  const complete = coverage.length > 0 && coverage.every(g => g.coverageStatus === "COMPLETE_PROVIDER_RESPONSE" && (g.radiusCoveredMeters ?? 0) >= radius);
  const limited = coverage.some(g => g.coverageStatus === "LIMITED_PROVIDER_RESPONSE");
  const lastChecked = coverage.flatMap(g => g.dataAsOf ? [g.dataAsOf] : []).sort()[0];
  const startIndex = (page - 1) * (data?.size ?? 5);

  function tabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: "list" | "map") {
    let next: "list" | "map";
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = current === "list" ? "map" : "list";
    else if (event.key === "Home") next = "map";
    else if (event.key === "End") next = "list";
    else return;
    event.preventDefault();
    setView(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  }

  const placeList = data && data.items.length > 0 && <ul className={view === "map" ? "max-h-[440px] space-y-2 overflow-y-auto pr-1" : "divide-y divide-border"} aria-label="Danh sách tiện ích">
    {data.items.map((place, index) => {
      const directionsUrl = nearbyDirectionsUrl(origin, place);
      const selected = selectedId === place.id;
      return <li key={place.id} className={view === "map" ? `rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border"}` : "flex items-start gap-3 py-3"}>
        {view === "list" && <MapPin size={18} className="mt-1 shrink-0 text-primary" />}
        <div className="min-w-0 flex-1">
          {view === "map" ? <button type="button" ref={element => { if (element) itemRefs.current.set(place.id, element); else itemRefs.current.delete(place.id); }} aria-pressed={selected} onClick={() => setSelection({ key: requestKey, id: place.id })} className="flex w-full items-start gap-2 text-left text-sm font-semibold hover:text-primary">
            <span style={{ backgroundColor: nearbyColor(place.groups, group) }} className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white">{startIndex + index + 1}</span>{place.name}
          </button> : <p className="text-sm font-semibold">{place.name}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">{place.address}</p>
          <p className="mt-1 text-xs text-muted-foreground">{place.groups.map(g => NEARBY_GROUPS[g]).join(" · ")}</p>
        </div>
        <div className={view === "map" ? "mt-2 flex items-center justify-between gap-2" : "shrink-0 text-right"}>
          <p className="text-sm font-medium">{nearbyDistance(place.distanceMeters)}</p>
          {directionsUrl ? <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary">Chỉ đường<ExternalLink size={12} /></a>
            : <button type="button" disabled title="Chưa có tọa độ hợp lệ của bài đăng hoặc tiện ích" className="mt-1 text-xs text-primary opacity-50">Chỉ đường</button>}
        </div>
      </li>;
    })}
  </ul>;

  return <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-heading text-lg font-bold">Tiện ích xung quanh</h2>
      <span className="rounded-lg border border-border bg-background px-3 py-2 text-sm">Trong 2 km</span>
    </div>
    <div role="tablist" aria-label="Cách xem tiện ích" className="inline-flex rounded-xl bg-muted p-1">
      {([{ id: "map", label: "Bản đồ", icon: MapIcon }, { id: "list", label: "Danh sách", icon: List }] as const).map(tab => <button
        type="button" role="tab" key={tab.id} id={`${uid}-tab-${tab.id}`} aria-controls={`${uid}-panel-${tab.id}`} aria-selected={view === tab.id}
        tabIndex={view === tab.id ? 0 : -1} onKeyDown={e => tabKeyDown(e, tab.id)} onClick={() => setView(tab.id)}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><tab.icon size={16} />{tab.label}</button>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Nhóm tiện ích">
      <button type="button" aria-pressed={!group} onClick={() => { setGroup(""); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs ${!group ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Tất cả</button>
      {Object.entries(NEARBY_GROUPS).filter(([code]) => code !== "SPORTS").map(([code, label]) => <button type="button" key={code} aria-pressed={group === code} onClick={() => { setGroup(code as NearbyGroup); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs ${group === code ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{label}</button>)}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">
      Khoảng cách đường chim bay từ tọa độ tin đăng, không phải quãng đường hoặc thời gian di chuyển.
      {lastChecked && ` Dữ liệu thu thập: ${new Date(lastChecked).toLocaleString("vi-VN")}.`}
    </p>
    <p className="text-xs text-muted-foreground">{hasListingCoordinates ? "Chỉ đường từ vị trí bài đăng đến tiện ích." : "Tin đăng chưa có tọa độ hợp lệ để chỉ đường."}</p>
    {!complete && data && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{limited
      ? "Mỗi bài đăng hiển thị tối đa 100 địa điểm đã thu thập trong 2 km. Nhóm chưa có kết quả có thể chưa nằm trong danh sách này."
      : "Dữ liệu chưa phủ đủ phạm vi hoặc nhóm tiện ích đang chọn. Chỉ hiển thị các địa điểm đã có dữ liệu."}</p>}
    {error && <div role="alert" className="flex items-center gap-3 text-sm"><p>{error}</p><button type="button" onClick={() => setAttempt(n => n + 1)} className="inline-flex items-center gap-1 text-primary"><RefreshCw size={14} />Thử lại</button></div>}
    {loading && <p className="text-sm text-muted-foreground" role="status">Đang tải tiện ích...</p>}
    {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">Chưa tìm thấy địa điểm phù hợp trong dữ liệu hiện tại.</p>}
    <div role="tabpanel" id={`${uid}-panel-list`} aria-labelledby={`${uid}-tab-list`} hidden={view !== "list"} tabIndex={0}>
      {view === "list" && placeList}
    </div>
    <div role="tabpanel" id={`${uid}-panel-map`} aria-labelledby={`${uid}-tab-map`} hidden={view !== "map"} tabIndex={0}>
      {view === "map" && (!hasListingCoordinates ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Tin đăng chưa có tọa độ để hiển thị bản đồ.</p>
        : !canMap ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Bản đồ hiện chưa sẵn sàng. Bạn có thể xem địa điểm ở tab Danh sách.</p>
          : <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div className="min-w-0">{placeList}</div>
            <div className="order-first min-w-0 md:order-last"><NearbyMap key={`${listingId}:${latitude}:${longitude}`} latitude={latitude!} longitude={longitude!} radius={radius}
              places={data?.items ?? EMPTY_PLACES} activeGroup={group} startIndex={startIndex} selectedId={selectedId}
              onSelect={id => {
                setSelection({ key: requestKey, id });
                itemRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }} /></div>
          </div>)}
    </div>
    {data && data.total > data.size && <div className="flex items-center justify-between text-sm">
      <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)} className="inline-flex items-center gap-1 disabled:opacity-40"><ChevronLeft size={16} />Trước</button>
      <span>Trang {page} / {Math.ceil(data.total / data.size)}</span>
      <button type="button" disabled={page * data.size >= data.total || loading} onClick={() => setPage(n => n + 1)} className="inline-flex items-center gap-1 disabled:opacity-40">Tiếp<ChevronRight size={16} /></button>
    </div>}
    <p className="text-[11px] leading-relaxed text-muted-foreground">Địa điểm: © TomTom · Bản đồ: VietMap. Bản đồ hiển thị tối đa 5 tiện ích trên trang hiện tại. Dữ liệu nguồn không xác nhận địa điểm đang hoạt động.</p>
  </section>;
}
