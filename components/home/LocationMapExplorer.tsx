"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { rentHrefFromLocation } from "@/lib/rent-filter-state";

const CATEGORIES = [
  { id: "house", label: "Nhà nguyên căn" },
  { id: "apartment", label: "Căn hộ chung cư" },
  { id: "room", label: "Phòng trọ" },
];

export default function LocationMapExplorer() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("apartment");
  const { cityId, cityName, wardId } = useAppSelector((state) => state.location);

  const mapQuery = cityName?.trim()
    ? `${cityName}, Vietnam`
    : "Việt Nam";

  const handleViewPrice = () => {
    if (!cityId) {
      router.push("/rent");
      return;
    }
    const href = rentHrefFromLocation(cityId, wardId);
    const separator = href.includes("?") ? "&" : "?";
    router.push(`${href}${separator}category=${encodeURIComponent(activeCategory)}`);
  };

  return (
    <section
      id="location-map"
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 lg:p-10 border border-border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col">
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight mb-2">
              Tham khảo giá thuê nhà
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-2xl">
              Dùng khu vực đã chọn trên thanh điều hướng để xem giá thuê trên HomeSpace
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-6">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-8">
              <button
                type="button"
                onClick={handleViewPrice}
                className="h-[52px] px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all flex items-center justify-center cursor-pointer"
              >
                Xem giá ngay
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs sm:text-sm text-foreground font-semibold">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Dữ liệu thật từ tin đăng cho thuê</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Chi tiết đến quận, phường, đường</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Giá giao dịch thực tế</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Cập nhật hằng tháng</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 xl:col-span-5 relative w-full h-[280px] sm:h-[340px] lg:h-[380px] rounded-2xl sm:rounded-3xl overflow-hidden border border-border shadow-md bg-muted">
            <iframe
              title={`Bản đồ tham khảo giá ${cityName || "Việt Nam"}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=12&output=embed`}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
