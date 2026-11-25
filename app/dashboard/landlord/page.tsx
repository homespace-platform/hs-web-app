import { Building2 } from "lucide-react";

export default function LandlordDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
          <Building2 aria-hidden className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Dashboard chủ nhà
        </h1>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">
          Trang thống kê dành cho chủ nhà đang được xây dựng…
        </p>
      </div>
    </div>
  );
}
