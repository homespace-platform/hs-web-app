import Link from "next/link";
import { POPULAR_LOCATIONS } from "@/data/home-data";
import { MapPin } from "lucide-react";

export default function PopularLocations() {
  return (
    <section id="popular-locations" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="mb-8 md:mb-12">
        <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2">
          Khu vực nổi bật
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Khám phá bất động sản tại các thành phố trọng điểm phát triển mạnh mẽ
          nhất.
        </p>
      </div>

      {/* Locations 4x2 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {POPULAR_LOCATIONS.map((city) => (
          <Link
            key={city.id}
            href={`#city-${city.slug}`}
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden h-48 sm:h-60 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            {/* City Image */}
            <img
              src={city.imageUrl}
              alt={city.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading="lazy"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

            {/* Bottom Content */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <h3 className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors drop-shadow-sm line-clamp-1">
                {city.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{city.listingCount}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
