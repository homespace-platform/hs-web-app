"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { contactLink, publicLinks } from "@/app/(public-info)/_content/navigation";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300";
const linkStyle = `inline-flex min-h-8 items-center rounded-sm text-sm leading-snug text-slate-300 hover:text-white hover:underline hover:underline-offset-4 ${focus}`;
const utilityStyle = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 text-sm font-medium text-slate-100 hover:bg-white/10 hover:text-white ${focus}`;
const { about, news, projects, careers, press, support, depositGuide, housingCriteria, privacy, terms } = publicLinks;
const aboutLinks = [about, news, projects, careers, press];
const helpLinks = [support, depositGuide, housingCriteria];
const legalLinks = [privacy, terms];
const stores = [
  { name: "App Store", icon: "/application/appstore.png" },
  { name: "Google Play", icon: "/application/googleplay.webp" },
];

export default function Footer() {
  const [store, setStore] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  async function shareHomeSpace() {
    const url = new URL("/", window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setShareUrl("");
      toast.success("Đã sao chép liên kết HomeSpace.");
    } catch {
      setShareUrl(url);
    }
  }

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 pb-9 sm:gap-x-10 lg:grid-cols-[1.25fr_0.85fr_1fr_1fr] lg:pb-12">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <Link href="/" className={`inline-flex items-center gap-3 ${focus}`}>
              <span className="grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10">
                <Image
                  src="/logo/homespace-vertical-logo-removebg-crop-removebg.png"
                  alt=""
                  width={30}
                  height={30}
                  unoptimized
                  className="size-[30px] object-contain brightness-0 invert"
                />
              </span>
              <span className="font-heading text-xl font-extrabold tracking-tight">HomeSpace</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">
              Dự án khoá luận về trải nghiệm tìm nhà cho thuê, từ xem tin đến tìm hiểu quy trình đặt cọc và ký hợp đồng.
            </p>
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold">Kết nối cộng đồng</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={contactLink.href} className={utilityStyle}>
                  <Mail aria-hidden="true" className="size-4" />
                  Liên hệ
                </Link>
                <Button type="button" variant="ghost" className={`${utilityStyle} cursor-pointer`} onClick={shareHomeSpace}>
                  <Share2 aria-hidden="true" className="size-4" />
                  Chia sẻ
                </Button>
              </div>
              {shareUrl && (
                <div className="mt-3 max-w-xs space-y-2">
                  <p role="status" className="text-sm text-slate-300">Hãy sao chép liên kết theo cách thủ công.</p>
                  <input
                    type="url"
                    aria-label="Liên kết trang chủ HomeSpace"
                    readOnly
                    value={shareUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    className={`w-full rounded-sm border border-white/20 bg-white/5 px-2 py-1 text-sm text-white ${focus}`}
                  />
                </div>
              )}
            </div>
          </div>

          <nav aria-label="Về HomeSpace" className="min-w-0">
            <h2 className="mb-2 font-heading text-sm font-bold">Về HomeSpace</h2>
            <ul>
              {aboutLinks.map(({ href, label }) => (
                <li key={href}><Link href={href} className={linkStyle}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Hỗ trợ khách hàng" className="min-w-0">
            <h2 className="mb-2 font-heading text-sm font-bold">Hỗ trợ khách hàng</h2>
            <ul>
              {helpLinks.map(({ href, label }) => (
                <li key={href}><Link href={href} className={linkStyle}>{label}</Link></li>
              ))}
            </ul>
          </nav>

          <section id="download-app" aria-labelledby="footer-app-title" className="col-span-2 min-w-0 scroll-mt-28 lg:col-span-1">
            <h2 id="footer-app-title" className="mb-3 font-heading text-sm font-bold">Ứng dụng di động</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {stores.map(({ name, icon }) => (
                <Button
                  key={name}
                  type="button"
                  variant="ghost"
                  className={`h-11 cursor-pointer justify-start rounded-xl border border-white/20 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white ${focus}`}
                  onClick={() => setStore(name)}
                >
                  <Image src={icon} alt="" width={21} height={21} unoptimized className="size-[21px] rounded object-contain" />
                  {name}
                </Button>
              ))}
            </div>
            <p role="status" className="mt-2 text-sm leading-snug text-sky-200">
              {store && <>Ứng dụng đang phát triển <span className="text-slate-300">({store})</span></>}
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 py-4 pr-16 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:pr-12">
          <p>© 2026 HomeSpace · Bản demo khoá luận</p>
          <nav aria-label="Chính sách và sơ đồ trang web">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:gap-x-6">
              {legalLinks.map(({ href, label }) => (
                <li key={href}><Link href={href} className={linkStyle}>{label}</Link></li>
              ))}
              <li>
                <a href="/sitemap.xml" className={`${linkStyle} gap-1.5`}>
                  Sơ đồ trang web <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
