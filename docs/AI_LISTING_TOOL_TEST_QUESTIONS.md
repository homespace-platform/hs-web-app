# Bộ câu hỏi kiểm thử trợ lý tìm tin đăng

Nguồn đối chiếu: `hs-infrastructure/postgres/listings_seed_hcm_200.sql` (200 tin, 168 phường/xã/đặc khu thuộc mã tỉnh `79`). Chạy sau khi nạp seed và khởi động lại Core API + AI service. Đăng nhập tài khoản người thuê, mở `/chat?channel=ai`. Tin seed có số nhà/tên đường giả lập, không có tọa độ xác minh; không kiểm thử khoảng cách thật. Giá và lịch xem tính từ ngày chạy seed, nên đối chiếu trang chi tiết tin tại thời điểm test, không chốt số tĩnh.

Mỗi nhóm nhiều câu dưới đây nên gửi liên tiếp trong **cùng một đoạn chat** để kiểm tra nhớ ngữ cảnh. Khi ghi “tin vừa nêu”, AI phải giữ đúng tin trong đoạn chat; khi mở đoạn chat mới, không được mang tiêu chí từ đoạn cũ sang.

## A. Tìm theo loại hình, địa chỉ và tiêu chí cơ bản

1. `Tìm phòng trọ ở Phường Phú Lợi, Thành phố Hồ Chí Minh có ban công và chỗ gửi xe máy.` — Seed có phòng trọ tại địa bàn này; kiểm tra link, loại hình, ban công, gửi xe.
2. `Phòng đó giá bao nhiêu, diện tích bao nhiêu và tối đa mấy người ở?` — Chỉ lấy thông tin của phòng vừa tìm.
3. `Tìm căn hộ ở Phường Thủ Dầu Một, Thành phố Hồ Chí Minh. Cho tôi biết số phòng ngủ, tầng và hướng ban công.` — Seed có căn hộ tại đây; phân biệt tầng căn với tổng tầng tòa nhà.
4. `Tìm nhà nguyên căn ở Phường Bình Dương, Thành phố Hồ Chí Minh có ít nhất 4 phòng ngủ.` — Seed có nhà nguyên căn 5 phòng ngủ tại đây.
5. `Nhà đó có sân thượng, gara và tối đa bao nhiêu người ở?` — Tin nhà đầu ở Phường Bình Dương có sân thượng, **không có gara**; không được suy “có gara” từ chỗ để xe.
6. `Tìm tin ở Xã Thạnh An, Thành phố Hồ Chí Minh; cho biết loại hình và giá của từng tin.` — Kiểm tra xã ở cuối danh sách 168 địa bàn, không tự đổi thành quận/huyện cũ.
7. `Tìm tin ở Đặc khu Côn Đảo thuộc Thành phố Hồ Chí Minh.` — Kiểm tra đúng loại địa bàn đặc khu và tên tỉnh trong seed.

## B. Phí, cọc và điều kiện thuê

8. `Phòng trọ ở Phường Phú Lợi có thu riêng phí gửi xe máy không? Tối đa mấy xe?` — Tin phòng đầu có chính sách `FREE`; phí xe máy đã gồm trong giá, sức chứa xe lấy từ tin.
9. `Tiền điện, nước và internet của phòng vừa nêu được tính thế nào? Khoản nào đã gồm trong giá thuê?` — Đối chiếu từng dòng `listing_charges`; không gọi phí có số tiền là “miễn phí” nếu `included_in_rent=false`.
10. `Căn hộ ở Phường Thủ Dầu Một cần cọc bao nhiêu, đóng tiền theo chu kỳ nào và thuê tối thiểu mấy tháng?` — Phân biệt cọc theo tháng với cọc số tiền cố định.
11. `Nhà nguyên căn ở Phường Bình Dương có thể thương lượng giá không? Giá đã gồm phí quản lý và VAT chưa?` — Đối chiếu ba trường độc lập, không suy từ tiêu đề.
12. `Tìm nhà nguyên căn ở Thành phố Hồ Chí Minh có gara rồi so sánh phí gửi ô tô của các tin tìm được.` — Chỉ nêu phí ô tô khi tin có dòng phí tương ứng; “đã gồm” khác “chưa khai báo”.

## C. Field riêng của từng loại hình

13. `Phòng trọ ở Phường Phú Lợi có WC riêng hay chung, bếp kiểu gì và đồng hồ điện/nước dùng riêng không?`
14. `Phòng ấy có gác lửng, cửa sổ, ban công riêng hay ban công chung?` — Tin phòng đầu không có gác lửng; phải phân biệt `has_balcony` và `balcony_type`.
15. `Giờ ra vào của phòng trọ đó là tự do hay có giờ đóng cửa?`
16. `Căn hộ ở Phường Thủ Dầu Một thuộc block nào, mã căn là gì, có mấy phòng tắm và tầm nhìn ra đâu?`
17. `Nhà nguyên căn ở Phường Bình Dương rộng bao nhiêu, đất rộng bao nhiêu, mặt tiền và đường/hẻm rộng bao nhiêu?` — Không tráo `area_m2` và `land_area_m2`.
18. `Nhà đó cho thuê toàn bộ hay chỉ một số tầng? Pháp lý được ghi thế nào?` — Đọc cả phạm vi thuê và tầng cho thuê; nếu dữ liệu có điểm chưa nhất quán, nêu đúng các field, không tự diễn giải chắc chắn.

## D. Tiện ích, nội thất, lịch xem

19. `Tìm phòng trọ ở Thành phố Hồ Chí Minh có Wi-Fi và máy lạnh; cho tôi biết phường, giá và link.` — Kiểm tra giao của hai tiện ích.
20. `Phòng trọ ở Phường Phú Lợi có những tiện ích nào, và có trang thiết bị nào được bàn giao?` — Phân biệt tiện ích với danh sách nội thất bàn giao.
21. `Căn hộ ở Phường Thủ Dầu Một có giường và tủ quần áo bàn giao không? Số lượng, tình trạng từng món là gì?` — Chỉ khẳng định món nào thật sự có trong `listing_furnishing_assets`; không suy từ trạng thái nội thất.
22. `Tìm căn hộ có thang máy và cho phép nuôi thú cưng ở Thành phố Hồ Chí Minh.` — Kiểm tra hai tiện ích cùng đúng trên **một** tin.
23. `Phòng trọ ở Phường Phú Lợi có thể hẹn xem vào những thứ nào, buổi nào?` — Đọc `listing_viewing_days` và `listing_viewing_slots`, không tự tạo giờ cụ thể.
24. `Tìm nhà nguyên căn có sân thượng nhưng không có gara ở Thành phố Hồ Chí Minh.` — Kiểm tra boolean `has_rooftop=true`, `has_garage=false`.

## E. Không có kết quả, phủ định, hội thoại nhiều lượt

25. `Tìm phòng trọ ở Phường Phú Lợi giá dưới 1 triệu/tháng.` — Tin phòng ở đây không đạt ngưỡng; nếu gợi ý sau khi nới giá, phải **nói rõ không khớp giá gốc**.
26. `Tìm nhà nguyên căn có gara ở Phường Bình Dương.` — Nhà đầu ở đây không có gara; không được gắn nhãn “có gara” cho nó. Nếu nới tiêu chí, đánh dấu là gợi ý gần đúng.
27. `Tìm phòng trọ có gác lửng tại Thành phố Hồ Chí Minh.` — Trong seed hiện tại các ROOM đều `has_mezzanine=false`; kỳ vọng không bịa tin khớp.
28. Trong cùng chat, gửi lần lượt: `Tìm phòng trọ ở Phường Phú Lợi có ban công.` → `Chỗ gửi xe của phòng ấy miễn phí hay trả phí?` → `Nếu tôi không muốn phòng đó thì còn phòng trọ nào ở Phường Thủ Dầu Một?` — Kiểm tra chuyển đối tượng tham chiếu đúng lượt.
29. Trong chat mới, hỏi `Phòng ấy có phí gửi xe không?` — Không được tự lấy “phòng ấy” từ chat trước; nên xin làm rõ.
30. `HomeSpace là gì và cách đăng tin cho thuê như thế nào?` — Câu hỏi hướng dẫn phải theo RAG, không trả danh sách tin đăng.

## Tiêu chí chấm nhanh

- Tin được trả về phải có link `/rent/{id}` mở được, đang công khai/hoạt động và đúng **tất cả** điều kiện bắt buộc; các gợi ý đã nới điều kiện phải ghi rõ điều kiện bị nới.
- Thông tin phí chỉ dựa `listing_charges` + chính sách gửi xe; `FREE`, `PAID`, `NONE` không được đảo nghĩa. Phí đã gồm trong giá không có nghĩa là không tồn tại chi phí.
- Không bịa quận/huyện từ dữ liệu chỉ có phường/xã/đặc khu; không cam kết khoảng cách, địa chỉ đường thật hoặc thời gian di chuyển vì seed không có tọa độ xác minh.
- Tin thiếu field phải trả lời “chưa ghi trong tin”, không suy từ loại hình/tên bài. Phân biệt không tìm thấy tin (`NO_RESULTS`) với công cụ tra cứu lỗi (`TOOL_UNAVAILABLE`).
- Kết quả tra cứu phụ thuộc CSDL đang chạy; nếu đã đổi/xóa tin sau khi seed, lấy trang chi tiết và CSDL hiện tại làm chuẩn.
