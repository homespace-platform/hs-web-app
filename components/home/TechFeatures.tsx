import { FileCheck, Sparkles, CheckCircle2, Shield, Brain, Lock, ArrowUpRight } from "lucide-react";

export default function TechFeatures() {
  return (
    <section id="tech-features" className="py-20 md:py-28 bg-[#F1F5F9]/70 dark:bg-[#0F172A] border-y border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#3B82F6] mb-3 font-heading">
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
          <div className="bg-white dark:bg-[#162032] rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-[#06B6D4] flex items-center justify-center shrink-0">
                  <FileCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#06B6D4] uppercase tracking-wider">
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
                  <CheckCircle2 className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
                  <span>Ký kết 100% online bảo mật bằng chữ ký số định danh</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
                  <span>Thanh toán và giữ cọc tự động qua Ví Escrow an toàn</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
                  <span>Lưu trữ dữ liệu vĩnh viễn trên sổ cái, dễ dàng tra cứu</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-[#06B6D4]">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Chuẩn mã hóa an toàn cao
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: AI Search & Price Valuation */}
          <div className="bg-white dark:bg-[#162032] rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center shrink-0">
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] uppercase tracking-wider">
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
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] shrink-0 mt-0.5" />
                  <span>Xử lý ngôn ngữ tự nhiên tiếng Việt chính xác và linh hoạt</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] shrink-0 mt-0.5" />
                  <span>Mô hình định giá AI theo thời gian thực giúp tránh thuê hớ</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6] shrink-0 mt-0.5" />
                  <span>Đề xuất khu vực và loại phòng tối ưu hóa theo ngân sách</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Mô hình dữ liệu cập nhật liên tục
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Trải nghiệm <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
