type AddressMapPreviewProps = {
  fullAddress: string;
};

function mapsEmbedSrc(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export default function AddressMapPreview({ fullAddress }: AddressMapPreviewProps) {
  if (!fullAddress.trim()) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
        Xác nhận vị trí trên bản đồ
      </p>
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          key={fullAddress}
          title="Xác nhận vị trí địa chỉ"
          width="100%"
          height="280"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="border-0"
          src={mapsEmbedSrc(`${fullAddress}, Việt Nam`)}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Bản đồ chỉ để xem trước, không lưu tọa độ. Kiểm tra vị trí có đúng địa chỉ cho thuê không.
      </p>
    </div>
  );
}
