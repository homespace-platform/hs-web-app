import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const metadata = {
  title: "Bảng điều khiển - HomeSpace",
  description: "Trung tâm quản lý tin đăng, giao dịch và vận hành của người dùng",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
