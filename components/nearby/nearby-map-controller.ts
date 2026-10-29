import type * as Vietmap from "@vietmap/vietmap-gl-js";
import type { NearbyGroup, NearbyPlace } from "@/types/nearby.type";
import { NEARBY_GROUPS } from "@/types/nearby.type";
import { nearbyDirectionsUrl, validCoordinates } from "@/lib/nearby-directions";
import { nearbyColor, nearbyDistance, nearbyRadiusRing } from "@/lib/nearby-presentation";

export type NearbyMapData = {
  places: NearbyPlace[];
  selectedId: string | null;
  activeGroup: NearbyGroup | "";
  startIndex: number;
  onSelect: (id: string) => void;
};

type VietmapSdk = Pick<typeof Vietmap, "Map" | "Marker" | "Popup" | "LngLatBounds" | "NavigationControl">;

export function nearbyMapErrorMessage(error: unknown) {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (status === 423 || status === 429 || /your request is limited/i.test(message)) {
    return "VietMap đang giới hạn lượt tải bản đồ. Vui lòng thử lại sau.";
  }
  if (status === 401 || status === 403) {
    return "VietMap chưa cho phép tải bản đồ. Vui lòng kiểm tra quyền sử dụng bản đồ và tên miền của API key.";
  }
  return "Không tải được nền bản đồ VietMap. Bạn vẫn có thể xem danh sách và chỉ đường.";
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return ("name" in error && error.name === "AbortError")
    || ("message" in error && error.message === "AbortError");
}

function onDisposedResourceError(event: { error?: unknown }) {
  // VietMap 6.0.1 detaches Style/Source parents before their aborted requests settle.
  // Keep this handler on those disposed objects; only cancellation is expected.
  if (!isAbortError(event.error)) console.error(event.error);
}

export function createNearbyMap(sdk: VietmapSdk, container: HTMLDivElement, options: {
  latitude: number; longitude: number; radius: number; apiKey: string;
  onError: (message: string) => void; onReady: () => void;
}) {
  const { latitude, longitude, radius } = options;
  const map = new sdk.Map({
    container, center: [longitude, latitude], zoom: 14,
    style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${encodeURIComponent(options.apiKey)}`,
  });
  const markers = new Map<string, { marker: Vietmap.Marker; button: HTMLButtonElement; offset: [number, number] }>();
  let data: NearbyMapData | undefined, selectedId: string | null = null, popup: Vietmap.Popup | undefined;
  let removed = false, resourceFailed = false;
  const listing = new sdk.Marker({ color: "#2563eb" })
    .setLngLat([longitude, latitude])
    .setPopup(new sdk.Popup({ offset: 25 }).setText("Vị trí bài đăng"))
    .addTo(map);
  map.addControl(new sdk.NavigationControl({ showCompass: false }), "top-right");
  map.scrollZoom.disable();

  function select(id: string | null, move: boolean) {
    popup?.remove();
    popup = undefined;
    selectedId = id;
    markers.forEach(({ button }, key) => {
      button.setAttribute("aria-pressed", String(key === id));
      button.style.boxShadow = key === id ? "0 0 0 4px #bfdbfe, 0 2px 8px #0004" : "0 2px 8px #0004";
      button.style.zIndex = key === id ? "10" : "1";
    });
    const place = data?.places.find(p => p.id === id && validCoordinates(p));
    if (!place) return;
    const content = document.createElement("div");
    content.className = "nearby-map-popup";
    const name = document.createElement("strong");
    name.textContent = place.name;
    const address = document.createElement("p");
    address.textContent = place.address ?? "";
    const detail = document.createElement("p");
    detail.textContent = `${nearbyDistance(place.distanceMeters)} · ${place.groups.map(g => NEARBY_GROUPS[g]).join(" · ")}`;
    content.append(name, address, detail);
    const url = nearbyDirectionsUrl({ latitude, longitude }, place);
    if (url) {
      const link = document.createElement("a");
      link.textContent = "Chỉ đường ↗";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      content.append(link);
    }
    // Provider names and addresses are text, never HTML.
    popup = new sdk.Popup({ offset: popupOffset(place.id), maxWidth: "260px", focusAfterOpen: false })
      .setLngLat([place.longitude, place.latitude]).setDOMContent(content).addTo(map);
    if (move) map.flyTo({ center: [place.longitude, place.latitude], zoom: Math.max(map.getZoom(), 18), duration: 550 });
  }

  function popupOffset(id: string): [number, number] {
    const [x, y] = markers.get(id)?.offset ?? [0, 0];
    return [x, y - 24];
  }

  function showAll() {
    const bounds = new sdk.LngLatBounds([longitude, latitude], [longitude, latitude]);
    data?.places.filter(validCoordinates).forEach(p => bounds.extend([p.longitude, p.latitude]));
    map.fitBounds(bounds, { padding: 100, maxZoom: 18, duration: 350 });
  }

  function renderMarkers() {
    if (removed || !data) return;
    markers.forEach(({ marker }) => marker.remove());
    markers.clear();
    // Reserve the listing pin too. Offsets only move labels in pixels, never POI coordinates.
    const occupied: Array<{ x: number; y: number }> = [map.project([longitude, latitude])];
    data.places.forEach((place, index) => {
      if (!validCoordinates(place)) return;
      const screen = map.project([place.longitude, place.latitude]);
      let offset: [number, number] = [0, 0];
      placement: for (let ring = 0; ring <= occupied.length; ring++) {
        const slots = Math.max(1, ring * 6);
        for (let slot = 0; slot < slots; slot++) {
          const angle = slot * 2 * Math.PI / slots - Math.PI / 2;
          const x = ring * 42 * Math.cos(angle), y = ring * 42 * Math.sin(angle);
          if (occupied.every(p => Math.hypot(p.x - screen.x - x, p.y - screen.y - y) >= 41.9)) {
            offset = [x, y];
            break placement;
          }
        }
      }
      occupied.push({ x: screen.x + offset[0], y: screen.y + offset[1] });
      const button = document.createElement("button");
      button.type = "button";
      const number = data!.startIndex + index + 1;
      button.className = "nearby-map-marker";
      button.textContent = String(number);
      button.title = `${number}. ${place.name}`;
      button.setAttribute("aria-label", `Xem ${number}. ${place.name}`);
      button.style.backgroundColor = nearbyColor(place.groups, data!.activeGroup);
      if (Math.hypot(...offset) > 1) {
        const leader = document.createElement("span");
        leader.className = "nearby-map-marker-leader";
        leader.setAttribute("aria-hidden", "true");
        leader.style.width = `${Math.hypot(...offset)}px`;
        leader.style.transform = `rotate(${Math.atan2(-offset[1], -offset[0])}rad)`;
        button.append(leader);
      }
      button.addEventListener("click", () => {
        select(place.id, true);
        data?.onSelect(place.id);
      });
      const marker = new sdk.Marker({ element: button, anchor: "center" })
        .setLngLat([place.longitude, place.latitude]).setOffset(offset).addTo(map);
      markers.set(place.id, { marker, button, offset });
    });
    markers.forEach(({ button }, id) => {
      button.setAttribute("aria-pressed", String(id === selectedId));
      button.style.boxShadow = id === selectedId ? "0 0 0 4px #bfdbfe, 0 2px 8px #0004" : "0 2px 8px #0004";
      button.style.zIndex = id === selectedId ? "10" : "1";
    });
    if (popup && selectedId && markers.has(selectedId)) popup.setOffset(popupOffset(selectedId));
  }

  const onLoad = () => {
    if (removed) return;
    map.addSource("nearby-radius", { type: "geojson", data: {
      type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [nearbyRadiusRing(latitude, longitude, radius)] },
    } });
    map.addLayer({ id: "nearby-radius-fill", type: "fill", source: "nearby-radius", paint: { "fill-color": "#2563eb", "fill-opacity": 0.06 } });
    map.addLayer({ id: "nearby-radius-line", type: "line", source: "nearby-radius", paint: { "line-color": "#2563eb", "line-width": 1.5, "line-dasharray": [3, 3] } });
    if (!resourceFailed) options.onReady();
  };
  const onError = (event: { error?: unknown }) => {
    if (!removed && !isAbortError(event.error)) {
      resourceFailed = true;
      options.onError(nearbyMapErrorMessage(event.error));
    }
  };
  map.on("load", onLoad);
  map.on("error", onError);
  map.on("moveend", renderMarkers);
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { if (!removed) { map.resize(); renderMarkers(); } });
  observer?.observe(container);

  return {
    update(next: NearbyMapData) {
      if (removed) return;
      const changed = data?.places !== next.places || data?.activeGroup !== next.activeGroup || data?.startIndex !== next.startIndex;
      const moved = selectedId !== next.selectedId;
      data = next;
      if (changed || moved) renderMarkers();
      if (changed) showAll();
      select(next.selectedId, moved && !changed);
    },
    showAll,
    remove() {
      if (removed) return;
      removed = true;
      observer?.disconnect();
      popup?.remove();
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      listing.remove();
      map.off("load", onLoad);
      map.off("moveend", renderMarkers);
      const style = map.style;
      if (style) {
        style.on("error", onDisposedResourceError);
        Object.values(style.sourceCaches).forEach(cache => {
          cache.on("error", onDisposedResourceError);
        });
      }
      try {
        map.remove();
      } finally {
        map.off("error", onError);
      }
    },
  };
}
