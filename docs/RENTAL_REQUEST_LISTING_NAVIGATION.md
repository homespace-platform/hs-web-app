# Xem tin đăng từ yêu cầu thuê

- Từ ảnh, tiêu đề hoặc “Xem bài đăng” trên danh sách yêu cầu thuê, đi thẳng tới `/rent/{id}`. Trong chi tiết yêu cầu thuê cũng dùng cùng liên kết; không mở ListingPreviewModal. Áp dụng cho cả chủ nhà và người thuê.
- Giữ nguyên quyền đọc hiện có ở Core `ListingQueryService.getById`: tin active PUBLISHED/RESERVED được xem công khai; tin không công khai chỉ chủ tin hoặc người có yêu cầu thuê liên quan được xem. Yêu cầu liên quan bao gồm lịch sử theo chính sách hiện tại của Core, không chỉ ACCEPTED. Tin đã xóa/inactive không được trả về. Không thêm quyền quản trị hoặc quyền chỉnh sửa cho người thuê.
- Khách gọi endpoint public; người đăng nhập gọi endpoint kiểm quyền bằng danh tính phiên đăng nhập. Không coi gọi API thành công là chủ tin, không truyền userId/ownerId trên URL để cấp quyền, không fallback qua API khác khi bị từ chối.
- Chờ khởi tạo đăng nhập, không tái dùng nội dung riêng tư khi đổi tài khoản/đăng xuất/chuyển ID; lỗi kết nối cho phép thử lại, không giả thành 404. Chỉ ghi lượt xem/lịch sử công khai.
- Tin không còn nhận khách không hiện CTA gửi yêu cầu thuê mới; lịch xem mới và thương lượng bị chặn trên UI. API nghiệp vụ vẫn là lớp kiểm tra cuối cùng.

Kiểm chứng: 32 ca `ListingQueryServiceTest` gồm toàn bộ 10 trạng thái cho owner, người thuê liên quan, khách và người không liên quan; 172 ca web đạt, có test đường dẫn và endpoint, không fallback khi bị từ chối, render read-only. TypeScript, ESLint các tệp thay đổi và build web đã kiểm tra. Không thay đổi dữ liệu DB hay chính sách quyền đọc của Core.
