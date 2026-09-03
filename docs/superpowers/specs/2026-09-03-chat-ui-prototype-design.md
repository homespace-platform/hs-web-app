# Chat UI Prototype Design

## Mục tiêu

Xây dựng luồng chat P2P dạng prototype ở `hs-web-app`: người dùng có thể mở chat nhanh trong popup khi đang xem tin đăng, chuyển sang trang `/chat` để xem danh sách và cuộc trò chuyện đầy đủ, đồng thời mô phỏng hai tài khoản nhắn tin với nhau mà chưa cần backend.

## Phạm vi

Trong phạm vi:

- Popup chat nhỏ dùng được từ mọi trang có nút chat nổi.
- Nút mở cuộc trò chuyện đầy đủ tại `/chat`.
- Tái sử dụng `ChatWindow`, `ChatSidebar` và mock conversation hiện có.
- Hai tài khoản mô phỏng: người thuê và chủ nhà.
- Gửi tin nhắn mock trong cùng một phiên trình duyệt.
- Đính kèm thông tin tin đăng vào tin nhắn đầu tiên khi chat từ trang chi tiết nhà.
- Giữ phần AI chat hiện tại hoạt động độc lập.

Ngoài phạm vi:

- Không thêm API, MongoDB, WebSocket, Eureka hoặc module nghiệp vụ vào `hs-chat-service`.
- Không phân quyền người thuê/chủ nhà.
- Không đồng bộ tin nhắn giữa hai trình duyệt hoặc hai thiết bị.
- Không upload file, gọi thoại, gọi video, thông báo thật hoặc lưu lịch sử sau khi refresh.

## Thiết kế được chọn

Dùng một `ChatDemoProvider` ở frontend làm nguồn state chung cho popup, trang `/chat` và trang chi tiết tin đăng. Provider giữ mock conversations trong React state; UI chỉ gọi các action của provider nên sau này có thể thay implementation mock bằng API mà không đổi luồng giao diện.

Các khu vực sử dụng provider:

- `FloatingChatButton`: mở hoặc đóng popup chat nhanh.
- `ChatQuickPopup`: hiển thị cuộc trò chuyện rút gọn, ô nhập và nút mở đầy đủ.
- `app/chat/page.tsx`: hiển thị danh sách và `ChatWindow`, đọc `conversationId` từ query string để chọn đúng hội thoại.
- `RentDetailView`: mở popup với người nhận là chủ nhà và listing hiện tại.

## Tài khoản mô phỏng

Provider có hai identity cố định:

- `tenant-demo`: Người thuê A.
- `landlord-demo`: Người cho thuê B.

UI có switcher rõ nhãn `Tài khoản mô phỏng` ở popup và trang chat. Switcher chỉ đổi `activeDemoUserId`; nó không phải cơ chế phân quyền. Khi đổi tài khoản, cùng lịch sử được tính chiều gửi dựa trên `message.senderId === activeDemoUserId`.

Tin nhắn phải có `senderId`; không dùng trạng thái cố định `me/them` làm nguồn dữ liệu vì sẽ sai khi đổi identity. `me/them` chỉ được suy ra khi render. Các mock data cũ được chuẩn hóa về hai sender demo khi khởi tạo provider.

## Luồng popup

1. Người dùng bấm nút chat nổi hoặc nút Chat trong card liên hệ của tin đăng.
2. Provider mở popup và chọn conversation tương ứng; nếu mở từ tin đăng, lưu `pendingListing`.
3. Popup hiển thị avatar/tên người nhận, tin nhắn gần nhất, thẻ listing nếu tin nhắn đã có `listingCard`, ô nhập và nút gửi.
4. Khi người dùng bấm gửi, tạo một `ChatMessage` mới. Nếu có `pendingListing` và đây là tin đầu tiên của luồng từ tin đăng, gắn cùng object `listingCard` vào message rồi xóa `pendingListing`.
5. Nút đóng chỉ đóng popup, không xóa state.
6. Nút `Mở cuộc trò chuyện đầy đủ` điều hướng tới `/chat?conversationId=<id>`; trang chat mở đúng conversation.

Popup không tự gửi tin nhắn khi người dùng bấm Chat. Người dùng phải nhập nội dung và bấm gửi để tránh gửi ngoài ý muốn.

## Luồng từ tin đăng

`RentDetailView` thay toast hiện tại của ô nhắn nhanh bằng action mở popup. Listing được map về `RelatedListing` hiện có:

- `id`: `property.id`.
- `title`: `property.title`.
- `price`: giá thuê đã format theo `vi-VN`.
- `location`: `property.location`.
- `image`: ảnh đầu tiên của tin, nếu có.
- `bedrooms`: `property.beds`.
- `area`: `property.areaM2`.
- `verified`: `property.isVerified`.

Conversation được tìm theo người nhận và listing. Nếu chưa có, provider tạo mock conversation mới với chủ nhà từ `property.landlord` và listing đó. Card listing trong message có nút xem tin, trỏ về `/rent/<listingId>` thay vì `/rent` cố định.

## Trang chat đầy đủ

Giữ bố cục hai cột hiện tại:

- Sidebar: danh sách hội thoại direct, tìm kiếm/lọc hiện có và trạng thái unread mock.
- Main: `ChatWindow` hiện tại, bổ sung hiển thị sender theo identity đang chọn.
- AI channel giữ nguyên, không dùng chung conversation direct.
- Khi không có query `conversationId`, giữ empty state hoặc behavior hiện tại; khi có query hợp lệ, chọn conversation direct tương ứng.

Trên mobile, popup dùng chiều rộng gần toàn màn hình; trang đầy đủ tiếp tục dùng chuyển đổi sidebar/main hiện có.

## State và ranh giới tương lai

State tối thiểu của provider:

```ts
type ChatDemoState = {
  activeDemoUserId: string;
  conversations: ChatConversation[];
  popupConversationId: string | null;
  pendingListing: RelatedListing | null;
};
```

Action tối thiểu:

```ts
openQuickChat(input?: { conversationId?: string; listing?: RelatedListing }): void;
closeQuickChat(): void;
sendMessage(input: { conversationId: string; content: string; listing?: RelatedListing }): void;
selectDemoUser(userId: string): void;
openFullChat(conversationId: string): void;
```

Provider không gọi service nào trong prototype. Khi backend bắt đầu, các action trên sẽ là boundary để thay bằng `chatService`; dữ liệu persistent, phân quyền, delivery status và realtime sẽ được thêm ở giai đoạn backend riêng.

## Tiêu chí chấp nhận

- Bấm nút chat nổi mở được popup và đóng được popup.
- Popup không che khuất toàn bộ trang desktop và vẫn thao tác được trên mobile.
- Bấm Chat từ `RentDetailView` mở đúng chủ nhà và giữ đúng thông tin listing.
- Gửi tin từ listing tạo message có `listingCard` với title, giá, vị trí và ảnh đúng.
- Đóng popup rồi mở trang đầy đủ vẫn thấy cùng conversation trong cùng session.
- Nút mở đầy đủ chọn đúng `conversationId`.
- Đổi giữa Người thuê A và Người cho thuê B làm đổi đúng chiều sender/receiver của lịch sử.
- Hai tài khoản mock có thể gửi tin nhắn qua lại trong cùng UI.
- Refresh trang reset mock state; hành vi này được ghi rõ là giới hạn prototype.
- `hs-chat-service` không có file source hoặc dependency mới.

## Kiểm thử

Vì đây là prototype UI và repo không có test runner frontend thống nhất, kiểm tra bằng:

- `npm run build` trong `hs-web-app`.
- `npm run lint` hoặc lint các file chat đã sửa.
- Checklist acceptance ở trên bằng hai identity mô phỏng.
- Kiểm tra thủ công cả desktop và mobile viewport cho popup.
