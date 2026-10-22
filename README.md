# HomeSpace Web (Next.js)

## Chạy ứng dụng

```powershell
cd D:\Workspace\homespace\hs-web-app
npm install
npm run sync:data
npm run dev
```

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
