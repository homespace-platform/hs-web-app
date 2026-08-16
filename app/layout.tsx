import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import Providers from "@/components/auth/Providers";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HomeSpace - Tìm Nơi Ở Lý Tưởng Với Sức Mạnh AI & Blockchain",
  description:
    "Nền tảng PropTech tiên phong kết hợp AI & Blockchain. Minh bạch, an toàn tuyệt đối và tìm kiếm nhà cho thuê thông minh cá nhân hóa.",
  keywords: [
    "HomeSpace",
    "Nhà cho thuê",
    "Thuê căn hộ",
    "Thuê phòng trọ",
    "Blockchain",
    "AI Search",
    "PropTech",
    "Hợp đồng thông minh",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${montserrat.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
