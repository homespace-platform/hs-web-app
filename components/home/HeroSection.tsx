"use client";

import * as React from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import AiSearchBar from "./AiSearchBar";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    image: "/banner/banner-01.png",
    alt: "HomeSpace Banner 1 - Nền tảng PropTech Blockchain & AI",
  },
  {
    id: 2,
    image: "/banner/banner-02.png",
    alt: "HomeSpace Banner 2 - Thuê nhà an toàn, hợp đồng thông minh",
  },
];

export default function HeroSection() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const [plugin] = React.useState(() =>
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) plugin.stop();
  }, [plugin]);

  return (
    <section className="relative w-full flex flex-col items-center overflow-hidden">
      {/* 1. Full-Width 100% Banner Carousel */}
      <div className="w-full relative group">
        <Carousel
          setApi={setApi}
          plugins={[plugin]}
          opts={{
            loop: true,
            align: "start",
          }}
          className="w-full overflow-hidden"
        >
          <CarouselContent className="-ml-0">
            {BANNERS.map((banner, index) => (
              <CarouselItem key={banner.id} className="pl-0 basis-full">
                {/* 1920x600 = 16:5, so the fixed ratio matches the art and avoids layout shift */}
                <div className="relative w-full aspect-[16/5]">
                  <Image
                    src={banner.image}
                    alt={banner.alt}
                    width={1920}
                    height={600}
                    priority={index === 0}
                    unoptimized
                    className="h-full w-full block object-cover select-none"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Arrows */}
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 hidden sm:block">
            <CarouselPrevious className="left-6 h-12 w-12 cursor-pointer border-border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-card active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
            <CarouselNext className="right-6 h-12 w-12 cursor-pointer border-border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-card active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
          </div>

          {/* Pagination Indicators - Placed above the search bar */}
          <div className="absolute bottom-20 sm:bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 flex items-center z-10 bg-slate-900/50 px-2 rounded-full border border-white/15">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                className="group/dot flex h-6 min-w-6 items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Chuyển tới banner ${index + 1}`}
                aria-current={current === index ? "true" : undefined}
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${current === index
                    ? "w-6 bg-primary dark:bg-accent-ai"
                    : "w-2 bg-white/60 group-hover/dot:bg-white"
                    }`}
                />
              </button>
            ))}
          </div>
        </Carousel>
      </div>

      {/* Floating search bar and trust badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-16 sm:-mt-20 md:-mt-24 lg:-mt-28 relative z-20 flex flex-col items-center mb-8">
        <div
          className="hs-fade-up w-full max-w-6xl rounded-3xl border border-border bg-card p-2 shadow-lg shadow-slate-900/5 sm:p-3"
          style={{ animationDelay: "0ms" }}
        >
          <AiSearchBar />
        </div>

        <ul
          className="hs-fade-up mt-6 flex w-full max-w-4xl flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3"
          style={{ animationDelay: "120ms" }}
        >
          <li className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-verified/10"><ShieldCheck className="h-4 w-4 text-verified" /></span>
            <span>Hợp đồng số hóa 100% On-chain</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-ai/10"><Sparkles className="h-4 w-4 text-accent-ai" /></span>
            <span>Định giá & Phân tích AI chuẩn xác</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><Zap className="h-4 w-4 text-primary" /></span>
            <span>Đặt cọc an toàn</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
