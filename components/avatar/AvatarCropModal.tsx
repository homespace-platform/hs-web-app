"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { LoaderCircle, X } from "lucide-react";
import { createCroppedAvatar } from "@/lib/image/crop-image";

type AvatarCropModalProps = {
  imageUrl: string;
  originalFileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
};

export default function AvatarCropModal({
  imageUrl,
  originalFileName,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !processing) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, processing]);

  async function handleConfirm() {
    if (!croppedArea || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const avatar = await createCroppedAvatar(
        imageUrl,
        croppedArea,
        originalFileName,
      );
      await onConfirm(avatar);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Không thể xử lý ảnh đại diện.",
      );
      setProcessing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="avatar-crop-title" className="font-bold text-foreground">
              Điều chỉnh ảnh đại diện
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kéo ảnh và phóng to để chọn vùng hiển thị.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-80 bg-black sm:h-96">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Thu nhỏ</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label="Độ phóng đại"
            />
            <span className="text-xs font-semibold text-muted-foreground">Phóng to</span>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="h-10 rounded-xl border border-border px-5 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!croppedArea || processing}
              className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-opacity disabled:opacity-60"
            >
              {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {processing ? "Đang tải lên..." : "Lưu ảnh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
