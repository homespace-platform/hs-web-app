# Kiểm tra thông báo trên web client

## 1. Firebase Web app

Trong Firebase Console, mở đúng project đang dùng bởi `hs-notification-service`. Vào **Project settings → Your apps** và tạo hoặc chọn một **Web app**. Sao chép cấu hình SDK công khai vào `hs-web-app/.env` theo tên trong `.env.example`: `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`. Không dùng các trường service-account JSON để thay cho cấu hình Web app.

Trong **Project settings → Cloud Messaging → Web Push certificates**, tạo key pair nếu chưa có và sao chép **public key** vào `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. Không đưa private VAPID key hoặc service-account JSON vào web app. `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL=http://localhost:8085` dùng khi chạy local; socket kết nối trực tiếp tới notification service. Khởi động lại Next.js sau khi sửa env.

## 2. Bật nhận thông báo

Đăng nhập client, vào **Cài đặt → Thông báo**, bấm **Bật thông báo trình duyệt** và chấp nhận quyền của Chrome/Edge. Chỉ nút này xin quyền, website không tự bật khi mở trang. Khi đăng ký hoàn tất, trang hiện **Đã bật thông báo đẩy**. Browser lưu mã cài đặt và proof trong localStorage; backend chỉ lưu hash proof. Nhấn **Tắt trên trình duyệt này** để hủy đăng ký. Đăng xuất cũng hủy thiết bị trên backend trước khi rời trang.

`localhost` được coi là secure context. Khi truy cập từ máy khác hoặc môi trường triển khai, cần HTTPS. Mỗi browser/profile cần bật riêng. Nếu trình duyệt đã chặn quyền, thay đổi quyền trong cài đặt trình duyệt rồi thử lại. Để kiểm tra push khi đóng tab, dùng Chrome/Edge **profile thường**, không dùng cửa sổ ẩn danh; chế độ ẩn danh có thể không hỗ trợ FCM. Socket.IO vẫn có thể kiểm tra trong tab ẩn danh đang mở.

## 3. Kiểm tra hai chế độ

1. Mở web client trên `http://localhost:3000`, đăng nhập tài khoản USER và để tab mở. Admin tạo thông báo. Badge và danh sách tải lại ngay qua Socket.IO; Firebase foreground chỉ làm tín hiệu đồng bộ, không hiện thêm popup trùng.
2. Sau khi trạng thái đăng ký push thành công, đóng **toàn bộ tab** của web client; giữ Chrome/Edge chạy và cho phép thông báo ở hệ điều hành. Admin tạo thông báo khác. Trình duyệt hiển thị push chung “Bạn có thông báo mới.”; bấm vào mở `/notifications` và web tải nội dung thật qua API.
3. Nếu push không hiện, kiểm tra `PUSH_ENABLED=true` trên backend, trạng thái permission, thiết bị có active trong MongoDB, các bản ghi `notification_deliveries`, và cấu hình Web app/VAPID có cùng Firebase project với backend.

Socket.IO chỉ hoạt động khi trang đang mở. Push có thể hoạt động khi đã đóng tab, tùy trình duyệt và hệ điều hành. Lịch sử vẫn được lưu ở MongoDB và tải qua REST khi mở lại trang. Thông báo push chỉ mang nội dung chung để tránh lộ dữ liệu trên trình duyệt dùng chung.
