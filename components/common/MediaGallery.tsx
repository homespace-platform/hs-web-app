"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LoaderCircle,
  Play,
  Video,
  X,
} from "lucide-react";

export interface MediaGalleryItem {
  id?: string;
  type?: "image" | "video";
  url: string;
  streamUrl?: string;
  alt?: string;
}

export interface MediaLightboxPrimaryAction {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onAction: (item: MediaGalleryItem, index: number) => void | Promise<void>;
  isVisible?: (item: MediaGalleryItem, index: number) => boolean;
  isDisabled?: (item: MediaGalleryItem, index: number) => boolean;
}

export interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaGalleryItem[];
  initialIndex?: number;
  title?: string;
  alwaysShowThumbnails?: boolean;
  primaryAction?: MediaLightboxPrimaryAction;
}

/**
 * Fullscreen Lightbox Modal
 * Tái sử dụng để xem chi tiết ảnh/video cho Listing, User Avatar Profile, v.v.
 */
export function MediaLightboxModal({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
  title = "Chi tiết hình ảnh",
  alwaysShowThumbnails = false,
  primaryAction,
}: MediaLightboxModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);
  const total = mediaItems.length;

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(
        initialIndex >= 0 && initialIndex < total ? initialIndex : 0
      );
    }
  }, [isOpen, initialIndex, total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || total === 0) return null;

  const currentItem = mediaItems[selectedIndex] || mediaItems[0];
  const isVideo = currentItem.type === "video";
  const showPrimaryAction =
    primaryAction &&
    (primaryAction.isVisible?.(currentItem, selectedIndex) ?? true);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 text-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide shrink-0">
            {isVideo ? "Video" : "Ảnh"} {selectedIndex + 1} / {total}
          </span>
          <h2 className="text-sm font-medium text-white/80 truncate hidden sm:block">
            {title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Đóng (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Center Stage with Prev / Next */}
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
          {isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                key={currentItem.streamUrl || currentItem.url}
                src={currentItem.streamUrl || currentItem.url}
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
                src={currentItem.url}
                alt={currentItem.alt || `${title} - ảnh ${selectedIndex + 1}`}
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

      {showPrimaryAction && (
        <div className="flex justify-center px-4 pb-3">
          <button
            type="button"
            onClick={() => primaryAction.onAction(currentItem, selectedIndex)}
            disabled={
              primaryAction.loading ||
              (primaryAction.isDisabled?.(currentItem, selectedIndex) ?? false)
            }
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryAction.loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{primaryAction.loadingLabel ?? "Đang xử lý..."}</span>
              </>
            ) : (
              <span>{primaryAction.label}</span>
            )}
          </button>
        </div>
      )}

      {/* 3. Bottom Thumbnail Strip */}
      {(alwaysShowThumbnails || total > 1) && (
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center overflow-x-auto gap-2.5 max-w-full no-scrollbar">
          {mediaItems.map((item, idx) => {
            const isActive = idx === selectedIndex;
            const itemIsVideo = item.type === "video";

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
                {itemIsVideo ? (
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
                    alt={item.alt || `Thumbnail ${idx + 1}`}
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
  );
}

export interface MediaGalleryProps {
  title: string;
  mediaItems: MediaGalleryItem[];
  categoryLabel?: string;
  className?: string;
}

/**
 * Gallery hiển thị dạng lưới Collage (1, 2, 3, 4, 5+ ảnh)
 * kèm Lightbox Modal xem chi tiết hình ảnh & video.
 */
export default function MediaGallery({
  title,
  mediaItems,
  className = "",
}: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const total = mediaItems.length;

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  if (total === 0) return null;

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  const renderMediaCell = (
    item: MediaGalleryItem,
    index: number,
    extraClasses = "",
    sizes = "50vw"
  ) => {
    const isVideo = item.type === "video";

    return (
      <button
        type="button"
        key={item.id || `${item.url}-${index}`}
        onClick={() => handleOpen(index)}
        aria-label={`Xem ${isVideo ? "video" : "ảnh"} ${index + 1}`}
        className={`relative block w-full text-left group overflow-hidden cursor-pointer bg-muted/60 select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none ${extraClasses}`}
      >
        {isVideo ? (
          <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
            <video
              src={`${item.streamUrl || item.url}#t=0.5`}
              preload="metadata"
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500"
            />
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
            alt={`${title} - ${index + 1}`}
            fill
            sizes={sizes}
            className="object-cover transition-[transform,filter] duration-500 group-hover:scale-[1.03] group-hover:brightness-95"
            priority={index === 0}
            unoptimized
          />
        )}
      </button>
    );
  };

  // Desktop collage: main photo ~2/3 width; 2-4 items use a 3-col grid (max 3 cells), 5+ a 4-col grid (max 5 cells).
  const isWide = total >= 5;
  const shownCount = isWide ? 5 : Math.min(total, 3);
  const hiddenCount = total - shownCount;
  const desktopItems = mediaItems.slice(0, shownCount);
  const desktopSpan = (index: number) => {
    if (index === 0) return total === 1 ? "col-span-3 row-span-2" : "col-span-2 row-span-2";
    return total === 2 ? "row-span-2" : "";
  };
  const hasVideo = mediaItems.some((m) => m.type === "video");
  const viewAllLabel = `Xem tất cả ${total} ${hasVideo ? "ảnh & video" : "ảnh"}`;

  return (
    <section
      aria-label="Thư viện hình ảnh"
      className={`relative w-full select-none ${className}`}
    >
      {/* Mobile: swipe carousel */}
      <Carousel setApi={setCarouselApi} opts={{ loop: total > 1 }} className="sm:hidden overflow-hidden rounded-2xl">
        <CarouselContent className="ml-0">
          {mediaItems.map((item, index) => (
            <CarouselItem key={item.id || `${item.url}-${index}`} className="pl-0">
              {renderMediaCell(item, index, "aspect-[4/3]", "100vw")}
            </CarouselItem>
          ))}
        </CarouselContent>
        {total > 1 && (
          <span
            aria-live="polite"
            className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md tabular-nums"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            {currentSlide + 1}/{total}
          </span>
        )}
      </Carousel>

      {/* Tablet & desktop: collage grid */}
      <div className={`relative hidden sm:grid ${isWide ? "grid-cols-4" : "grid-cols-3"} grid-rows-2 gap-2 h-[340px] md:h-[400px] lg:h-[460px] overflow-hidden rounded-3xl`}>
        {desktopItems.map((item, index) => {
          const sizes = index === 0 ? "66vw" : "33vw";
          if (index === shownCount - 1 && hiddenCount > 0) {
            return (
              <div key={item.id || `${item.url}-${index}`} className={`relative ${desktopSpan(index)}`}>
                {renderMediaCell(item, index, "h-full", sizes)}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 font-heading text-2xl font-semibold text-white">
                  +{hiddenCount}
                </span>
              </div>
            );
          }
          return renderMediaCell(item, index, `h-full ${desktopSpan(index)}`, sizes);
        })}
        {total > 1 && (
          <button
            type="button"
            onClick={() => handleOpen(0)}
            className="absolute bottom-4 left-4 z-10 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/60 bg-white/95 px-3 text-xs md:text-sm font-semibold text-slate-900 shadow-md backdrop-blur-md transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <LayoutGrid className="h-4 w-4 text-primary" aria-hidden="true" />
            {viewAllLabel}
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={selectedIndex !== null}
        onClose={handleClose}
        mediaItems={mediaItems}
        initialIndex={selectedIndex ?? 0}
        title={title}
        alwaysShowThumbnails={false}
      />
    </section>
  );
}
