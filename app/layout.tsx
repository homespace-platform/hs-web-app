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
    "Nền tảng PropTech tiên phong kết hợp AI & Blockchain. Minh bạch, an toàn tuyệt đối và tìm kiếm thông minh cá nhân hóa.",
  keywords: [
    "HomeSpace",
    "Bất động sản",
    "Thuê căn hộ",
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
      className={`${montserrat.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
