import { contactLink, publicLinks, supportEmail } from "./navigation";

type FooterPath = (typeof publicLinks)[keyof typeof publicLinks]["href"];
export type PublicInfoPath = Exclude<FooterPath, "/news">;

type ContentLink = { href: string; label: string };

type InfoPage = {
  title: string;
  category: string;
  intro: string;
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    items?: string[];
    link?: ContentLink;
  }[];
  related: ContentLink[];
};

const rentals = { href: "/rent", label: "Xem nhà cho thuê" };
const contactEmail = { href: `mailto:${supportEmail}`, label: supportEmail };

export const publicInfoPages: Record<PublicInfoPath, InfoPage> = {
  "/about": {
    title: "Về HomeSpace",
    category: "Dự án khoá luận",
    intro: "HomeSpace là dự án khoá luận về trải nghiệm thuê nhà, từ lúc tìm kiếm đến khi hai bên xem lại các thoả thuận.",
    sections: [
      {
        id: "muc-tieu",
        title: "Bài toán của dự án",
        paragraphs: ["Khi tìm nhà, người thuê thường phải đối chiếu giá, chi phí phát sinh, điều kiện đặt cọc và tình trạng căn nhà ở nhiều chỗ. HomeSpace thử đưa các thông tin này vào cùng một hành trình để hai bên dễ đặt câu hỏi và kiểm tra trước khi quyết định."],
      },
      {
        id: "trai-nghiem",
        title: "Bạn có thể trải nghiệm gì?",
        paragraphs: ["Bạn có thể xem tin đăng công khai và đọc các hướng dẫn mà không cần tài khoản. Bản demo minh hoạ cách tìm nhà theo khu vực, làm rõ điều kiện thuê, đặt lịch xem nhà và theo dõi các bước thực hiện thoả thuận."],
      },
      {
        id: "pham-vi",
        title: "Phạm vi trình diễn",
        paragraphs: ["Các kịch bản khoá luận minh hoạ cách thông tin được trình bày và đối chiếu. Hãy dùng dữ liệu mô phỏng khi chạy thử và xem phần thông tin của từng tin đăng để biết nội dung nào dùng cho trình diễn."],
      },
    ],
    related: [publicLinks.projects, rentals],
  },
  "/projects": {
    title: "Dự án tiêu biểu",
    category: "Dự án khoá luận",
    intro: "Ba kịch bản giả định để thử cách HomeSpace hỗ trợ từng bước trong hành trình thuê nhà.",
    sections: [
      {
        id: "tim-nha",
        title: "Demo tìm căn nhà trong ngân sách",
        paragraphs: ["Một sinh viên muốn ở gần trường và có trần chi phí 5 triệu đồng mỗi tháng. Kịch bản demo dùng bộ lọc khu vực và bảng so sánh để người thuê tính cả tiền thuê, gửi xe và chi phí đi lại trước khi chọn căn nhà để xem."],
      },
      {
        id: "xem-nha",
        title: "Demo đặt lịch và ghi chú khi xem nhà",
        paragraphs: ["Hai người thuê cần đi xem nhà cùng nhau. Trong kịch bản demo, họ chọn khung giờ, ghi lại tình trạng thiết bị và đối chiếu thông tin nhìn thấy tại chỗ với ảnh trên tin đăng."],
      },
      {
        id: "thoa-thuan",
        title: "Demo kiểm tra thoả thuận đặt cọc",
        paragraphs: ["Hai bên dùng một giao dịch mô phỏng để kiểm tra số tiền, mốc bàn giao và điều kiện hoàn cọc. Sau thao tác thử, họ so sánh trạng thái hiển thị với chứng từ mô phỏng để phát hiện bước còn thiếu."],
      },
    ],
    related: [publicLinks.depositGuide, publicLinks.housingCriteria],
  },
  "/careers": {
    title: "Tuyển dụng & Sự nghiệp",
    category: "Về HomeSpace",
    intro: "HomeSpace là dự án khoá luận. Hiện dự án chưa mở vị trí tuyển dụng.",
    sections: [
      {
        id: "vai-tro",
        title: "Các vai trò trong một dự án như HomeSpace",
        paragraphs: ["Một nhóm có thể phân công nghiên cứu nhu cầu thuê nhà, thiết kế trải nghiệm, phát triển phần mềm và kiểm thử kịch bản. Với tính năng đặt lịch, người thiết kế mô tả cách đổi lịch và người kiểm thử xác nhận cả người thuê lẫn người cho thuê đều xem được thời gian mới."],
      },
      {
        id: "gop-y",
        title: "Trao đổi về khoá luận",
        paragraphs: ["Nếu bạn muốn góp ý hoặc trao đổi học thuật, có thể gửi chủ đề quan tâm, mô tả ngắn và câu hỏi cụ thể qua kênh hỗ trợ."],
      },
    ],
    related: [publicLinks.projects, contactLink],
  },
  "/press": {
    title: "Thông tin báo chí",
    category: "Về HomeSpace",
    intro: "Thông tin tham khảo dành cho người viết bài hoặc giới thiệu về dự án khoá luận HomeSpace.",
    sections: [
      {
        id: "mo-ta",
        title: "Thông tin giới thiệu",
        paragraphs: ["HomeSpace là bản demo khoá luận khảo sát cách người thuê tìm, xem và đối chiếu thông tin nhà cho thuê. Dự án minh hoạ các bước từ tin đăng công khai đến đặt lịch và theo dõi thoả thuận thuê nhà."],
      },
      {
        id: "minh-hoa",
        title: "Khi trích dẫn nội dung hoặc ảnh",
        paragraphs: ["Hãy ghi chú «Bản demo khoá luận HomeSpace» khi dùng ảnh giao diện hoặc mô tả ví dụ. Dùng ảnh chứa dữ liệu mô phỏng và che tên, số điện thoại, địa chỉ riêng hoặc mã giao dịch nếu ảnh có thông tin cá nhân."],
      },
      {
        id: "trao-doi",
        title: "Câu hỏi về dự án",
        paragraphs: ["Khi liên hệ, hãy cho biết chủ đề, nội dung muốn xác nhận và thời điểm dự kiến sử dụng tư liệu để nhóm dự án hiểu yêu cầu."],
      },
    ],
    related: [publicLinks.news, contactLink],
  },
  "/support": {
    title: "Trung tâm hỗ trợ",
    category: "Hỗ trợ khách hàng",
    intro: "Tìm hướng dẫn theo tình huống hoặc gửi câu hỏi cho nhóm HomeSpace qua email.",
    sections: [
      {
        id: "tim-va-xem-nha",
        title: "Khi tìm hoặc xem nhà",
        paragraphs: ["Nếu thiếu thông tin về giá, phí hoặc tình trạng căn nhà, hãy đối chiếu tin đăng và hỏi người đăng trước khi hẹn xem. Bạn có thể dùng danh sách tiêu chí để ghi chú những gì đã kiểm tra tại chỗ."],
        link: publicLinks.housingCriteria,
      },
      {
        id: "loi-xac-minh",
        title: "Khi gặp lỗi xác minh",
        paragraphs: ["Kiểm tra quyền camera và mức độ rõ nét của ảnh. Nếu cần báo lỗi, hãy ghi lại thông báo lỗi, thời điểm và thiết bị đang dùng. Giữ ảnh giấy tờ, mật khẩu và mã xác thực trong luồng bảo mật dành cho chúng."],
        link: { href: "/privacy#xac-minh-danh-tinh", label: "Cách HomeSpace dùng dữ liệu xác minh" },
      },
      {
        id: "lien-he",
        title: "Liên hệ HomeSpace",
        paragraphs: ["Hãy mô tả bước đang thực hiện, kết quả bạn mong đợi và điều xảy ra trên màn hình. Nếu câu hỏi liên quan đến tin đăng, hãy đính kèm liên kết. Che thông tin cá nhân trước khi gửi ảnh màn hình."],
        link: contactEmail,
      },
    ],
    related: [publicLinks.depositGuide, publicLinks.privacy],
  },
  "/deposit-guide": {
    title: "Hướng dẫn đặt cọc",
    category: "Hướng dẫn thuê nhà",
    intro: "Các điểm cần kiểm tra trước khi đặt cọc và cách đọc trạng thái trong kịch bản Smart Contract của bản demo.",
    sections: [
      {
        id: "truoc-khi-dat-coc",
        title: "Trước khi đặt cọc",
        paragraphs: ["Xem căn nhà và xác nhận người có quyền cho thuê. Đối chiếu địa chỉ, số tiền, người nhận và thông tin thanh toán với thoả thuận đang hiển thị."],
        items: ["Xác định thời hạn giữ chỗ và ngày dự kiến bàn giao.", "Đọc điều kiện hoàn cọc và cách xử lý nếu một bên đổi lịch hoặc huỷ.", "Giữ một bản thoả thuận và hỏi lại những mục còn thiếu trước khi chuyển tiền."],
      },
      {
        id: "vi-du-demo",
        title: "Ví dụ mô phỏng với Smart Contract",
        paragraphs: ["Trong kịch bản demo, hai bên kiểm tra một thoả thuận bằng dữ liệu giả và theo dõi trạng thái xác nhận. Trạng thái kỹ thuật cho biết thao tác nào đã được ghi nhận. Việc hoàn cọc hoặc xử lý tranh chấp còn phụ thuộc vào thoả thuận và tình huống thực tế."],
      },
      {
        id: "sau-khi-thao-tac",
        title: "Sau khi thao tác",
        paragraphs: ["Kiểm tra lại trạng thái và giữ chứng từ cùng mã tham chiếu nếu có. Nếu màn hình còn chờ hoặc số tiền không khớp, hãy đối chiếu chứng từ với người nhận hoặc liên hệ hỗ trợ trước khi thực hiện thêm giao dịch."],
      },
    ],
    related: [publicLinks.housingCriteria, contactLink],
  },
  "/housing-criteria": {
    title: "Tiêu chí xem nhà",
    category: "Hướng dẫn thuê nhà",
    intro: "Danh sách giúp bạn kiểm tra căn nhà, so sánh chi phí và ghi lại các mục cần hai bên xác nhận trước khi thuê.",
    sections: [
      {
        id: "tai-cho",
        title: "Kiểm tra khi đến xem",
        paragraphs: ["Đối chiếu địa chỉ, diện tích, hình ảnh và danh sách thiết bị với tin đăng. Thử mở vòi nước, bật đèn, khoá cửa và hỏi về lối thoát hiểm, chỗ gửi xe, giờ ra vào."],
        items: ["Quan sát dấu ẩm, mùi, độ thông gió, ánh sáng và tiếng ồn.", "Chụp lại hư hỏng sẵn có khi người cho thuê đồng ý, rồi ghi vào biên bản bàn giao."],
      },
      {
        id: "chi-phi",
        title: "Tính tổng chi phí",
        paragraphs: ["Ghi riêng tiền thuê, điện, nước, internet, gửi xe và phí theo tháng. Ví dụ giả định, tiền thuê 4 triệu đồng và phí cố định 500.000 đồng tương đương 4,5 triệu đồng mỗi tháng trước các khoản tính theo mức sử dụng."],
      },
      {
        id: "ban-giao",
        title: "Làm rõ điều kiện bàn giao",
        paragraphs: ["Hỏi về thiết bị có sẵn, hạng mục sẽ sửa, mốc bàn giao và điều kiện báo trước khi chuyển đi. Ghi lại các điểm đã thống nhất để đối chiếu khi đọc thoả thuận. Đây là danh sách tham khảo khi xem nhà."],
      },
    ],
    related: [rentals, publicLinks.depositGuide],
  },
  "/privacy": {
    title: "Chính sách quyền riêng tư",
    category: "Thông tin sử dụng",
    intro: "Tìm hiểu dữ liệu HomeSpace dùng cho từng tính năng, cách xác minh danh tính qua VNPT và nơi gửi yêu cầu về quyền riêng tư.",
    sections: [
      {
        id: "du-lieu",
        title: "Dữ liệu khi sử dụng HomeSpace",
        paragraphs: ["Bạn có thể duyệt tin đăng công khai, đọc tin tức và xem các trang hướng dẫn mà không cần đăng nhập. Khi tạo tài khoản hoặc dùng tính năng có đăng nhập, dữ liệu liên quan có thể gồm thông tin tài khoản và hồ sơ, tin đăng, nội dung liên hệ, lịch hẹn, thoả thuận và thông tin giao dịch bạn cung cấp để thực hiện tính năng tương ứng.", "Hồ sơ công khai và tin đăng công khai có thể hiển thị cho người khác. Kiểm tra nội dung và ảnh trước khi đăng để tránh đưa lên thông tin cá nhân ngoài dự kiến."],
      },
      {
        id: "xac-minh-danh-tinh",
        title: "Xác minh danh tính qua VNPT eKYC",
        paragraphs: ["Khi bạn chủ động bắt đầu xác minh, HomeSpace gửi ảnh hai mặt căn cước công dân (CCCD) và ảnh khuôn mặt đến VNPT eKYC để kiểm tra giấy tờ và đối chiếu danh tính. Kết quả có thể gồm dữ liệu đọc từ giấy tờ, mức độ khớp khuôn mặt và trạng thái kiểm tra. HomeSpace dùng kết quả để cập nhật hồ sơ xác minh và xét quyền dùng những tính năng yêu cầu xác minh.", "Bạn có thể thoát trước khi bắt đầu hoặc quay lại xác minh sau. Để gửi giấy tờ và ảnh khuôn mặt, hãy dùng luồng xác minh trong HomeSpace."],
      },
      {
        id: "ghi-nhan-cuc-bo",
        title: "Ghi nhận đã đọc trên thiết bị",
        paragraphs: ["Khi bạn bấm Tôi đã hiểu, trình duyệt ghi nhớ lựa chọn để ẩn thông báo ở lần truy cập sau. Lựa chọn chỉ được lưu trên trình duyệt đang dùng. Xoá dữ liệu của trang web có thể làm thông báo xuất hiện lại."],
      },
      {
        id: "lien-he-quyen-rieng-tu",
        title: "Câu hỏi về dữ liệu của bạn",
        paragraphs: ["Bạn có thể xem và sửa thông tin hồ sơ trong tài khoản. Với câu hỏi về dữ liệu, quyền truy cập, sửa hoặc xoá dữ liệu, hãy gửi yêu cầu đến địa chỉ hỗ trợ bên dưới. Mô tả dữ liệu và tính năng liên quan. Giữ mật khẩu, mã xác thực và bản chụp giấy tờ trong các luồng bảo mật dành cho chúng."],
        link: contactEmail,
      },
    ],
    related: [publicLinks.terms, contactLink],
  },
  "/terms": {
    title: "Điều khoản sử dụng",
    category: "Thông tin sử dụng",
    intro: "Các nguyên tắc khi xem và dùng những tính năng của bản demo khoá luận HomeSpace.",
    sections: [
      {
        id: "quyen-truy-cap",
        title: "Truy cập và tài khoản",
        paragraphs: ["Bạn có thể xem tin đăng và hướng dẫn công khai mà không cần tài khoản. Một số thao tác như quản lý tin đăng hoặc tham gia thoả thuận có thể yêu cầu đăng nhập hoặc xác minh danh tính. Hãy bảo vệ thông tin đăng nhập và dùng tài khoản của chính mình."],
      },
      {
        id: "noi-dung-nguoi-dung",
        title: "Trách nhiệm khi đăng nội dung",
        paragraphs: ["Đăng thông tin đúng về căn nhà mà bạn có quyền giới thiệu. Khi giá, phí hoặc thời điểm nhận nhà thay đổi, hãy cập nhật tin đăng để người xem có thông tin mới. Giữ kín dữ liệu của người khác trừ khi bạn được phép công bố."],
      },
      {
        id: "giao-dich",
        title: "Thoả thuận và giao dịch",
        paragraphs: ["Hãy đọc và xác nhận điều kiện trực tiếp với bên còn lại trước khi thanh toán hoặc ký. Ví dụ và dữ liệu ghi nhãn demo chỉ dùng để minh hoạ. Khi chạy thử các bước, hãy dùng dữ liệu giả và chứng từ mô phỏng."],
      },
      {
        id: "ho-tro",
        title: "Phản hồi và báo cáo",
        paragraphs: ["Nếu phát hiện tin đăng sai thông tin hoặc gặp sự cố khi thử tính năng, hãy gửi liên kết và tóm tắt sự việc cho nhóm hỗ trợ."],
        link: contactLink,
      },
    ],
    related: [publicLinks.privacy, publicLinks.depositGuide],
  },
};
