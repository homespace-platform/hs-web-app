import Link from "next/link";
import { PlusCircle, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandlordCta() {
  return (
    <section
      id="landlord-cta"
      className="py-20 md:py-28 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden px-4 sm:px-6 lg:px-8"
    >
      {/* Dynamic Background Glows */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-200 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dành Riêng Cho Chủ Nhà & Nhà Môi Giới</span>
        </div>

        {/* Title */}
        <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white tracking-tight mb-6 leading-tight max-w-3xl">
          Bạn là chủ nhà? Đăng tin và quản lý bằng Blockchain ngay.
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Tiếp cận hàng ngàn khách thuê tiềm năng đã xác thực danh tính. Quản lý
          hợp đồng tự động, nhận thanh toán cọc an toàn và minh bạch qua Ví điện tử.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-12">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-blue-700 font-bold px-8 py-6 h-auto rounded-xl shadow-xl shadow-blue-950/20 hover:scale-105 transition-all text-base"
          >
            <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
            Đăng tin ngay
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white border-2 border-white/80 font-bold px-8 py-6 h-auto rounded-xl transition-all text-base"
          >
            Tìm hiểu thêm
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* 3 Quick Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full pt-8 border-t border-white/15">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10 text-cyan-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">0% Rủi ro bùng cọc</h4>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Tiền cọc được khóa bảo chứng trong Smart Contract.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10 text-cyan-300 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Ký hợp đồng tức thì</h4>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Tạo và ký hợp đồng thuê chỉ trong 2 phút online.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10 text-cyan-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Khách thuê định danh</h4>
              <p className="text-xs text-blue-100/80 mt-0.5">
                100% hồ sơ khách thuê đã KYC xác minh danh tính.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
