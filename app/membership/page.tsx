import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MembershipPricingWorkspace from "@/components/membership/MembershipPricingWorkspace";

export const metadata = {
  title: "Gói hội viên & Lượt đăng tin - HomeSpace",
  description: "Bảng giá gói lượt đăng tin cho thuê dành cho chủ nhà trên HomeSpace",
};

export default function PublicMembershipPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <MembershipPricingWorkspace />
      </main>
      <Footer />
    </div>
  );
}
