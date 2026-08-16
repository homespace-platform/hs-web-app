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

  const plugin = React.useRef(
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

  return (
    <section className="relative w-full flex flex-col items-center overflow-hidden">
      {/* 1. Full-Width 100% Banner Carousel */}
      <div className="w-full relative group">
        <Carousel
          setApi={setApi}
          plugins={[plugin.current]}
          opts={{
            loop: true,
            align: "start",
          }}
          className="w-full overflow-hidden"
        >
          <CarouselContent className="-ml-0">
            {BANNERS.map((banner, index) => (
              <CarouselItem key={banner.id} className="pl-0 basis-full">
                <div className="relative w-full">
                  <Image
                    src={banner.image}
                    alt={banner.alt}
                    width={1920}
                    height={600}
                    priority={index === 0}
                    unoptimized
                    className="w-full h-auto block object-cover select-none"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation Arrows */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
            <CarouselPrevious className="left-6 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 shadow-xl h-12 w-12 cursor-pointer" />
            <CarouselNext className="right-6 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 shadow-xl h-12 w-12 cursor-pointer" />
          </div>

          {/* Pagination Indicators - Placed above the search bar */}
          <div className="absolute bottom-20 sm:bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-slate-900/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${current === index
                  ? "w-7 h-2 bg-[#2563EB] dark:bg-[#06B6D4]"
                  : "w-2 h-2 bg-white/60 hover:bg-white"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </div>

      {/* 2. Floating AI Search Bar (Gối 1/2 chiều cao lên banner) & Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-16 sm:-mt-20 md:-mt-24 lg:-mt-28 relative z-20 flex flex-col items-center mb-8">
        <div className="w-full max-w-4xl shadow-2xl rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800">
          <AiSearchBar />
        </div>

        {/* 3. Trust Badges */}
        <div className="mt-8 pt-4 w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-4 text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span>Hợp đồng số hóa 100% On-chain</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#06B6D4] shrink-0" />
            <span>Định giá & Phân tích AI chuẩn xác</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-2 col-span-2 md:col-span-1">
            <Zap className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>Đặt cọc an toàn</span>
          </div>
        </div>
      </div>
    </section>
  );
}
