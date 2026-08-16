"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  ChevronRight,
  ArrowRight,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { POPULAR_LOCATIONS } from "@/data/home-data";

export default function LocationMapExplorer() {
  const [selectedCityId, setSelectedCityId] = useState("hcm");

  const selectedCity =
    POPULAR_LOCATIONS.find((c) => c.id === selectedCityId) ||
    POPULAR_LOCATIONS[0];

  const mapTabs = [
    { id: "hcm", name: "TP. Hồ Chí Minh" },
    { id: "hn", name: "Hà Nội" },
    { id: "dn", name: "Đà Nẵng" },
    { id: "ct", name: "Cần Thơ" },
    { id: "bd", name: "Bình Dương" },
  ];

  return (
    <section id="location-map" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2">
            Khám phá theo khu vực
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Tìm kiếm nhà cho thuê trực quan trên bản đồ theo vị trí bạn mong
            muốn.
          </p>
        </div>

        <Link
          href="#explore-all-map"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors group self-start sm:self-auto"
        >
          <span>Mở bản đồ toàn màn hình</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Interactive Map Component (2/3) */}
        <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-md relative h-[420px] sm:h-[500px] bg-slate-100 dark:bg-slate-900 flex flex-col">
          {/* Top City Pill Filter Tabs */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {mapTabs.map((tab) => {
              const isActive = selectedCityId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCityId(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm backdrop-blur-md transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-blue-600/30 ring-2 ring-white/80 dark:ring-slate-900"
                      : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white"
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Map Visual / Imagery Container */}
          <div className="relative w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
              alt="Bản đồ tương tác khu vực"
              className="w-full h-full object-cover"
            />
            {/* Map styling gradient overlays */}
            <div className="absolute inset-0 bg-blue-950/20 backdrop-filter" />

            {/* Simulated Animated Map Pins */}
            <div className="absolute top-1/3 left-1/3 z-10 group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75" />
                <div className="relative px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg flex items-center gap-1 border-2 border-white">
                  <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                  <span>15 tr/th</span>
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 z-10 group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75" />
                <div className="relative px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-1 border-2 border-cyan-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>18 tr/th</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-1/3 right-1/4 z-10 group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <div className="relative px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg flex items-center gap-1 border-2 border-white">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>22 tr/th</span>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-1 flex flex-col">
                <button
                  type="button"
                  aria-label="Zoom in"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />
                <button
                  type="button"
                  aria-label="Zoom out"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                aria-label="Vị trí của tôi"
                className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 transition-colors"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active City Card & District List (1/3) */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-md flex flex-col h-full justify-between">
            <div>
              {/* City Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                  <MapPin className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                    {selectedCity.name}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {selectedCity.listingCount}
                  </p>
                </div>
              </div>

              {/* City Search Button */}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 h-auto rounded-xl shadow-md shadow-blue-600/20 mb-6 gap-2">
                <Search className="w-4 h-4" />
                <span>Tìm kiếm tại {selectedCity.name}</span>
              </Button>

              {/* Popular Districts */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 font-heading">
                  Khu vực trọng điểm
                </p>

                <div className="space-y-1.5">
                  {(selectedCity.districts || [
                    "Quận 1",
                    "Quận 7",
                    "Thủ Đức",
                    "Bình Thạnh",
                    "Quận 2",
                  ]).map((district, idx) => (
                    <Link
                      key={idx}
                      href={`#district-${district}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 transition-colors group"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {district}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 text-center">
              Dữ liệu giá thuê được AI cập nhật theo thời gian thực
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
