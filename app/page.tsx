import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import TechFeatures from "@/components/home/TechFeatures";
import PopularLocations from "@/components/home/PopularLocations";
import LocationMapExplorer from "@/components/home/LocationMapExplorer";
import LandlordCta from "@/components/home/LandlordCta";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Top Sticky Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        {/* 1. Hero & AI Search Section */}
        <HeroSection />

        {/* 2. Featured / Nearby Properties ("Nhà đất quanh đây") */}
        <FeaturedProperties />

        {/* 3. Tech & Security Value Proposition ("Dành cho bạn") */}
        <TechFeatures />

        {/* 4. Popular Cities Grid ("Khu vực nổi bật") */}
        <PopularLocations />

        {/* 5. Interactive Map Explorer ("Khám phá theo khu vực") */}
        <LocationMapExplorer />

        {/* 6. Landlord Call To Action Banner */}
        <LandlordCta />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
