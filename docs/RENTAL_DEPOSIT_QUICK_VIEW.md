# Xem nhanh cọc từ danh sách yêu cầu thuê

Chủ nhà có nút **Xem tiền cọc** ngay trên thẻ yêu cầu khi có phiếu thanh toán, không cần mở chi tiết yêu cầu. Người thuê giữ nguyên modal chuyển khoản hiện tại. Chưa chấp nhận/chưa có phiếu thì không hiển thị nút.

Modal tải tiến trình và phiếu từ API theo quyền của phiên đăng nhập. Luôn ưu tiên `RESERVATION_DEPOSIT`, kể cả khi đã mở tiền thuê tháng đầu riêng. Nếu cọc và tháng đầu chuyển gộp trong `INITIAL`, hiển thị rõ tổng chuyển gộp và các dòng tiền; không lấy tổng đó làm riêng tiền cọc. Không chọn nhầm phiếu hoàn cọc hay điều chỉnh cọc. Không tính lại tiền từ giá Listing.

Chủ nhà xem được số tiền, nội dung chuyển khoản, tài khoản nhận, mốc báo chuyển/xác nhận và chứng từ qua URL có kiểm quyền. Chỉ người nhận thực tế, vai trò chủ nhà, khoản chuyển vào đang `TRANSFER_REPORTED` mới có thao tác xác nhận/từ chối. Xác nhận phải đối chiếu tiền thực nhận; từ chối cần lý do. Các trạng thái khác chỉ xem hoặc mở chi tiết để đối soát theo luồng sẵn có. Không có chức năng gửi chứng từ thay người thuê, hoàn tiền hoặc chốt giữ cọc trong modal nhanh.

Thao tác dùng API confirm/reject hiện có; không thay đổi quyền hoặc logic Core. Có khóa chống bấm lặp, làm mới modal và danh sách sau thao tác. Nếu API ghi nhận thành công nhưng việc tải lại lỗi, thông báo rõ cần làm mới, không báo nhầm giao dịch thất bại. Modal native dialog hỗ trợ focus và Escape; không đóng khi đang gửi thao tác.

Kiểm thử: cọc riêng đã báo chuyển; xác nhận/từ chối và danh sách cập nhật; cọc đã xác nhận trong khi tháng đầu chưa trả; chuyển gộp cùng ngày; miễn cọc; canceled/expired/disputed chỉ xem; người không phải payee không thấy thao tác; chứng từ bị từ chối quyền; lỗi tải và thử lại. Test helper/quyền và render receipt nằm tại `tests/rental-deposit-quick-view.test.cjs`.
