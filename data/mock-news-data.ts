import { NewsArticle } from "@/types/news.type";

export const MOCK_NEWS_ARTICLES: NewsArticle[] = [
  // 1. Featured Article 1
  {
    id: "news-1",
    slug: "gia-thue-nha-ho-chi-minh-quy-3-2026",
    title: "Giá thuê nhà và căn hộ TP. Hồ Chí Minh thiết lập mặt bằng mới trong Quý 3/2026",
    summary:
      "Báo cáo thị trường cho thấy phân khúc căn hộ dịch vụ và studio tại khu vực trung tâm TP.HCM ghi nhận tỷ lệ lấp đầy đạt 92% nhờ nhu cầu từ chuyên gia và người đi làm.",
    content: `
## 1. Toàn cảnh thị trường cho thuê TP.HCM năm 2026

Thị trường căn hộ cho thuê tại TP. Hồ Chí Minh trong quý 3/2026 tiếp tục ghi nhận sự phục hồi mạnh mẽ. Nhu cầu thuê căn hộ chung cư 1-2 phòng ngủ tại các khu vực ven trung tâm như Bình Thạnh, Quận 2 (cũ), Quận 7 tăng hơn 18% so với cùng kỳ năm trước.

### Điểm nhấn chính:
- **Tỷ lệ lấp đầy**: Đạt 92% đối với căn hộ tầm trung và studio cao cấp.
- **Giá thuê bình quân**: Tăng từ 5 - 8% tại các dự án dọc tuyến Metro số 1 Bến Thành - Suối Tiên.
- **Xu hướng trực tiếp**: Người thuê ngày càng ưu tiên các nền tảng kết nối trực tiếp chủ nhà như HomeSpace để tiết kiệm chi phí trung gian và ký hợp đồng bảo mật On-chain.

## 2. Phân khúc căn hộ dịch vụ và Studio chiếm sóng

Các chuyên gia trẻ và nhân sự làm việc linh hoạt (hybrid working) đang tìm kiếm những không gian sống có nội thất hiện đại, tích hợp công nghệ quản lý tòa nhà thông minh.
    `,
    coverImage:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
    category: "market",
    categoryLabel: "Thị trường",
    tags: ["Thị trường TP.HCM", "Giá thuê nhà", "Căn hộ chung cư"],
    isFeatured: true,
    publishedAt: "17 thg 8, 2026",
    views: 1420,
    readTimeMinutes: 5,
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "Chuyên gia phân tích thị trường",
    },
  },

  // 2. Featured Article 2
  {
    id: "news-2",
    slug: "luat-nha-o-2026-nhung-thay-doi-ve-hop-dong-thue-nha",
    title: "Luật Nhà ở 2026: Những quy định mới nhất về hợp đồng thuê và bảo vệ tiền cọc của người thuê",
    summary:
      "Tìm hiểu chi tiết các quy định pháp lý mới về việc số hóa hợp đồng thuê nhà, cơ chế quản lý tiền cọc an toàn và quyền lợi đôi bên trong giao dịch thuê trực tiếp.",
    content: `
## Quy định mới về ký kết hợp đồng thuê điện tử

Từ năm 2026, các giao dịch thuê nhà dân sự đã được pháp luật công nhận giá trị pháp lý tương đương khi ký kết bằng hợp đồng điện tử có định danh cá nhân (VNeID) và chứng thực số.

### Các điểm cần lưu ý:
1. **Tiền đặt cọc**: Không được vượt quá 02 tháng tiền nhà đối với hợp đồng dưới 1 năm.
2. **Biên bản bàn giao thiết bị**: Bắt buộc phải có hình ảnh hoặc video đính kèm khi nhận bàn giao phòng.
3. **Giải quyết tranh chấp**: Ưu tiên hòa giải dựa trên điều khoản hợp đồng đã số hóa minh bạch.
    `,
    coverImage:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80",
    category: "legal",
    categoryLabel: "Pháp lý",
    tags: ["Pháp lý", "Hợp đồng thuê", "Bảo vệ tiền cọc"],
    isFeatured: true,
    publishedAt: "16 thg 8, 2026",
    views: 2850,
    readTimeMinutes: 6,
    author: {
      name: "Luật sư Trần Văn Bảo",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      role: "Cố vấn pháp lý HomeSpace",
    },
  },

  // 3. Featured Article 3
  {
    id: "news-3",
    slug: "cam-nang-thue-nha-khong-qua-moi-gioi-tiet-kiem-chi-phi",
    title: "Cẩm nang thuê phòng trọ và căn hộ không qua trung gian: Tiết kiệm 100% phí môi giới",
    summary:
      "Hướng dẫn từng bước cách tìm kiếm phòng trọ chính chủ, quy trình hẹn xem nhà, thẩm định giá trị thực tế và kiểm tra pháp lý căn nhà trước khi đặt cọc.",
    coverImage:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
    category: "guide",
    categoryLabel: "Cẩm nang",
    tags: ["Kinh nghiệm thuê nhà", "Chính chủ", "Tiết kiệm phí"],
    isFeatured: true,
    publishedAt: "15 thg 8, 2026",
    views: 3940,
    readTimeMinutes: 4,
    author: {
      name: "Lê Thu Thảo",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "Biên tập viên đời sống",
    },
  },

  // 4. Latest Article 4
  {
    id: "news-4",
    slug: "xu-huong-thue-can-ho-studio-the-he-gen-z",
    title: "Xu hướng thuê căn hộ Studio full nội thất của thế hệ trẻ tại các đại đô thị",
    summary:
      "Không gian sống tinh giản, nội thất thông minh đa chức năng và vị trí gần trạm phương tiện công cộng là những ưu tiên hàng đầu của người thuê trẻ hiện nay.",
    coverImage:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    category: "trend",
    categoryLabel: "Xu hướng",
    tags: ["Gen Z", "Căn hộ Studio", "Phong cách sống"],
    isFeatured: false,
    publishedAt: "14 thg 8, 2026",
    views: 890,
    readTimeMinutes: 4,
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "Chuyên gia phân tích thị trường",
    },
  },

  // 5. Latest Article 5
  {
    id: "news-5",
    slug: "kinh-nghiem-dau-tu-cho-thue-can-ho-dong-tien-on-dinh",
    title: "Bí quyết quản lý căn hộ cho thuê đạt tỷ suất lợi nhuận dòng tiền 7-9%/năm",
    summary:
      "Chia sẻ kinh nghiệm thực chiến dành cho chủ nhà: cách chọn lọc khách thuê chất lượng, tự động hóa thanh toán định kỳ và duy trì giá trị tài sản dài hạn.",
    coverImage:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
    category: "investment",
    categoryLabel: "Đầu tư",
    tags: ["Đầu tư", "Chủ nhà", "Dòng tiền cho thuê"],
    isFeatured: false,
    publishedAt: "12 thg 8, 2026",
    views: 1120,
    readTimeMinutes: 5,
    author: {
      name: "Hoàng Đức Nam",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      role: "Nhà đầu tư cho thuê",
    },
  },

  // 6. Latest Article 6
  {
    id: "news-6",
    slug: "top-5-khu-vuc-thue-nha-tot-nhat-cho-sinh-vien-ha-noi",
    title: "Top 5 khu vực thuê trọ lý tưởng gần các trường đại học lớn tại Hà Nội mùa tựu trường",
    summary:
      "Đánh giá chi tiết về mức giá, an ninh, tiện ích và phương tiện di chuyển tại Cầu Giấy, Đống Đa, Hai Bà Trưng, Thanh Xuân và Nam Từ Liêm.",
    coverImage:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    category: "guide",
    categoryLabel: "Cẩm nang",
    tags: ["Hà Nội", "Sinh viên", "Phòng trọ giá rẻ"],
    isFeatured: false,
    publishedAt: "10 thg 8, 2026",
    views: 2450,
    readTimeMinutes: 6,
    author: {
      name: "Lê Thu Thảo",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "Biên tập viên đời sống",
    },
  },

  // 7. Latest Article 7
  {
    id: "news-7",
    slug: "quy-hoach-tuyen-metro-so-2-tac-dong-the-nao-den-gia-thue",
    title: "Tiến độ quy hoạch tuyến Metro số 2 Bến Thành - Tham Lương tác động thế nào đến giá thuê nhà?",
    summary:
      "Phân tích tiềm năng tăng trưởng giá trị cho thuê của các dự án căn hộ nằm trong bán kính 500m quanh các ga ngầm tuyến Metro số 2.",
    coverImage:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",
    category: "market",
    categoryLabel: "Thị trường",
    tags: ["Quy hoạch", "Metro số 2", "TP.HCM"],
    isFeatured: false,
    publishedAt: "08 thg 8, 2026",
    views: 1780,
    readTimeMinutes: 5,
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "Chuyên gia phân tích thị trường",
    },
  },

  // 8. Latest Article 8
  {
    id: "news-8",
    slug: "canh-giac-5-chieu-tro-lua-dao-dat-coc-thue-nha-tren-mang",
    title: "Cảnh giác 5 chiêu trò lừa đảo đặt cọc thuê nhà trên mạng xã hội và cách phòng tránh",
    summary:
      "Tổng hợp các hình thức giả mạo chủ nhà, dùng hình ảnh ảo đăng giá rẻ giật gân để chiếm đoạt tiền cọc và giải pháp xác thực tin đăng an toàn qua HomeSpace.",
    coverImage:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1000&q=80",
    category: "legal",
    categoryLabel: "Pháp lý",
    tags: ["Cảnh báo lừa đảo", "An toàn thuê nhà", "Pháp lý"],
    isFeatured: false,
    publishedAt: "05 thg 8, 2026",
    views: 4320,
    readTimeMinutes: 5,
    author: {
      name: "Luật sư Trần Văn Bảo",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      role: "Cố vấn pháp lý HomeSpace",
    },
  },

  // 9. Additional Article 9
  {
    id: "news-9",
    slug: "thue-nha-chung-cu-mini-hay-can-ho-dich-vu",
    title: "Nên thuê chung cư mini hay căn hộ dịch vụ cao cấp: So sánh chi phí và chất lượng sống",
    summary:
      "Bài toán so sánh chi tiết giữa việc tự chi trả các hóa đơn phụ phí tại chung cư mini và gói dịch vụ trọn gói tại căn hộ dịch vụ.",
    coverImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80",
    category: "guide",
    categoryLabel: "Cẩm nang",
    tags: ["Chung cư mini", "Căn hộ dịch vụ", "So sánh"],
    isFeatured: false,
    publishedAt: "01 thg 8, 2026",
    views: 1650,
    readTimeMinutes: 4,
    author: {
      name: "Lê Thu Thảo",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "Biên tập viên đời sống",
    },
  },

  // 10. Additional Article 10
  {
    id: "news-10",
    slug: "xu-huong-nha-thong-minh-smart-home-trong-can-ho-thue",
    title: "Ứng dụng thiết bị Smart Home: Lợi thế cạnh tranh mới giúp chủ nhà tăng giá thuê 15%",
    summary:
      "Khóa vân tay thông minh, hệ thống chiếu sáng tự động và rèm điện tử đang trở thành những tiện ích được người thuê săn đón nhiệt tình.",
    coverImage:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80",
    category: "trend",
    categoryLabel: "Xu hướng",
    tags: ["Smart Home", "Công nghệ", "Tăng giá trị thuê"],
    isFeatured: false,
    publishedAt: "28 thg 7, 2026",
    views: 980,
    readTimeMinutes: 5,
    author: {
      name: "Hoàng Đức Nam",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      role: "Nhà đầu tư cho thuê",
    },
  },

  // 11. Additional Article 11
  {
    id: "news-11",
    slug: "quy-trinh-ban-giao-va-nghiem-thu-can-ho-khi-tra-nha",
    title: "Quy trình nghiệm thu và bàn giao nhà khi kết thúc hợp đồng thuê: Tránh mất cọc oan",
    summary:
      "Checklist 10 hạng mục cần kiểm tra cùng chủ nhà khi trả phòng để đảm bảo nhận lại 100% tiền đặt cọc đúng thời hạn.",
    coverImage:
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1000&q=80",
    category: "guide",
    categoryLabel: "Cẩm nang",
    tags: ["Trả phòng", "Hoàn tiền cọc", "Biên bản bàn giao"],
    isFeatured: false,
    publishedAt: "25 thg 7, 2026",
    views: 2120,
    readTimeMinutes: 5,
    author: {
      name: "Lê Thu Thảo",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "Biên tập viên đời sống",
    },
  },

  // 12. Additional Article 12
  {
    id: "news-12",
    slug: "thi-truong-cho-thue-mat-bang-kinh-doanh-fnb-da-nang",
    title: "Thị trường cho thuê mặt bằng thương mại và Shophouse ven biển Đà Nẵng đón làn sóng du lịch",
    summary:
      "Tỷ lệ lấp đầy mặt bằng kinh doanh ẩm thực và khách sạn boutique tại khu vực biển Mỹ Khê tăng trưởng ấn tượng trong năm 2026.",
    coverImage:
      "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1000&q=80",
    category: "market",
    categoryLabel: "Thị trường",
    tags: ["Đà Nẵng", "Mặt bằng kinh doanh", "Shophouse"],
    isFeatured: false,
    publishedAt: "20 thg 7, 2026",
    views: 1340,
    readTimeMinutes: 4,
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "Chuyên gia phân tích thị trường",
    },
  },
];
