# HomeSpace Web (Next.js)

## Chạy ứng dụng

```powershell
cd D:\Workspace\homespace\hs-web-app
npm install
npm run sync:data
npm run dev
```

## Bản đồ tiện ích xung quanh

1. Chạy `npm install`.
2. Đặt `NEXT_PUBLIC_VIETMAP_MAP_API_KEY=<key bản đồ dành cho trình duyệt>` trong `.env`, giới hạn domain cho key (bao gồm `localhost` khi chạy máy cá nhân). Không dùng key geocoding bí mật của backend.
3. Khởi động lại `npm run dev`. Khi deploy, cấu hình key trước `npm run build` vì Next.js đóng gói biến `NEXT_PUBLIC_*` vào frontend.
4. Mở chi tiết tin → **Tiện ích xung quanh**. Tab **Bản đồ** đứng đầu và được mở mặc định. Chọn tiện ích hoặc ghim để xem vị trí, địa chỉ, khoảng cách và chỉ đường. Nếu chưa cấu hình key, vẫn xem được tab **Danh sách**.

VietMap GL JS 6.0.1 được cài bằng npm và chỉ tải khi mở tab Bản đồ. Tâm bản đồ là tọa độ listing; hiển thị cùng 5 tiện ích/trang trong phạm vi 2 km với tab Danh sách. Đổi nhóm hoặc trang cập nhật cả danh sách lẫn ghim, không tải toàn bộ POI. Chỉ đường Google Maps dùng tọa độ bài đăng → tiện ích, áp dụng cả danh sách và popup bản đồ. Khách chưa đăng nhập vẫn chỉ đường được; không dùng vị trí tài khoản.

Dữ liệu địa điểm lấy từ API HomeSpace/CSDL TomTom hiện có. VietMap chỉ cung cấp lớp bản đồ; không gọi lại API tìm địa điểm hoặc đồng bộ POI khi chuyển tab.

Nếu ghim hiện nhưng nền xám: kiểm tra request `.pbf` trong Network. `style.json` trả 200 chưa đảm bảo tile tải được. Nếu tile trả **423 “Your request is limited”** hoặc 429, vào VietMap Console → Consumers → dự án/API key kiểm tra hạn mức TileMap, giới hạn theo key/IP, tên miền và quyền TileMap; Daily Report để xem usage. Không tự retry liên tục hoặc đổi tọa độ để xử lý lỗi quota. Thông báo lỗi mạng có thể không đọc được mã 423 trong trình duyệt nếu response chặn thiếu CORS. Giao diện vẫn cho xem danh sách/chỉ đường và che khung bản đồ lỗi.

Ghim sát nhau được gom thành nhóm theo vị trí trên màn hình. Bấm nhóm để chọn từng tiện ích hoặc phóng to; chọn từ danh sách sẽ làm nổi bật ghim tương ứng. Các POI trùng tọa độ vẫn có thể chọn trong popup nhóm.

## Danh mục tỉnh/thành phố và phường/xã Vietmap

`npm run sync:data` tải hai JSON **admin_new** từ [Vietmap](https://github.com/vietmap-company/vietnam_administrative_address), cùng một commit:

- `data/vietmap/province.json`
- `data/vietmap/ward.json`

Giữ nguyên dữ liệu/mã string của nhà cung cấp; `parent_code` của xã liên kết với `code` của tỉnh. Script kiểm tra định dạng, độ đầy đủ và quan hệ cha trước khi thay snapshot. Nếu tải/kiểm tra lỗi, giữ dữ liệu cũ. Không đổi file nếu nội dung không đổi. Nguồn/commit/checksum nằm trong `SOURCE.md`, giấy phép gốc trong `LICENSE.txt` cạnh JSON.

Next.js phục vụ dữ liệu local:

```text
GET /api/locations/provinces
GET /api/locations/provinces/12/wards
```

Frontend gọi cùng origin Next.js, không qua Gateway, Core API hay location service cho danh mục. Không cần API key; runtime không gọi GitHub. Header hiển thị toàn bộ tỉnh; dropdown xã chỉ tải xã thuộc tỉnh đã chọn. Bộ lọc gửi `cityId`/`wardId` Vietmap tới API tin đăng hiện có, không tìm xã bằng từ khóa. Các API autocomplete/geocode/place/reverse và dữ liệu địa chỉ CSDL không thay đổi.

Khi muốn cập nhật dữ liệu: chạy lại `npm run sync:data`. Đây là pull thủ công/CI, không phải tự cập nhật theo lịch. Commit thư mục snapshot vào repo; sau khi sync cần restart dev, hoặc build/redeploy production để dùng snapshot mới:

```powershell
npm run sync:data
npm run test:data
npm run build
npm start
```

Không gọi sync mỗi lần mở dropdown hoặc khi khởi động production. JSON được import ở server khi build, không cần filesystem có quyền ghi ở runtime. Không cần sửa/rebuild Java chỉ để cập nhật danh mục.
