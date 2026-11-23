"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ImageOff,
  LoaderCircle,
  Play,
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
  onIndexChange?: (index: number) => void;
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
  onIndexChange,
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

  useEffect(() => {
    if (isOpen) onIndexChange?.(selectedIndex);
  }, [isOpen, selectedIndex, onIndexChange]);

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

/** Ảnh có skeleton khi đang tải và trạng thái lỗi khi URL hỏng. */
function GalleryImage({
  src,
  alt,
  sizes,
  priority,
  contain = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  contain?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  if (status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        <span className="text-xs font-medium">Không tải được ảnh</span>
      </div>
    );
  }

  return (
    <>
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted motion-reduce:animate-none" aria-hidden="true" />
      )}
      {contain && (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes="64px"
          unoptimized
          className="h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`${contain ? "object-contain" : "object-cover"} transition-opacity duration-300 motion-reduce:transition-none ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const navButtonClass = `absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md transition-[transform,background-color] duration-200 hover:bg-white active:scale-95 ${focusRing}`;

/**
 * Gallery dạng carousel: một ảnh chính (vuốt / kéo / prev-next / phím mũi tên),
 * dải thumbnail bên dưới, đồng bộ chỉ số với Lightbox toàn màn hình.
 */
export default function MediaGallery({
  title,
  mediaItems,
  className = "",
}: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const total = mediaItems.length;

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrent(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Keep the active thumbnail centred by scrolling the strip only (never the page).
  useEffect(() => {
    const thumb = thumbRefs.current[current];
    const strip = thumb?.parentElement;
    if (!thumb || !strip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [current]);

  const handleLightboxIndex = useCallback(
    (index: number) => carouselApi?.scrollTo(index, true),
    [carouselApi]
  );

  if (total === 0) return null;

  const hasMany = total > 1;
  const itemKey = (item: MediaGalleryItem, index: number) => item.id || `${item.url}-${index}`;

  return (
    <section aria-label="Thư viện hình ảnh" className={`relative w-full ${className}`}>
      <div className="relative">
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: hasMany, duration: 25 }}
          className="overflow-hidden rounded-2xl bg-slate-950"
        >
          <CarouselContent className="-ml-0">
            {mediaItems.map((item, index) => {
              const isVideo = item.type === "video";
              return (
                <CarouselItem
                  key={itemKey(item, index)}
                  aria-label={`${index + 1} / ${total}`}
                  className="basis-full pl-0"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Phóng to ${isVideo ? "video" : "ảnh"} ${index + 1}`}
                    tabIndex={index === current ? 0 : -1}
                    className={`group relative block aspect-[16/10] w-full cursor-pointer overflow-hidden bg-slate-950 ${focusRing} focus-visible:ring-inset`}
                  >
                    {isVideo ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                        <video
                          src={`${item.streamUrl || item.url}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-black/40" />
                        <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg transition-transform duration-200 group-hover:scale-105">
                          <Play className="h-7 w-7 translate-x-0.5 fill-current" aria-hidden="true" />
                        </span>
                      </div>
                    ) : (
                      <GalleryImage
                        src={item.url}
                        alt={item.alt || `${title} - ảnh ${index + 1}`}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        priority={index === 0}
                        contain
                      />
                    )}
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => carouselApi?.scrollPrev()}
              aria-label="Ảnh trước"
              className={`${navButtonClass} left-3`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => carouselApi?.scrollNext()}
              aria-label="Ảnh tiếp theo"
              className={`${navButtonClass} right-3`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        <span
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold tabular-nums text-white"
        >
          {current + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => setLightboxIndex(current)}
          className={`absolute bottom-3 right-3 z-10 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-900 shadow-md transition-colors hover:bg-white active:scale-[0.98] ${focusRing}`}
        >
          <Expand className="h-4 w-4" aria-hidden="true" />
          Toàn màn hình
        </button>
      </div>

      {hasMany && (
        <div className="relative mt-3 flex gap-2 overflow-x-auto p-1 no-scrollbar" role="group" aria-label="Danh sách ảnh thu nhỏ">
          {mediaItems.map((item, index) => {
            const isVideo = item.type === "video";
            const isActive = index === current;
            return (
              <button
                key={itemKey(item, index)}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                type="button"
                onClick={() => carouselApi?.scrollTo(index)}
                aria-label={`Xem ${isVideo ? "video" : "ảnh"} ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted transition-[opacity,box-shadow] duration-200 ${focusRing} focus-visible:ring-offset-background ${isActive ? "opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"}`}
              >
                {isVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <video
                      src={`${item.streamUrl || item.url}#t=0.5`}
                      preload="metadata"
                      muted
                      playsInline
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                    <Play className="relative h-5 w-5 fill-white text-white" aria-hidden="true" />
                  </div>
                ) : (
                  <GalleryImage src={item.url} alt="" sizes="96px" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <MediaLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        mediaItems={mediaItems}
        initialIndex={lightboxIndex ?? 0}
        title={title}
        alwaysShowThumbnails={false}
        onIndexChange={handleLightboxIndex}
      />
    </section>
  );
}
