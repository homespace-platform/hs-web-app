"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Play,
  Video,
  X,
} from "lucide-react";
import type { RentMediaItem } from "@/types/rent.type";

interface RentMediaGalleryProps {
  title: string;
  mediaItems: RentMediaItem[];
  categoryLabel?: string;
}

export default function RentMediaGallery({
  title,
  mediaItems,
  categoryLabel,
}: RentMediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const total = mediaItems.length;

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + total) % total));
  }, [total]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % total));
  }, [total]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedIndex, handlePrev, handleNext]);

  // Helper renderer for a single media thumbnail in the grid
  const renderMediaCell = (item: RentMediaItem, index: number, extraClasses = "") => {
    const isVideo = item.type === "video";

    return (
      <div
        key={item.id || `${item.url}-${index}`}
        onClick={() => handleOpen(index)}
        className={`relative group overflow-hidden cursor-pointer bg-muted/60 select-none ${extraClasses}`}
      >
        {isVideo ? (
          <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
            {/* Preview frame thực tế của Video */}
            <video
              src={`${item.streamUrl || item.url}#t=0.5`}
              preload="metadata"
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500"
            />

            {/* Gradient phủ mờ nhẹ để nổi bật nút Play */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/40 group-hover:via-black/25 transition-colors duration-300 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 backdrop-blur-xs">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
              <span className="text-white text-xs font-semibold px-3 py-1 rounded-full bg-black/60 backdrop-blur-md shadow-md">
                Xem Video
              </span>
            </div>
            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-md z-10">
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </div>
          </div>
        ) : (
          <Image
            src={item.url}
            alt={`${title} - ảnh ${index + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300 pointer-events-none" />
      </div>
    );
  };

  return (
    <section className="mb-10 sm:mb-12">
      {/* ── 1. ADAPTIVE MEDIA GRID (NO BLANK SPACE) ── */}
      {total === 0 ? (
        <div className="relative h-[280px] sm:h-[340px] rounded-2xl overflow-hidden bg-muted flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
          <Camera className="w-12 h-12 opacity-35 mb-2" />
          <span className="text-sm font-medium">Chưa có hình ảnh hoặc video đăng tải</span>
        </div>
      ) : total === 1 ? (
        /* 1 ITEM: Full width banner */
        <div className="relative h-[360px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-muted shadow-xs">
          {renderMediaCell(mediaItems[0], 0, "w-full h-full")}
          {categoryLabel && (
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-semibold backdrop-blur-md pointer-events-none">
              {categoryLabel}
            </div>
          )}
        </div>
      ) : total === 2 ? (
        /* 2 ITEMS: 50% / 50% split */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-muted shadow-xs">
          {renderMediaCell(mediaItems[0], 0, "w-full h-full")}
          {renderMediaCell(mediaItems[1], 1, "w-full h-full")}
        </div>
      ) : total === 3 ? (
        /* 3 ITEMS: 2/3 width on left, 2 stacked on right (Fixes Screenshot 3 empty gap) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-muted shadow-xs">
          {/* Left item takes 2 columns (66% width) */}
          <div className="md:col-span-2 h-full">
            {renderMediaCell(mediaItems[0], 0, "w-full h-full")}
          </div>
          {/* Right column has 2 stacked rows (33% width, each 50% height) */}
          <div className="md:col-span-1 grid grid-rows-2 gap-2 h-full">
            {renderMediaCell(mediaItems[1], 1, "w-full h-full")}
            {renderMediaCell(mediaItems[2], 2, "w-full h-full")}
          </div>
        </div>
      ) : total === 4 ? (
        /* 4 ITEMS: Left 50% full height, Top Right full width, Bottom Right 2 side-by-side (Fixes Screenshot 1 empty gap) */
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-muted shadow-xs">
          {/* Item 0: Left 50% full height */}
          <div className="md:col-span-2 md:row-span-2 h-full">
            {renderMediaCell(mediaItems[0], 0, "w-full h-full")}
          </div>
          {/* Item 1: Top right spanning full right width (col-span-2, row-span-1) */}
          <div className="md:col-span-2 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[1], 1, "w-full h-full")}
          </div>
          {/* Item 2: Bottom right left (col-span-1, row-span-1) */}
          <div className="md:col-span-1 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[2], 2, "w-full h-full")}
          </div>
          {/* Item 3: Bottom right right (col-span-1, row-span-1) */}
          <div className="md:col-span-1 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[3], 3, "w-full h-full")}
          </div>
        </div>
      ) : (
        /* 5+ ITEMS: Classic 1 big on left (2x2), 4 items on right (2x2) */
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[360px] sm:h-[440px] md:h-[500px] rounded-2xl overflow-hidden bg-muted shadow-xs">
          <div className="md:col-span-2 md:row-span-2 h-full">
            {renderMediaCell(mediaItems[0], 0, "w-full h-full")}
          </div>
          <div className="hidden md:block md:col-span-1 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[1], 1, "w-full h-full")}
          </div>
          <div className="hidden md:block md:col-span-1 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[2], 2, "w-full h-full")}
          </div>
          <div className="hidden md:block md:col-span-1 md:row-span-1 h-full">
            {renderMediaCell(mediaItems[3], 3, "w-full h-full")}
          </div>
          <div className="hidden md:block md:col-span-1 md:row-span-1 h-full relative">
            {renderMediaCell(mediaItems[4], 4, "w-full h-full")}
            {total > 5 && (
              <div
                onClick={() => handleOpen(4)}
                className="absolute inset-0 bg-slate-950/50 hover:bg-slate-950/40 flex items-center justify-center cursor-pointer transition-colors duration-200 z-10"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-900/90 px-4 py-2 text-xs font-bold text-foreground shadow-lg backdrop-blur-md">
                  <Camera className="w-4 h-4 text-primary" />
                  Xem tất cả {total} ảnh & video
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. FULLSCREEN LIGHTBOX / MODAL ── */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 text-white z-20">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide">
                {mediaItems[selectedIndex].type === "video" ? "Video" : "Ảnh"}{" "}
                {selectedIndex + 1} / {total}
              </span>
              <h2 className="text-sm font-medium text-white/80 truncate hidden sm:block">
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Stage with Prev / Next buttons */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            {/* Prev Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 sm:left-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 backdrop-blur-md border border-white/10 cursor-pointer shadow-xl"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Media Content */}
            <div className="relative w-full h-full max-w-5xl max-h-[75vh] flex items-center justify-center">
              {mediaItems[selectedIndex].type === "video" ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    key={mediaItems[selectedIndex].streamUrl || mediaItems[selectedIndex].url}
                    src={mediaItems[selectedIndex].streamUrl || mediaItems[selectedIndex].url}
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload"
                    className="max-h-[75vh] max-w-full rounded-xl shadow-2xl bg-black"
                  >
                    Trình duyệt của bạn không hỗ trợ phát video HTML5.
                  </video>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={mediaItems[selectedIndex].url}
                    alt={`${title} - ảnh ${selectedIndex + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
              )}
            </div>

            {/* Next Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 sm:right-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 backdrop-blur-md border border-white/10 cursor-pointer shadow-xl"
                title="Ảnh sau (Mũi tên phải)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {total > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center overflow-x-auto gap-2.5 max-w-full">
              {mediaItems.map((item, idx) => {
                const isActive = idx === selectedIndex;
                const isVideo = item.type === "video";

                return (
                  <button
                    key={item.id || `${item.url}-${idx}`}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden shrink-0 transition-all duration-200 cursor-pointer border ${
                      isActive
                        ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-black scale-105 opacity-100"
                        : "border-white/20 opacity-60 hover:opacity-90"
                    }`}
                  >
                    {isVideo ? (
                      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                        <video
                          src={`${item.streamUrl || item.url}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
