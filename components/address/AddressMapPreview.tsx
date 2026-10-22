type AddressMapPreviewProps = {
  latitude?: number | null;
  longitude?: number | null;
};

export default function AddressMapPreview({ latitude, longitude }: AddressMapPreviewProps) {
  if (typeof latitude !== "number" || typeof longitude !== "number"
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const coordinates = `${latitude},${longitude}`;
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(coordinates)}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Vị trí trên bản đồ</p>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          Mở Google Maps
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          key={coordinates}
          title="Vị trí địa chỉ trên bản đồ"
          width="100%"
          height="280"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="border-0"
          src={`${mapUrl}&z=16&output=embed`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Bản đồ hiển thị theo tọa độ của địa chỉ đã chọn, không tìm lại bằng tên đường.
      </p>
    </div>
  );
}
