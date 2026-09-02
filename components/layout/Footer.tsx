import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Mail,
  Globe,
  Share2,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#163b70] dark:bg-[#162032] text-slate-100 border-t border-primary-dark/80 dark:border-[#223147] transition-colors shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-14">
          {/* Brand Column */}
          <div className="flex flex-col gap-5">
            {/* Vertical Logo Badge */}
            <Link href="/" className="flex items-center self-start group">
              <div className="bg-white/10 dark:bg-[#1f2d47] border border-white/15 dark:border-[#2a3c5a] rounded-2xl px-5 py-3.5 hover:bg-white/15 dark:hover:bg-[#253655] transition-all inline-flex items-center justify-center shadow-sm">
                <Image
                  src="/logo/homespace-vertical-logo-removebg-crop-removebg.png"
                  alt="HomeSpace Logo"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain brightness-0 invert"
                />
              </div>
            </Link>

            <p className="text-sm text-slate-200 dark:text-slate-300 leading-relaxed">
              Nền tảng PropTech tiên phong kết hợp sức mạnh Blockchain & AI mang
              lại sự minh bạch, bảo mật tuyệt đối và tìm kiếm thông minh cho thị
              trường nhà cho thuê.
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-200 dark:text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Hợp đồng On-chain</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI Valuation</span>
              </div>
            </div>
          </div>

          {/* Column 2: Về HomeSpace */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-heading">
              Về HomeSpace
            </h4>
            <nav className="flex flex-col space-y-2.5 text-sm text-slate-200 dark:text-slate-300">
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Về chúng tôi
              </Link>
              <Link
                href="/news"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Tin tức & Blog
              </Link>
              <Link
                href="/rent"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Dự án tiêu biểu
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Tuyển dụng & Sự nghiệp
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Báo chí đưa tin
              </Link>
            </nav>
          </div>

          {/* Column 3: Hỗ trợ khách hàng */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-heading">
              Hỗ trợ khách hàng
            </h4>
            <nav className="flex flex-col space-y-2.5 text-sm text-slate-200 dark:text-slate-300">
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Chính sách bảo mật
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Điều khoản sử dụng
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Hướng dẫn đặt cọc Smart Contract
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Quy chuẩn thẩm định nhà ở
              </Link>
              <a
                href="mailto:homespace.platform.cskh@gmail.com"
                className="hover:text-cyan-300 transition-colors flex items-center gap-2 pt-1 text-slate-200 dark:text-slate-300"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>homespace.platform.cskh@gmail.com</span>
              </a>
            </nav>
          </div>

          {/* Column 4: App Download & Social */}
          <div id="download-app" className="flex flex-col gap-5">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest font-heading">
                Tải ứng dụng
              </h4>
              <p className="text-xs text-slate-300">
                Tìm nhà và ký hợp đồng mọi lúc, mọi nơi ngay trên di động.
              </p>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* App Store Button */}
                <a
                  href="#"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 dark:bg-[#1f2d47] border border-white/15 dark:border-[#2a3c5a] hover:bg-white/15 dark:hover:bg-[#253655] transition-all group shadow-xs"
                >
                  <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
                    <Image
                      src="/application/appstore.png"
                      alt="App Store"
                      width={28}
                      height={28}
                      unoptimized
                      className="w-7 h-7 object-contain rounded-lg group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase text-slate-300 leading-none font-medium">
                      Tải trên
                    </span>
                    <span className="text-sm font-bold text-white leading-tight mt-0.5">
                      App Store
                    </span>
                  </div>
                </a>

                {/* Google Play Button */}
                <a
                  href="#"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 dark:bg-[#1f2d47] border border-white/15 dark:border-[#2a3c5a] hover:bg-white/15 dark:hover:bg-[#253655] transition-all group shadow-xs"
                >
                  <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
                    <Image
                      src="/application/googleplay.webp"
                      alt="Google Play"
                      width={28}
                      height={28}
                      unoptimized
                      className="w-7 h-7 object-contain group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase text-slate-300 leading-none font-medium">
                      Khám phá trên
                    </span>
                    <span className="text-sm font-bold text-white leading-tight mt-0.5">
                      Google Play
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest font-heading">
                Kết nối cộng đồng
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 dark:bg-[#1f2d47] border border-white/15 dark:border-[#2a3c5a] flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 dark:hover:bg-[#253655] transition-colors"
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 dark:bg-[#1f2d47] border border-white/15 dark:border-[#2a3c5a] flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 dark:hover:bg-[#253655] transition-colors"
                  aria-label="Social Share"
                >
                  <Share2 className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/15 dark:border-[#223147] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300/80">
          <p>© 2026 HomeSpace Inc. Nền tảng PropTech tiên phong Việt Nam.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-white transition-colors">
              Chính sách quyền riêng tư
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Điều khoản Dịch vụ
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
