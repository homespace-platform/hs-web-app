import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Globe,
  Share2,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0F172A] text-white border-t border-slate-800 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div
        className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-14">
          {/* Brand Column */}
          <div className="flex flex-col gap-5">
            <Link href="/" className="flex items-center self-start group">
              <div className="rounded-xl p-1.5 shadow-md group-hover:scale-105 transition-transform duration-200">
                <Image
                  src="/homespace-horizontal-logo-crop-removebg.png"
                  alt="HomeSpace Logo"
                  width={160}
                  height={42}
                  unoptimized
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed">
              Nền tảng PropTech tiên phong kết hợp sức mạnh Blockchain & AI mang
              lại sự minh bạch, bảo mật tuyệt đối và tìm kiếm thông minh cho thị
              trường bất động sản.
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Hợp đồng On-chain</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI Valuation</span>
              </div>
            </div>
          </div>

          {/* Column 2: Về HomeSpace */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-heading">
              Về HomeSpace
            </h4>
            <nav className="flex flex-col gap-2.5 text-sm text-slate-400">
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Về chúng tôi
              </Link>
              <Link
                href="#"
                className="hover:text-white transition-colors hover:translate-x-0.5 duration-150"
              >
                Tin tức & Blog
              </Link>
              <Link
                href="#"
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

          {/* Column 3: Hỗ trợ */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-heading">
              Hỗ trợ khách hàng
            </h4>
            <nav className="flex flex-col gap-2.5 text-sm text-slate-400">
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
                Quy chuẩn thẩm định BĐS
              </Link>
              <a
                href="mailto:support@homespace.vn"
                className="hover:text-cyan-400 transition-colors flex items-center gap-2 pt-1 text-slate-300"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>support@homespace.vn</span>
              </a>
            </nav>
          </div>

          {/* Column 4: App Download & Social */}
          <div id="download-app" className="flex flex-col gap-5">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-heading">
                Tải ứng dụng
              </h4>
              <p className="text-xs text-slate-400">
                Tìm nhà và ký hợp đồng mọi lúc, mọi nơi ngay trên di động.
              </p>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* App Store Button */}
                <a
                  href="#"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700/80 hover:border-slate-600 transition-all group"
                >
                  <Smartphone className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-slate-400 leading-none">
                      Tải trên
                    </span>
                    <span className="text-sm font-bold text-white leading-tight">
                      App Store
                    </span>
                  </div>
                </a>

                {/* Google Play Button */}
                <a
                  href="#"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700/80 hover:border-slate-600 transition-all group"
                >
                  <Smartphone className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-slate-400 leading-none">
                      Khám phá trên
                    </span>
                    <span className="text-sm font-bold text-white leading-tight">
                      Google Play
                    </span>
                  </div>
                </a>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-heading">
                Kết nối cộng đồng
              </h4>
              <div className="flex gap-2.5">
                <a
                  href="#"
                  aria-label="Website"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="Share"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2026 HomeSpace Inc. Nền tảng PropTech tiên phong Blockchain & AI.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-slate-400 transition-colors">
              Chính sách quyền riêng tư
            </Link>
            <Link href="#" className="hover:text-slate-400 transition-colors">
              Điều khoản dịch vụ
            </Link>
            <Link href="#" className="hover:text-slate-400 transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
