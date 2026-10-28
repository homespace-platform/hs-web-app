"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type * as Vietmap from "@vietmap/vietmap-gl-js";
import type { NearbyPlace } from "@/types/nearby.type";
import "@vietmap/vietmap-gl-js/dist/vietmap-gl.css";

export default function NearbyMap({latitude, longitude, radius, places}: {latitude: number; longitude: number; radius: number; places: NearbyPlace[]}) {
 const container = useRef<HTMLDivElement>(null), [error, setError] = useState(""), [ready, setReady] = useState(false);
 useEffect(() => {
  let cancelled = false;
  let cleanup: (() => void) | undefined;
  if (!ready) return;
  async function initialize() {
   try {
    // The published 6.0.1 bundle is UMD (no ESM package entry); Next Script loads its pinned browser build.
    const sdk = (window as unknown as {vietmapgl: typeof Vietmap}).vietmapgl;
    if (cancelled || !container.current) return;
    const map = new sdk.Map({container: container.current, center: [longitude, latitude], zoom: 13,
     style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${encodeURIComponent(process.env.NEXT_PUBLIC_VIETMAP_MAP_API_KEY ?? "")}`});
    cleanup = () => map.remove();
    new sdk.Marker({color: "#2563eb"}).setLngLat([longitude, latitude]).addTo(map);
    map.addControl(new sdk.NavigationControl(), "top-right");
    map.on("error", () => {if (!cancelled) setError("Bản đồ chưa tải được. Bạn vẫn có thể xem danh sách hoặc mở chỉ đường.");});
    map.on("load", () => {
     if (cancelled) return;
     map.addSource("nearby", {type: "geojson", cluster: true, clusterRadius: 40, data: {
      type: "FeatureCollection", features: places.map(p => ({type: "Feature", geometry: {type: "Point", coordinates: [p.longitude, p.latitude]},
       properties: {id: p.id, name: p.name}})),
     }});
     map.addLayer({id: "nearby-clusters", type: "circle", source: "nearby", filter: ["has", "point_count"], paint: {"circle-color": "#2563eb", "circle-radius": 19}});
     map.addLayer({id: "nearby-count", type: "symbol", source: "nearby", filter: ["has", "point_count"], layout: {"text-field": "{point_count_abbreviated}", "text-size": 12}, paint: {"text-color": "#fff"}});
     map.addLayer({id: "nearby-points", type: "circle", source: "nearby", filter: ["!", ["has", "point_count"]], paint: {"circle-color": "#16a34a", "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#fff"}});
     const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180, angle = radius / 6371008.8;
     const ring = Array.from({length: 65}, (_, i) => {
      const bearing = 2 * Math.PI * i / 64;
      const y = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
      const x = lon + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(y));
      return [x * 180 / Math.PI, y * 180 / Math.PI];
     });
     map.addSource("radius", {type: "geojson", data: {type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [ring]}}});
     map.addLayer({id: "radius-fill", type: "fill", source: "radius", paint: {"fill-color": "#2563eb", "fill-opacity": 0.06}}, "nearby-clusters");
     map.addLayer({id: "radius-line", type: "line", source: "radius", paint: {"line-color": "#2563eb", "line-width": 1}});
     map.on("click", "nearby-points", e => {
      const point = e.features?.[0];
      if (point?.geometry.type === "Point") new sdk.Popup().setLngLat(point.geometry.coordinates as [number, number]).setText(String(point.properties?.name ?? "")).addTo(map);
     });
     map.on("click", "nearby-clusters", e => {if (e.lngLat) map.easeTo({center: e.lngLat, zoom: map.getZoom() + 2});});
    });
   } catch {if (!cancelled) setError("Bản đồ chưa sẵn sàng. Bạn có thể mở chỉ đường từ danh sách.");}
  }
  void initialize();
  return () => {cancelled = true; cleanup?.();};
 }, [latitude, longitude, radius, places, ready]);
 return <div className="space-y-2"><Script src="https://unpkg.com/@vietmap/vietmap-gl-js@6.0.1/dist/vietmap-gl.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError("Bản đồ chưa sẵn sàng. Bạn có thể mở chỉ đường từ danh sách.")} /><div ref={container} className="h-96 overflow-hidden rounded-xl" aria-label="Bản đồ tiện ích xung quanh" />{error && <p className="text-xs text-muted-foreground">{error}</p>}</div>;
}
