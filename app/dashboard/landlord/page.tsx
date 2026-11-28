import LandlordDashboard from "@/components/dashboard/overview/LandlordDashboard";
import { DashboardAccess } from "@/components/dashboard/overview/SummaryUi";

export default function LandlordDashboardPage() {
  return (
    <DashboardAccess>
      <LandlordDashboard />
    </DashboardAccess>
  );
}
