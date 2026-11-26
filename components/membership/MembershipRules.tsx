/** Every membership rule, once. Native <details> keeps it keyboard-operable. */
const RULES: { title: string; items: string[] }[] = [
  {
    title: "Khi nào trừ lượt đăng tin?",
    items: [
      "Tạo, lưu tin nháp và chỉnh sửa nội dung hoàn toàn miễn phí.",
      "Chỉ khi gửi duyệt tin mới hoặc đăng lại, gửi duyệt lại tin mới cần 1 lượt đăng khả dụng.",
    ],
  },
  {
    title: "Tin đã đăng có bị ẩn khi gói hết hạn?",
    items: [
      "Không. Tin đang hiển thị vẫn công khai cho đến khi hết thời hạn hiển thị riêng của tin đó, kể cả khi gói hội viên đã hết hạn.",
    ],
  },
  {
    title: "Nâng cấp trong 24 giờ đầu",
    items: [
      "Trong 24 giờ kể từ lần mua gói trả phí đầu tiên, nâng cấp lên gói cao hơn chỉ thanh toán phần chênh lệch giá.",
      "Lượt được tính lại từ đầu theo định mức gói mới. Tin đang chờ duyệt vẫn giữ lượt.",
    ],
  },
  {
    title: "Đổi gói và mua lại",
    items: [
      "Các gói thay thế nhau, không cộng dồn. Sau 24 giờ đầu, mua gói mới tính nguyên giá và kết thúc lượt gói cũ chưa dùng.",
      "Chỉ mua lại cùng gói khi đã dùng hết lượt gói. Không hạ xuống gói thấp hơn khi gói hiện tại còn hạn.",
    ],
  },
  {
    title: "Gói Free và lượt mua thêm",
    items: [
      "Gói Free dùng trọn đời: 3 lượt miễn phí, hồi lại mỗi 30 ngày tính từ ngày tạo tài khoản, không cộng dồn.",
      "Lượt gói được dùng trước lượt mua thêm. Lượt mua thêm có hạn dùng riêng và được giữ nguyên khi đổi gói.",
    ],
  },
];

export default function MembershipRules() {
  return (
    <section aria-labelledby="membership-rules-title" className="space-y-3">
      <h2 id="membership-rules-title" className="text-lg font-bold text-foreground">
        Quy tắc sử dụng lượt đăng
      </h2>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {RULES.map((rule) => (
          <details key={rule.title} className="group">
            <summary className="cursor-pointer rounded-2xl px-5 py-3.5 text-sm font-semibold text-foreground marker:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              {rule.title}
            </summary>
            <ul className="list-disc space-y-1.5 pb-4 pl-10 pr-5 text-sm leading-relaxed text-muted-foreground">
              {rule.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
