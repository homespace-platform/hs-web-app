import RentalRequestsManagement from "@/components/rental-request/RentalRequestsManagement";

export const metadata = {
  title: "Yêu cầu thuê từ khách | HomeSpace",
  description: "Quản lý và xét duyệt các yêu cầu thuê nhà từ khách thuê gửi đến bài đăng của bạn.",
};

export default function RentalRequestsReceivedPage() {
  return <RentalRequestsManagement mode="RECEIVED" />;
}
