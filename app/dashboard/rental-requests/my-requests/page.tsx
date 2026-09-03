import RentalRequestsManagement from "@/components/rental-request/RentalRequestsManagement";

export const metadata = {
  title: "Yêu cầu thuê tôi đã gửi | HomeSpace",
  description: "Theo dõi tiến độ xét duyệt và giữ chỗ cho các yêu cầu thuê nhà bạn đã gửi.",
};

export default function RentalRequestsSentPage() {
  return <RentalRequestsManagement mode="SENT" />;
}
