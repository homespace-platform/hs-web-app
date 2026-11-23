"use client";

import { usePathname } from "next/navigation";
import Breadcrumb, { type BreadcrumbItem } from "@/components/common/Breadcrumb";
import { SETTINGS_SECTIONS } from "./settings-nav";

export default function SettingsBreadcrumb({ className }: { className?: string }) {
  const segment = usePathname()?.split("/")[2];
  const section = SETTINGS_SECTIONS.find((s) => s.id === segment);
  const items: BreadcrumbItem[] = [{ label: "Trang chủ", href: "/" }];
  if (section) {
    items.push({ label: "Cài đặt", href: "/settings" }, { label: section.label });
  } else {
    items.push({ label: "Cài đặt" });
  }
  return <Breadcrumb items={items} className={className} />;
}
