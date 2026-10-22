# Xem và xử lý đề nghị bắt đầu sớm trên danh sách

- Hai màn Yêu cầu thuê hiển thị đề nghị mới nhất: ngày cũ → ngày mới, trạng thái tiếng Việt, hạn phản hồi theo giờ Việt Nam. Chủ nhà thấy nổi bật “Có đề nghị bắt đầu sớm cần xử lý”; người thuê thấy “Chờ chủ nhà duyệt”. Các đề nghị đã quyết định/hết hạn vẫn có thể mở lại để xem lịch sử.
- Nút mở modal riêng, không mở chi tiết hồ sơ. Chủ nhà duyệt/từ chối; người thuê xem/rút hoặc gửi đề nghị mới nếu Core cho phép. Modal tải lại trạng thái, kiểm tra đúng người tham gia/vai trò, chặn bấm lặp và khóa thao tác khi không xác định được kết quả mới nhất. Core là nơi quyết định quyền và hạn thực tế.
- Chấp nhận ngày 25/10 thay cho 01/11 đổi cả ngày bắt đầu, ngày kết thúc và kỳ hóa đơn. Không chỉ ký trước rồi đợi ngày cũ. Giữ nguyên cọc/số tháng/đơn giá; bản nháp vẫn chỉ tự tạo sau đủ tiền. Không tự ký.
- API danh sách thêm `latestStartChange`, truy vấn gộp theo các rental ID thuộc trang đã phân quyền, không gọi refresh từng dòng và không cập nhật nghiệp vụ khi đọc danh sách. Trạng thái hết hạn được tính bằng business clock. Danh sách tự làm mới theo chu kỳ 30 giây đang có; modal tải lại mỗi 15 giây khi đang hiển thị. Đây không phải tính năng thông báo đẩy toàn hệ thống.

## Kiểm thử thủ công

1. Cọc đã xác nhận, bắt đầu 01/11: bên thuê mở “Đề nghị bắt đầu thuê sớm” ngay trên danh sách, chọn 25/10 và lý do.
2. Bên chủ nhà chờ lượt tự làm mới hoặc bấm Làm mới: thấy banner ngày 01/11 → 25/10 và nút xử lý, không cần mở chi tiết.
3. Duyệt trong modal: danh sách hai bên cập nhật ngày 25/10; lịch sử “Đã đồng ý”; không thu lại cọc. Từ chối/rút không đổi ngày thuê hiện tại.
4. Hết hạn, đã rút/đã xử lý, sai tài khoản hoặc đang hủy: không được duyệt lặp. Hai trình duyệt xử lý đồng thời: Core kiểm tra lại, modal tải kết quả thật.
5. Mạng lỗi sau khi gửi thao tác: không hiện thành công giả, không tự gửi lại; làm mới trước khi tiếp tục. Mobile có thể cuộn nội dung và đóng bằng Escape khi không xử lý.

Cần restart Core để API trả summary mới. Không cần đổi schema/drop CSDL. Không thực hiện thanh toán hay duyệt trên dữ liệu thật trong kiểm thử tự động.
