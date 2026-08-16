import { PlusCircle, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandlordCta() {
  return (
    <section id="landlord-cta" className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="bg-primary-dark dark:bg-card rounded-3xl p-8 sm:p-12 md:p-14 text-white border border-primary-dark/80 dark:border-border shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-accent-ai text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dành Riêng Cho Chủ Nhà & Nhà Môi Giới</span>
          </div>

          {/* Title */}
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-3 leading-tight">
            Bạn là chủ nhà? Đăng tin và quản lý bằng Blockchain ngay.
          </h2>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Tiếp cận hàng ngàn khách thuê tiềm năng đã xác thực danh tính. Quản lý
            hợp đồng tự động, nhận thanh toán cọc an toàn và minh bạch qua Ví điện tử.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-10">
            <Button
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 h-auto rounded-full shadow-md transition-all text-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Đăng tin ngay
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold px-8 py-3 h-auto rounded-full transition-all text-sm cursor-pointer"
            >
              Tìm hiểu thêm
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* 3 Quick Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left w-full pt-8 border-t border-white/15">
            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="p-2 rounded-xl bg-primary/30 text-accent-ai shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">0% Rủi ro bùng cọc</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Tiền cọc được khóa bảo chứng trong Smart Contract.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="p-2 rounded-xl bg-primary/30 text-accent-ai shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ký hợp đồng tức thì</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Tạo và ký hợp đồng thuê chỉ trong 2 phút online.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="p-2 rounded-xl bg-primary/30 text-accent-ai shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Khách thuê định danh</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  100% hồ sơ khách thuê đã KYC xác minh danh tính.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
