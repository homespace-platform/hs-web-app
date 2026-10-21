# Kiểm thử hóa đơn tháng 1 và hủy trước thuê do quá hạn

Cập nhật 21/10/2026. Dùng CSDL test, hai tài khoản và Listing riêng cho từng ca. Không chuyển tiền thật. Đồng hồ nghiệp vụ trong `hs-core-api/.env`, giờ Việt Nam; mỗi đổi mốc cần restart Core. Lùi giờ không hoàn tác dữ liệu. Báo cáo rà soát: `../../hs-core-api/docs/CONTRACT_LIFECYCLE_AUDIT.md`.

## Ca chuẩn và các nhánh gián đoạn

1. Gửi yêu cầu ngày 21/10, vào ở 01/11, đồng ý điều kiện giữ cọc. Chủ nhà nhận cọc ngày 21/10. Chưa có hóa đơn tháng 1, không thu thuê/ký sớm; chủ nhà được chuẩn bị PDF. Hai tài khoản đều thấy đúng cọc thực nhận.
2. Ngày 01/11: mở hóa đơn “Tiền thuê tháng 1” với đúng giá thuê, không cộng cọc đã trả. Báo chuyển chưa PAID; chỉ chủ nhà xác nhận mới PAID. Không có block Thanh toán ban đầu, chỉ hai mục Hóa đơn theo kỳ và Cọc & hoàn cọc.
3. Tạo ca riêng vào ở ngay 21/10: khoản chuyển gộp cọc + tháng 1. Hóa đơn tháng 1 chỉ tính thuê; QR gốc vẫn bằng tổng chuyển gộp và có giải thích rõ. Xác nhận một lần cập nhật cả receipt, cọc và hóa đơn, không sinh QR thứ hai.
4. Cọc đã xác nhận, chưa trả thuê. Chuẩn bị PDF đúng revision; đến quá hạn mới có nút thông báo cuối. Gửi thông báo, kiểm tra có thêm ít nhất 24 giờ và tenant vẫn thanh toán/ký hoặc phản hồi được. Trước hạn không có quyền chốt giữ cọc.
5. Hết hạn cuối, tenant không phản hồi: chủ nhà xác nhận đã thông báo và chưa bàn giao. Contract CANCELLED, rental kết thúc, cọc RETAINED_BY_LANDLORD đúng phần đã nhận, khoản thuê chưa trả CANCELLED. Xe giải phóng, Listing trở lại PUBLISHED nếu còn hạn; hết quyền hiển thị thì EXPIRED, không ép mở lại tin vi phạm.
6. Làm mới/gửi lặp thao tác hoàn tất: không có khoản hoàn trùng hoặc lần release mới. Một yêu cầu thuê mới trên Listing không bị ảnh hưởng bởi retry từ hồ sơ cũ.
7. Ca đã trả đủ thuê, chủ nhà chưa ký: dù quá 48 giờ, không được coi tenant bỏ ký để giữ cọc. Sau khi chủ nhà ký thành công, kiểm tra tenant có hạn riêng 48 giờ từ thời gian server, không từ thời gian nộp thuê.
8. Tenant hết hạn ký sau khi chủ nhà ký: thông báo cuối và đủ hạn mới chốt. Giữ cọc, **hoàn riêng tiền thuê đã nhận**. Nếu INITIAL gộp 15 triệu gồm cọc 10 triệu + thuê 5 triệu, nghĩa vụ hoàn chỉ 5 triệu; receipt gốc 15 triệu không bị sửa. Chưa chuyển/chưa tenant xác nhận thì khoản hoàn chưa hoàn tất.
9. Lần lượt thử TRANSFER_REPORTED, DISPUTED, REJECTED; tenant phản hồi thông báo; SmartCA pending/provider signed/embedding/FAILED hoặc kết quả chưa rõ. Tất cả chặn chốt giữ cọc; không giải phóng phòng chỉ vì hết giờ. Không dùng lỗi provider để quy trách nhiệm cho tenant.
10. Đổi revision, mở lại hạn, hoặc trả tiền/ký trong thời hạn thông báo: thông báo cũ không còn đủ điều kiện để chốt. PDF cũ/stale không được dùng làm bằng chứng chủ nhà đã chuẩn bị xong. Mọi thay đổi có nhật ký.
11. Không đồng ý điều kiện giữ cọc lúc gửi yêu cầu: không được áp dụng hồi tố. Cọc 0 đồng không có “giữ 100%”, không tạo QR chuyển 0 đồng. Tenant gọi endpoint dành cho chủ nhà và người ngoài đọc hồ sơ đều bị chặn.
12. Tiến sang cuối tháng, phụ lục, gia hạn, nợ và quyết toán bằng các ca trong `hs-core-api/SIMULATED_TIME.md`. Tháng 1 không bị thu lại, không tính là kỳ công tơ thứ 0; phụ lục tương lai không đổi giá sớm, bill đã phát hành giữ nguyên. Không dùng nhánh hủy trước thuê cho hợp đồng đã ACTIVE.

## Kiểm thử tự động và phạm vi

- Core: `mvn -Pisolated-build -pl hs-api-service -am package`; bật các test PostgreSQL bằng `HS_TEST_PG_URL/USER/PASSWORD` **chỉ trỏ DB bỏ đi**, không dùng DB dev có dữ liệu thật vì test có create-drop.
- Web: `node --test tests/*.test.cjs`, TypeScript, ESLint các file thay đổi và `npm run build`.
- PostgreSQL test có mô phỏng lỗi ở bước giải phóng Listing sau khi đã tác động cọc/contract/xe để xác minh toàn bộ rollback, sau đó retry thành công/idempotent.
- Chưa thay thế UAT với VNPT/ngân hàng thật, kiểm thử tải nhiều instance, hay bằng chứng giao email/SMS. Tranh chấp cần hỗ trợ đối soát; không có nút bỏ qua tranh chấp để cưỡng ép giữ cọc. Nội dung điều kiện giữ cọc cần duyệt trước production.
