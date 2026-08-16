import { FileCheck, Sparkles, CheckCircle2, Shield, Brain, Lock, ArrowUpRight } from "lucide-react";

export default function TechFeatures() {
  return (
    <section id="tech-features" className="py-20 md:py-28 bg-[#F1F5F9]/60 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div
        className="absolute -top-24 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 font-heading">
            Công Nghệ Tiên Phong
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-4">
            Dành cho bạn
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Kiến tạo tiêu chuẩn mới cho thị trường nhà đất thông qua tự động hóa,
            hợp đồng thông minh và trí tuệ nhân tạo.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Card 1: Blockchain Smart Contracts */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                  <FileCheck className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    Web3 Security
                  </span>
                  <h3 className="font-heading font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                    Hợp đồng thông minh (Blockchain)
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Loại bỏ hoàn toàn rủi ro lừa đảo với hợp đồng điện tử được mã hóa
                trực tiếp trên mạng Blockchain. Mọi điều khoản minh bạch, không
                thể thay đổi và tự động thực thi khi đạt điều kiện.
              </p>

              {/* Checklist */}
              <ul className="space-y-3.5 mb-8">
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <span>Ký kết 100% online bảo mật bằng chữ ký số định danh</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <span>Thanh toán và giữ cọc tự động qua Ví Escrow an toàn</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <span>Lưu trữ dữ liệu vĩnh viễn trên sổ cái, dễ dàng tra cứu</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Chuẩn mã hóa cấp ngân hàng
              </span>
              <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: AI Search & Price Valuation */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Smart AI Match
                  </span>
                  <h3 className="font-heading font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                    AI Search & Phân tích giá
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Không còn mất hàng giờ lọc danh sách. Nhập nhu cầu bằng ngôn ngữ tự
                nhiên tiếng Việt, AI sẽ thấu hiểu ngữ cảnh, so sánh giá thị
                trường thực và tìm kiếm căn nhà hoàn hảo nhất.
              </p>

              {/* Checklist */}
              <ul className="space-y-3.5 mb-8">
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Xử lý ngôn ngữ tự nhiên tiếng Việt chính xác và linh hoạt</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Mô hình định giá AI theo thời gian thực giúp tránh thuê hớ</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Đề xuất khu vực và loại phòng tối ưu hóa theo ngân sách</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Mô hình dữ liệu cập nhật liên tục
              </span>
              <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                Trải nghiệm <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
