import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import RecentListings from "@/components/home/RecentListings";
import PopularLocations from "@/components/home/PopularLocations";
import LocationMapExplorer from "@/components/home/LocationMapExplorer";
import LandlordCta from "@/components/home/LandlordCta";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Sticky Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        {/* 1. Hero & AI Search Section */}
        <HeroSection />

        {/* 2. Featured / Nearby Properties ("Nhà cho thuê quanh đây") */}
        <FeaturedProperties />

        {/* 3. Realtime Fresh Properties ("Tin cho thuê mới đăng") */}
        <RecentListings />

        {/* 4. Popular Cities Grid ("Nhà cho thuê theo khu vực") */}
        <PopularLocations />

        {/* 5. Interactive Price Explorer ("Tham khảo giá thuê nhà") */}
        <LocationMapExplorer />

        {/* 6. Landlord Call To Action Banner */}
        <LandlordCta />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
