import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Mail,
  Globe,
  Share2,
} from "lucide-react";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark dark:focus-visible:ring-offset-card rounded-sm";

const LINK =
  `text-sm text-slate-300 hover:text-white transition-colors duration-150 ${FOCUS_RING}`;

const STORE_BTN =
  `flex items-center gap-3 px-4 min-h-11 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors duration-200 active:scale-[0.98] group ${FOCUS_RING}`;

const SOCIAL_BTN =
  `w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 transition-colors duration-200 active:scale-[0.98] ${FOCUS_RING}`;

const HEADING = "text-sm font-semibold text-white font-heading";

export default function Footer() {
  return (
    <footer className="bg-primary-dark dark:bg-card text-slate-100 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-5">
            <Link href="/" className={`flex items-center self-start group ${FOCUS_RING}`}>
              <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3.5 group-hover:bg-white/15 transition-colors duration-200 inline-flex items-center justify-center">
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

            <p className="text-sm text-slate-300 leading-6">
              Nền tảng PropTech tiên phong kết hợp sức mạnh Blockchain & AI mang
              lại sự minh bạch, bảo mật tuyệt đối và tìm kiếm thông minh cho thị
              trường nhà cho thuê.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck aria-hidden="true" className="w-4 h-4" />
                <span>Hợp đồng On-chain</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <Sparkles aria-hidden="true" className="w-4 h-4" />
                <span>AI Valuation</span>
              </div>
            </div>
          </div>

          {/* Column 2: Về HomeSpace */}
          <div className="flex flex-col gap-4">
            <h4 className={HEADING}>Về HomeSpace</h4>
            <nav className="flex flex-col gap-3">
              <Link href="#" className={LINK}>
                Về chúng tôi
              </Link>
              <Link href="/news" className={LINK}>
                Tin tức & Blog
              </Link>
              <Link href="/rent" className={LINK}>
                Dự án tiêu biểu
              </Link>
              <Link href="#" className={LINK}>
                Tuyển dụng & Sự nghiệp
              </Link>
              <Link href="#" className={LINK}>
                Báo chí đưa tin
              </Link>
            </nav>
          </div>

          {/* Column 3: Hỗ trợ khách hàng */}
          <div className="flex flex-col gap-4">
            <h4 className={HEADING}>Hỗ trợ khách hàng</h4>
            <nav className="flex flex-col gap-3">
              <Link href="#" className={LINK}>
                Chính sách bảo mật
              </Link>
              <Link href="#" className={LINK}>
                Điều khoản sử dụng
              </Link>
              <Link href="#" className={LINK}>
                Hướng dẫn đặt cọc Smart Contract
              </Link>
              <Link href="#" className={LINK}>
                Quy chuẩn thẩm định nhà ở
              </Link>
              <a
                href="mailto:homespace.platform.cskh@gmail.com"
                className={`${LINK} flex items-start gap-2 break-all`}
              >
                <Mail aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-cyan-300" />
                <span>homespace.platform.cskh@gmail.com</span>
              </a>
            </nav>
          </div>

          {/* Column 4: App Download & Social */}
          <div id="download-app" className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h4 className={HEADING}>Tải ứng dụng</h4>
              <p className="text-sm text-slate-300 leading-6">
                Tìm nhà và ký hợp đồng mọi lúc, mọi nơi ngay trên di động.
              </p>

              <div className="flex flex-col gap-3 pt-1">
                <a href="#" className={STORE_BTN}>
                  <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
                    <Image
                      src="/application/appstore.png"
                      alt="App Store"
                      width={28}
                      height={28}
                      unoptimized
                      className="w-7 h-7 object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase text-slate-300 leading-none font-medium">
                      Tải trên
                    </span>
                    <span className="text-sm font-semibold text-white leading-tight mt-0.5">
                      App Store
                    </span>
                  </div>
                </a>

                <a href="#" className={STORE_BTN}>
                  <div className="w-7 h-7 relative flex items-center justify-center shrink-0">
                    <Image
                      src="/application/googleplay.webp"
                      alt="Google Play"
                      width={28}
                      height={28}
                      unoptimized
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase text-slate-300 leading-none font-medium">
                      Khám phá trên
                    </span>
                    <span className="text-sm font-semibold text-white leading-tight mt-0.5">
                      Google Play
                    </span>
                  </div>
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className={HEADING}>Kết nối cộng đồng</h4>
              <div className="flex items-center gap-2">
                <a href="#" className={SOCIAL_BTN} aria-label="Website">
                  <Globe aria-hidden="true" className="w-4 h-4" />
                </a>
                <a href="#" className={SOCIAL_BTN} aria-label="Social Share">
                  <Share2 aria-hidden="true" className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 HomeSpace Inc. Nền tảng PropTech tiên phong Việt Nam.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="#" className={`hover:text-white transition-colors duration-150 ${FOCUS_RING}`}>
              Chính sách quyền riêng tư
            </Link>
            <Link href="#" className={`hover:text-white transition-colors duration-150 ${FOCUS_RING}`}>
              Điều khoản Dịch vụ
            </Link>
            <Link href="#" className={`hover:text-white transition-colors duration-150 ${FOCUS_RING}`}>
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
