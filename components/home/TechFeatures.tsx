import { FileCheck, Sparkles, CheckCircle2, Shield, Brain, Lock, ArrowUpRight } from "lucide-react";

export default function TechFeatures() {
  return (
    <section id="tech-features" className="py-14 md:py-20 bg-muted/50 border-y border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-2 font-heading">
            Công Nghệ Tiên Phong
          </span>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight mb-3">
            Dành cho bạn
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Kiến tạo tiêu chuẩn mới cho thị trường nhà cho thuê thông qua tự động hóa,
            hợp đồng thông minh và trí tuệ nhân tạo.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Card 1: Blockchain Smart Contracts */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 lg:p-10 border border-border shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent-ai/10 text-accent-ai flex items-center justify-center shrink-0">
                  <FileCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-accent-ai uppercase tracking-wider block">
                    Web3 Security
                  </span>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-card-foreground">
                    Hợp đồng thông minh (Blockchain)
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                Loại bỏ hoàn toàn rủi ro lừa đảo với hợp đồng điện tử được mã hóa
                trực tiếp trên mạng Blockchain. Mọi điều khoản minh bạch, không
                thể thay đổi và tự động thực thi khi đạt điều kiện.
              </p>

              {/* Checklist */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-xs sm:text-sm text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent-ai shrink-0 mt-0.5" />
                  <span>Ký kết 100% online bảo mật bằng chữ ký số định danh</span>
                </li>
                <li className="flex items-start gap-3 text-xs sm:text-sm text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent-ai shrink-0 mt-0.5" />
                  <span>Lưu trữ dữ liệu vĩnh viễn trên sổ cái, dễ dàng tra cứu</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-accent-ai">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Chuẩn mã hóa an toàn cao
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: AI Search & Price Valuation */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 lg:p-10 border border-border shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Smart AI Match
                  </span>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-card-foreground">
                    AI Search & Phân tích giá
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                Không còn mất hàng giờ lọc danh sách. Nhập nhu cầu bằng ngôn ngữ tự
                nhiên tiếng Việt, AI sẽ thấu hiểu ngữ cảnh, so sánh giá thị
                trường thực và tìm kiếm căn nhà hoàn hảo nhất.
              </p>

              {/* Checklist */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-xs sm:text-sm text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                  <span>Xử lý ngôn ngữ tự nhiên tiếng Việt chính xác và linh hoạt</span>
                </li>
                <li className="flex items-start gap-3 text-xs sm:text-sm text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-0.5" />
                  <span>Mô hình định giá AI theo thời gian thực giúp tránh thuê hớ</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
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
