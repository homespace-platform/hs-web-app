"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

const CATEGORIES = [
  { id: "house", label: "Nhà nguyên căn" },
  { id: "apartment", label: "Căn hộ chung cư" },
  { id: "room", label: "Phòng trọ" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const HIGHLIGHTS = [
  "Dữ liệu thật từ tin đăng cho thuê",
  "Chi tiết đến quận, phường, đường",
  "Giá giao dịch thực tế",
  "Cập nhật hằng tháng",
];

export default function LocationMapExplorer() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("apartment");
  const { cityId, cityName } = useAppSelector((state) => state.location);

  const mapQuery = cityName?.trim()
    ? `${cityName}, Vietnam`
    : "Việt Nam";

  const handleViewPrice = () => {
    if (!cityId) {
      router.push("/rent");
      return;
    }
    router.push(`/rent?category=${encodeURIComponent(activeCategory)}`);
  };

  return (
    <section id="location-map" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col hs-reveal">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              Giá thị trường
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance text-foreground">
              Tham khảo giá thuê nhà
            </h2>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">
              Dùng khu vực đã chọn trên thanh điều hướng để xem giá thuê trên HomeSpace
            </p>

            <div
              role="group"
              aria-label="Loại nhà cho thuê"
              className="flex flex-wrap items-center gap-2 mt-8"
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`min-h-11 px-4 rounded-full text-sm font-semibold transition-colors duration-200 active:scale-[0.98] cursor-pointer ${FOCUS_RING} ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleViewPrice}
                className={`min-h-11 px-8 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-semibold text-sm sm:text-base shadow-sm transition-colors duration-200 active:scale-[0.98] flex items-center justify-center cursor-pointer ${FOCUS_RING}`}
              >
                Xem giá ngay
              </button>
            </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-foreground">
              {HIGHLIGHTS.map((text) => (
                <li key={text} className="flex items-start gap-2.5 leading-6">
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-4 h-4 mt-1 text-primary shrink-0"
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6 xl:col-span-7 rounded-3xl border border-border bg-card p-2 sm:p-3 shadow-sm overflow-hidden">
            <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[440px] rounded-2xl overflow-hidden bg-muted">
              <iframe
                title={`Bản đồ tham khảo giá ${cityName || "Việt Nam"}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=12&output=embed`}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
