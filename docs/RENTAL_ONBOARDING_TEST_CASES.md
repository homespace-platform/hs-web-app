# Kiểm thử đặt cọc, nhận nhà và bắt đầu thuê sớm

Ngày cập nhật: 21/10/2026. Dùng hai tài khoản test đã KYC và có tài khoản ngân hàng, một Listing riêng chưa cho thuê. Không dùng giao dịch thật. Schema mới do Hibernate tạo theo cấu hình JPA; không có SQL vá rời và không tự drop CSDL.

Sau khi bạn tạo lại CSDL: khởi động Core với JPA tạo/cập nhật schema rồi chạy file seed chính `hs-infrastructure/postgres/listings_seed_hcm.sql`. CHECK loại thanh toán trong file này đã có RESERVATION_DEPOSIT; không chạy bản seed cũ vì nó sẽ chặn khoản cọc riêng. Tổng 2.580 tin và dữ liệu tin đăng không thay đổi trong lần nâng cấp này.

## Cấu hình và cách chạy

Build Core: `mvn -Pisolated-build -pl hs-api-service -am package`. Profile này ghi vào `target/isolated` của từng module để tránh trình biên dịch nền của IDE ghi đè file kiểm thử; không đổi profile Spring hay đồng hồ nghiệp vụ. JAR chạy được nằm ở `hs-api-service/target/isolated/hs-api-service-0.0.1-SNAPSHOT.jar`. Build web: `npm run build`. Restart Core, tải lại web. Các hạn nghiệp vụ đặt trong `application.properties`, đồng hồ dev/test trong `hs-core-api/.env`:

Khi mở workspace `D:/Workspace/homespace` bằng Cursor/VS Code, chọn cấu hình **HomeSpace Core - Maven isolated (recommended)** trong Run and Debug rồi F5. Cấu hình này tự build Maven và chạy đúng JAR ở `target/isolated`, vẫn nạp `hs-core-api/.env`. Không dùng nút Run Java trực tiếp trên class chính khi IDE đang báo lỗi build: các `.class` lỗi trong `target/classes` có thể gây `NoClassDefFoundError: Address` dù import trong source đúng. Không sửa entity hoặc drop CSDL để xử lý lỗi classpath này.

```dotenv
HOMESPACE_TIME_SIMULATED_AT=2026-10-21T10:00:00
```

Đồng hồ nghiệp vụ này dùng cho yêu cầu thuê, cọc, tiền tháng đầu, hạn ký và hóa đơn. Chữ ký SmartCA, token tải chứng từ và thời điểm lập file dùng giờ thực. Không đổi đồng hồ trong lúc một thao tác ký đang xử lý; đợi kết quả/worker trước khi chuyển mốc.

| Mốc | Mặc định | Kết quả khi quá hạn |
| --- | --- | --- |
| Chủ nhà phản hồi yêu cầu thuê | 24 giờ từ lúc gửi | Yêu cầu PENDING hết hạn, không khóa phòng |
| Chuyển cọc/INITIAL gộp khi vào ngay | 60 phút từ lúc chấp nhận | Chưa báo chuyển thì hết giữ chỗ; tin hết hạn đăng không được mở lại công khai |
| Xác nhận khoản đã báo chuyển | 24 giờ | Cần đối soát, vẫn giữ phòng |
| Phản hồi đề nghị bắt đầu sớm | 24 giờ, không qua hết ngày đề nghị | Hết hiệu lực đề nghị, giữ ngày thuê/cọc cũ |
| Tiền tháng đầu khi nhận nhà sau | Mở 00:00 ngày bắt đầu, hạn 24 giờ từ mốc mở | Cần đối soát, không tự thu cọc lần nữa hay đổi ngày thuê |
| Hoàn tất ký | 48 giờ từ xác nhận tiền tháng đầu | Cần xử lý; chủ nhà có thể mở lại 48 giờ kèm lý do |
| Hoàn tiền sau đồng ý hủy trước ký | 3 ngày | Nghĩa vụ vẫn còn; người nhận phải xác nhận thực nhận |

Các mốc chính: yêu cầu thuê → cọc → chờ ngày vào ở → tiền tháng đầu → ký. Khi bắt đầu thuê ngay, cọc và tháng đầu có thể cùng một khoản INITIAL. `INITIAL` của trường hợp nhận nhà sau chỉ là tiền thuê; `RESERVATION_DEPOSIT` là cọc riêng. Không sử dụng một số tiền/trạng thái chung để suy ra cả hai đã được thanh toán.

## Các ca thao tác

Mỗi nhánh dùng một yêu cầu/Listing riêng. Sau đổi đồng hồ, restart Core, chờ tối đa khoảng 30 giây hoặc bấm Làm mới tiến trình nhận nhà. Các thao tác đối soát, hủy và chuyển tiền cần người dùng chủ động; scheduler không thực hiện thay.

1. Vào ở 21/10: chủ nhà chấp nhận → chỉ một QR gồm cọc + tháng đầu. Báo chuyển, chủ nhà xác nhận rồi mới ký. Không tạo cọc thứ hai.
2. Vào ở 01/11: chấp nhận ngày 22/10 → QR chỉ có cọc. Chủ nhà xác nhận cọc → chưa tạo bản nháp, chưa ký, chưa thu tháng đầu, không hiện nút tạo hợp đồng. Tới 01/11 mở tháng đầu; xác nhận đủ tiền → Core tự tạo bản nháp. Nếu chưa có draft, chủ nhà có nút dự phòng **Tạo hợp đồng** ở danh sách/modal: vẫn cùng endpoint, điều kiện và mẫu hệ thống. Thiếu mẫu phải báo quản trị viên bổ sung; sau khi phát hành mẫu, bấm lại hoặc chờ job sẽ cùng trả về một draft, không tạo trùng. Người thuê không có nút này.
3. 31/10 23:59:59: ca 2 chưa có tiền tháng đầu. Gọi trực tiếp API ký cũng bị chặn.
4. 01/11 00:00:00: tiền tháng đầu mở một lần, không kèm cọc. Refresh nhiều lần, scheduler chạy nhiều lần không tạo thêm khoản.
5. Chủ nhà xác nhận tháng đầu → ký theo đúng thứ tự, Listing RENTED, yêu cầu COMPLETED. PDF thể hiện riêng mã/thời điểm hai khoản.
6. Ca 2: người thuê xin bắt đầu 25/10, chủ nhà duyệt. Ngày thuê thành 25/10, hết hạn 25/01/2027 cho 3 tháng; kỳ tiếp theo là 25/11. Trước 25/10 chưa mở tháng đầu.
7. Xin bắt đầu sớm ngay hôm nay → chủ nhà duyệt → mở tháng đầu ngay. Cọc đã trả không thu lại.
8. Ngày đề nghị trong quá khứ, trùng hoặc sau ngày thuê cũ, trước ngày tài sản sẵn sàng → bị chặn, không đổi ngày/chỗ xe.
9. Người thuê không thể duyệt, chủ nhà không thể giả người thuê gửi; tài khoản khác không xem/đổi được hồ sơ.
10. Từ chối/rút/hết hạn đề nghị → ngày cũ và khoản cọc vẫn giữ. Lịch sử quyết định còn xem được.
11. Đề nghị thứ hai khi đang có một đề nghị chờ → bị chặn.
12. Có bản nháp trước khi duyệt đổi ngày → tạo revision mới, PDF cũ nằm trong lịch sử, không ký được file cũ; bản mới có ngày đúng.
13. Đã mở tháng đầu hoặc đã bắt đầu ký → không đổi ngày bằng đề nghị nhận nhà sớm.
14. Chi nhánh đủ xe từ 01/11 nhưng thiếu từ 25/10 → duyệt bị chặn; transaction giữ nguyên ngày/holds cũ, không làm mất chỗ đã đặt.
15. Chấp nhận hai yêu cầu cùng lúc → chỉ một giữ chỗ thành công, không hai QR/hồ sơ giữ chỗ cùng thắng.
16. Chưa báo chuyển khi hết 60 phút → mất giữ chỗ, hết hạn khoản cọc; gọi API nộp chứng từ muộn không vượt cổng hạn.
17. Báo chuyển phút 59, chủ nhà chưa xác nhận sau 24 giờ → vẫn giữ phòng, tiến trình yêu cầu đối soát, không tự kết luận đã nhận tiền.
18. Chủ nhà từ chối chứng từ / người thuê tranh chấp → hai bên có đường đối soát. Chủ nhà xác nhận thực nhận hoặc mở lại hạn thanh toán kèm lý do, có lịch sử.
19. Cọc đã nhận ngày 21/10, đến 24/10 chưa tạo hợp đồng → không mất phòng vì hạn 48 giờ cũ.
20. Quá hạn ký sau tháng đầu đã nhận → không tự tạo hoàn tiền/mở phòng; chủ nhà mở lại hạn và ký thực tế, không ghi lùi chữ ký.
21. Trước khi ký: người thuê đề nghị hủy, chủ nhà từ chối → hồ sơ và tiền giữ nguyên; lịch sử có quyết định.
22. Chủ nhà đồng ý hủy sau khi đối soát → tạo nghĩa vụ hoàn từng khoản thực nhận, không tự chuyển tiền. Chủ nhà báo hoàn, người thuê xác nhận nhận đủ; giao diện hiển thị riêng từng khoản.
23. Còn khoản đang báo chuyển/tranh chấp → không đồng ý hủy và tính tiền hoàn một cách mơ hồ; phải đối soát trước.
24. Cọc 0 → không QR 0 đồng; có ghi nhận không yêu cầu cọc, đến ngày mới thu tháng đầu.
25. Restart sau khi bỏ lỡ ngày bắt đầu → mốc mở/hạn gốc giữ nguyên; trạng thái cần xử lý, không tự đổi ngày hay tạo cửa sổ mới giả.
26. Listing hết hạn đăng trong lúc giữ chỗ → khi giải phóng không được trở thành tin công khai quá hạn.
27. Chưa nhận cọc trong 60 phút → các lịch xem đã có không bị hủy vĩnh viễn chỉ vì giữ chỗ; khi đã cho thuê chính thức thì xử lý lịch theo nghiệp vụ.
28. Kết thúc tháng đầu: hóa đơn thu chi phí tháng đã ở + tiền thuê kỳ tiếp theo; không thu lại cọc/tháng đầu. Xin bắt đầu sớm phải đổi cả mốc hóa đơn/gia hạn/phụ lục.
29. Mobile upload: token vẫn hết hạn theo giờ thực 10 phút; tiền cọc/tháng đầu vẫn kiểm tra cửa sổ nghiệp vụ, không vượt hạn nhờ phiên upload còn hạn.
30. Mở đồng thời hai tab và refresh → số tiền, trạng thái, ngày thuê đồng nhất sau tải lại; retry không tạo trùng nghĩa vụ hoặc quyết định.
31. Ca 2 (vào ở 01/11): chỉ xác nhận cọc chưa có bản nháp. Sau xác nhận đủ tháng đầu, Core tự tạo bản nháp → người thuê thấy ở "Hợp đồng đi thuê" (nhãn "Bản nháp · Chưa có hiệu lực"), ở thẻ/chi tiết yêu cầu thuê và mở được chi tiết, revision, breakdown; xem/tải PDF sau khi chủ nhà kết xuất. Tổng số và phân trang khớp vì lọc ở truy vấn. Hồ sơ cũ có bản nháp được giữ nguyên, không tự xóa.
32. Cọc mới ở trạng thái "đã báo chuyển", bị từ chối hoặc tranh chấp; sai người nộp/nhận; yêu cầu thuê chưa ACCEPTED; tài khoản không thuộc hợp đồng → không thấy bản nháp (danh sách, tra theo yêu cầu thuê, chi tiết, tài liệu, storage).
33. Người thuê xem bản nháp nhưng không sửa, không render/gửi, không đổi ngày thuê, không trả tháng đầu sớm, không ký (UI ẩn nút, API từ chối kể cả ký nội bộ gọi trực tiếp). Chủ nhà vẫn xem/sửa như cũ.
34. Cọc đã xác nhận không làm `paymentStatus` thành đã thanh toán đủ; chủ nhà thấy riêng "khách báo đã chuyển" và "chủ nhà đã xác nhận nhận tiền", không tự xác nhận thay.
35. Hợp đồng ACTIVE, phụ lục, gia hạn, hóa đơn → hiển thị và quyền không đổi.
36. Giới hạn đã biết: trợ lý AI vẫn không liệt kê bản nháp của người thuê.

## Triển khai RAG

Các tài liệu nguồn `06`, `07`, `08`, `13` thay đổi. Admin cần upload/apply, chờ job COMPLETED và phiên bản được kích hoạt; sửa file trên đĩa chưa cập nhật RAG đang chạy. Không đưa dữ liệu giao dịch/chứng từ thật vào knowledge dùng chung.
