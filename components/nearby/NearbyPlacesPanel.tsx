"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { getNearbyPlaces } from "@/services/nearby.service";
import { NEARBY_GROUPS, NEARBY_RADIUS_METERS, type NearbyGroup, type NearbyPage } from "@/types/nearby.type";
import { useAuth } from "@/features/auth/useAuth";
import { useAppSelector } from "@/store/hooks";
import { nearbyDirectionsUrl, validCoordinates } from "@/lib/nearby-directions";
const NearbyMap = dynamic(() => import("./NearbyMap"), {ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-muted" />});
const distance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString("vi-VN", {maximumFractionDigits: 2})} km`;

export default function NearbyPlacesPanel({listingId, latitude, longitude}: {listingId: string; latitude?: number; longitude?: number}) {
 const radius = NEARBY_RADIUS_METERS;
 const [group, setGroup] = useState<NearbyGroup | "">(""), [page, setPage] = useState(1);
 const { authenticated, userId, profile, login } = useAuth();
 const loadedForUserId = useAppSelector(state => state.user.loadedForUserId);
 const origin = authenticated && userId && loadedForUserId === userId ? profile?.address : null;
 const [attempt, setAttempt] = useState(0), [showMap, setShowMap] = useState(false);
 const requestKey = JSON.stringify([listingId, radius, group, page, attempt]);
 const [result, setResult] = useState<{key: string; data: NearbyPage | null; error: string}>({key: "", data: null, error: ""});
 const loading = result.key !== requestKey;
 const data = loading ? null : result.data, error = loading ? "" : result.error;
 useEffect(() => {
  const controller = new AbortController();
  getNearbyPlaces(listingId, group, page, controller.signal)
   .then(data => {if (!controller.signal.aborted) setResult({key: requestKey, data, error: ""});})
   .catch(() => {if (!controller.signal.aborted) setResult({key: requestKey, data: null, error: "Chưa tải được tiện ích xung quanh. Bạn có thể thử lại."});});
  return () => controller.abort();
 }, [listingId, group, page, requestKey]);
 if ((!data && !error && !loading) || data?.enabled === false || (!data && loading && !error)) return null;
 const coverage = data?.coverage.groups ?? [];
 const complete = coverage.length > 0 && coverage.every(g => g.coverageStatus === "COMPLETE_PROVIDER_RESPONSE" && (g.radiusCoveredMeters ?? 0) >= radius);
 const lastChecked = coverage.flatMap(g => g.dataAsOf ? [g.dataAsOf] : []).sort()[0];
 const canMap = Boolean(process.env.NEXT_PUBLIC_VIETMAP_MAP_API_KEY && Number.isFinite(latitude) && Number.isFinite(longitude));
 return (
  <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="font-heading text-lg font-bold">Tiện ích xung quanh</h2>
    <span className="rounded-lg border border-border bg-background px-3 py-2 text-sm">Trong 2 km</span>
   </div>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Nhóm tiện ích">
    <button type="button" aria-pressed={!group} onClick={() => {setGroup(""); setPage(1);}} className={`rounded-full border px-3 py-1.5 text-xs ${!group ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Tất cả</button>
    {Object.entries(NEARBY_GROUPS).map(([code, label]) => <button type="button" key={code} aria-pressed={group === code} onClick={() => {setGroup(code as NearbyGroup); setPage(1);}} className={`rounded-full border px-3 py-1.5 text-xs ${group === code ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{label}</button>)}
   </div>
   <p className="text-xs leading-relaxed text-muted-foreground">
    Khoảng cách đường chim bay từ tọa độ tin đăng, không phải quãng đường hoặc thời gian di chuyển.
    {lastChecked && ` Dữ liệu thu thập: ${new Date(lastChecked).toLocaleString("vi-VN")}.`}
   </p>
   {validCoordinates(origin)
    ? <p className="text-xs text-muted-foreground">Chỉ đường từ địa chỉ đã lưu trong tài khoản của bạn đến tiện ích.</p>
    : authenticated
     ? <p className="text-xs text-muted-foreground">Chỉ đường cần tọa độ địa chỉ tài khoản. <a href="/settings/profile" className="text-primary underline">Cập nhật địa chỉ</a></p>
     : <p className="text-xs text-muted-foreground">Đăng nhập để chỉ đường từ địa chỉ tài khoản của bạn.</p>}
   {!complete && data && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Dữ liệu chưa phủ đủ phạm vi hoặc nhóm tiện ích đang chọn. Danh sách dưới đây chỉ gồm các địa điểm đã có dữ liệu.</p>}
   {error && <div className="flex items-center gap-3 text-sm"><p>{error}</p><button type="button" onClick={() => setAttempt(n => n + 1)} className="inline-flex items-center gap-1 text-primary"><RefreshCw size={14} />Thử lại</button></div>}
   {loading && <p className="text-sm text-muted-foreground" role="status">Đang tải tiện ích...</p>}
   {data && !loading && data.items.length === 0 && <p className="text-sm text-muted-foreground">Chưa tìm thấy địa điểm phù hợp trong dữ liệu hiện tại.</p>}
   {data && <ul className="divide-y divide-border">
    {data.items.map(place => {
     const directionsUrl = nearbyDirectionsUrl(origin, place);
     return <li key={place.id} className="flex items-start gap-3 py-3">
     <MapPin size={18} className="mt-1 shrink-0 text-primary" />
     <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{place.name}</p><p className="text-xs text-muted-foreground">{place.address}</p>
      <p className="mt-1 text-xs text-muted-foreground">{place.groups.map(g => NEARBY_GROUPS[g]).join(" · ")}</p></div>
     <div className="shrink-0 text-right"><p className="text-sm font-medium">{distance(place.distanceMeters)}</p>
      {directionsUrl
       ? <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary">Chỉ đường<ExternalLink size={12} /></a>
       : <button type="button" disabled={authenticated} onClick={login} title={authenticated ? "Cập nhật địa chỉ tài khoản để chỉ đường" : "Đăng nhập để chỉ đường"} className="mt-1 text-xs text-primary disabled:opacity-50">Chỉ đường</button>}</div>
    </li>;})}
   </ul>}
   {data && data.total > data.size && <div className="flex items-center justify-between text-sm">
    <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)} className="inline-flex items-center gap-1 disabled:opacity-40"><ChevronLeft size={16} />Trước</button>
    <span>Trang {page} / {Math.ceil(data.total / data.size)}</span>
    <button type="button" disabled={page * data.size >= data.total || loading} onClick={() => setPage(n => n + 1)} className="inline-flex items-center gap-1 disabled:opacity-40">Tiếp<ChevronRight size={16} /></button>
   </div>}
   {canMap && data && <button type="button" onClick={() => setShowMap(v => !v)} className="text-sm font-medium text-primary">{showMap ? "Ẩn bản đồ" : "Xem các địa điểm trên bản đồ"}</button>}
   {showMap && canMap && data && <NearbyMap latitude={latitude!} longitude={longitude!} radius={radius} places={data.items} />}
   {data && <p className="text-[11px] text-muted-foreground">Nguồn: © TomTom. Dữ liệu nguồn không xác nhận địa điểm đang hoạt động. Bản đồ chỉ hiển thị các địa điểm trên trang hiện tại.</p>}
  </section>
 );
}
