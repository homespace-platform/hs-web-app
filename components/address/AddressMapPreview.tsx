type AddressMapPreviewProps = {
  latitude?: number | null;
  longitude?: number | null;
  compact?: boolean;
};

export default function AddressMapPreview({ latitude, longitude, compact = false }: AddressMapPreviewProps) {
  if (typeof latitude !== "number" || typeof longitude !== "number"
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const coordinates = `${latitude},${longitude}`;
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}`;

  return (
    <div className={compact ? "overflow-hidden rounded-xl border border-border bg-card" : "space-y-2"}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? "border-b border-border bg-muted/30 px-3 py-2" : ""}`}>
        <p className={compact ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>{compact ? "Vị trí bài đăng" : "Vị trí trên bản đồ"}</p>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          Mở Google Maps
        </a>
      </div>
      <div className={compact ? "overflow-hidden" : "overflow-hidden rounded-xl border border-border"}>
        <iframe
          key={coordinates}
          title="Vị trí địa chỉ trên bản đồ"
          width="100%"
          height={compact ? 160 : 280}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="block border-0"
          src={`${mapUrl}&z=16&output=embed`}
        />
      </div>
      {!compact && <p className="text-[11px] text-muted-foreground">
        Bản đồ hiển thị theo tọa độ của địa chỉ đã chọn, không tìm lại bằng tên đường.
      </p>}
    </div>
  );
}
