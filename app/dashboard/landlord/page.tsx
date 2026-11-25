import { Building2 } from "lucide-react";

export default function LandlordDashboardPage() {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
        <Building2 aria-hidden className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Dashboard chủ nhà
      </h1>
    </div>
  );
}
