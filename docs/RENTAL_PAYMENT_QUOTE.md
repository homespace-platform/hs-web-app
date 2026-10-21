# Dự toán cọc và tháng thuê đầu

Modal gửi yêu cầu thuê nhận `paymentPlan` từ API estimate. Ngày hiện tại là ngày nghiệp vụ tại Việt Nam do Core trả về, có áp dụng đồng hồ giả lập; không suy ra lịch thu tiền từ đồng hồ trình duyệt.

- Vào ở sau ngày nghiệp vụ: khối **Đặt cọc trước ngày nhận nhà** chỉ có cọc cần trả sau khi chủ nhà duyệt. Khối **Tiền thuê tháng đầu — thanh toán sau** hiển thị riêng tiền phòng và ngày mở thanh toán. Không cộng tiền thuê vào tổng cọc, không thu lại cọc đã xác nhận.
- Vào ở cùng ngày: giữ **Thanh toán ban đầu**, gồm cọc + tiền thuê kỳ đầu, không cộng phí dịch vụ cuối kỳ.
- Miễn cọc và vào ở sau: ghi không cần chuyển tiền giữ chỗ, không mở thu tiền thuê sớm hoặc yêu cầu chuyển 0 đồng.
- Dự toán không phải xác nhận tiền đã chuyển/đã nhận. Nếu chủ nhà chấp thuận vào ngày khác, khoản thực tế được tính lại theo ngày chấp thuận. Đổi ngày bắt đầu sớm vẫn cần hai bên đồng ý theo luồng hiện có.
- Đổi ngày hoặc thông số thuê làm dự toán cũ không còn hợp lệ ngay, kể cả trong thời gian debounce. Đang tải/lỗi/thiếu `paymentPlan` không hiển thị tổng tiền cũ và không cho gửi yêu cầu. Đóng modal hoặc phản hồi API cũ không được ghi đè dự toán mới.

`estimatedInitialTotal` giữ nguyên ý nghĩa tổng cọc + thuê kỳ đầu cho các snapshot/hợp đồng hiện hữu; **không dùng trường này làm khoản phải trả ngay**. Modal dùng `paymentPlan.amountAfterApproval`, `depositOnly`, `firstRentAmount`, `firstRentOpensOn`, `businessDate` và `moveInDate`. Không thay đổi sổ tiền hoặc dữ liệu cũ.

Kiểm thử mẫu: ngày nghiệp vụ 21/10/2026, vào ở 01/11, thuê 19.660.000 đ, cọc 39.320.000 đ → chỉ 39.320.000 đ sau khi duyệt; 19.660.000 đ mở từ 01/11. Nếu ngày nghiệp vụ là 01/11 → tổng ban đầu 58.980.000 đ. Kiểm tra cả mốc 16:59:59Z/17:00:00Z ngày 31/10 tương ứng trước/đúng nửa đêm Việt Nam, miễn cọc, ngày đã qua và đổi lựa chọn nhanh.

Cần cập nhật/restart cả Core và web để nhận API dự toán mới.
