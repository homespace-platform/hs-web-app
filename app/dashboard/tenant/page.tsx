import TenantDashboard from "@/components/dashboard/overview/TenantDashboard";
import { DashboardAccess } from "@/components/dashboard/overview/SummaryUi";

export default function TenantDashboardPage() {
  return (
    <DashboardAccess>
      <TenantDashboard />
    </DashboardAccess>
  );
}
