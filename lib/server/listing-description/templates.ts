// Server only. Blank line = new paragraph, line = sentence (see renderDescription in generator.ts).
// Fixed wording may greet, advise or invite, but must never claim anything about the property.

export const GREETINGS = {
  ROOM: [
    "Chào bạn đang tìm phòng trọ!",
    "Xin chào, nếu bạn đang cần thuê phòng thì mời xem qua tin này.",
    "Bạn đang tìm một chỗ ở mới?",
    "Gửi đến bạn thông tin một phòng trọ đang cho thuê.",
    "Chào bạn, mời bạn tham khảo phòng dưới đây.",
    "Dành cho bạn nào đang cần tìm phòng.",
  ],
  APARTMENT: [
    "Chào bạn đang tìm thuê căn hộ!",
    "Xin chào, mời bạn tham khảo căn hộ đang cho thuê dưới đây.",
    "Bạn đang cần một căn hộ để thuê?",
    "Gửi đến bạn thông tin một căn hộ chung cư cho thuê.",
    "Chào bạn, tin này dành cho người đang tìm căn hộ.",
    "Mời bạn xem qua thông tin căn hộ sau đây.",
  ],
  HOUSE: [
    "Chào bạn đang tìm thuê nhà!",
    "Xin chào, mời bạn tham khảo căn nhà đang cho thuê dưới đây.",
    "Bạn đang cần thuê nhà để ở?",
    "Gửi đến bạn thông tin một căn nhà nguyên căn cho thuê.",
    "Chào bạn, tin này dành cho người đang tìm nhà thuê.",
    "Mời bạn xem qua thông tin căn nhà sau đây.",
  ],
};

export const CLOSINGS = [
  "Bạn hãy đặt lịch xem trên HomeSpace để xem trực tiếp trước khi quyết định.",
  "Nếu thấy phù hợp, mời bạn đặt lịch hẹn xem qua HomeSpace.",
  "Hãy nhắn tin cho chủ nhà trên HomeSpace nếu bạn cần hỏi thêm.",
  "Mời bạn chọn một khung giờ xem phù hợp ngay trên HomeSpace.",
  "Bạn còn điều gì băn khoăn thì cứ trao đổi với chủ nhà qua HomeSpace nhé.",
  "Rất mong được đón bạn đến xem vào thời gian thuận tiện cho bạn.",
  "Đừng ngại đặt lịch xem để tự mình kiểm tra mọi thông tin trong tin đăng.",
];

const ROOM: string[] = [
// 01: thân thiện, mở đầu bằng lời chào
`{greet}
Phòng {code} đang được cho thuê, diện tích {area}.
Địa chỉ phòng ở {location}.

Về không gian sinh hoạt, phòng có {sanitary}.
Chuyện nấu nướng: {kitchen}.
Thông tin thêm về phòng: {comfort}.
Vị trí trong nhà là {floor}.
Tình trạng nội thất là {furnishing}.
Các đồ được bàn giao gồm {assets}.
Tiện ích đi kèm: {amenities}.

Giá thuê là {price}.
{?negotiable}Mức giá này bạn vẫn có thể [[thương lượng|trao đổi thêm]] với chủ nhà.
Khi thuê, bạn {depositClause} và ở tối thiểu {lease}.
Chi phí hằng tháng được ghi rõ: {fees}.

Phòng nhận tối đa {occupants}.
Số xe được gửi tối đa là {vehicles}.
Về giờ giấc và lối ra vào: {routine}.
Đồng hồ tính phí: {meters}.
Chuyện gửi xe: {parking}.
Bạn có thể dọn vào từ ngày {date}.
{cta}`,

// 02: đi thẳng vào giá
`Cho thuê phòng trọ giá {price}, diện tích {area}.
{?negotiable}Giá có thể thương lượng.
Điều kiện thuê rất rõ ràng: {depositClause}, thời hạn thuê từ {lease} trở lên.

Mã phòng: {code}.
Khu vực: {location}.
Nội thất: {furnishing}.
Trang thiết bị bàn giao: {assets}.
Nhà vệ sinh: {sanitary}.
Bếp: {kitchen}.
Đặc điểm khác: {comfort}.
Tầng: {floor}.

Các khoản phải trả thêm hoặc đã bao gồm: {fees}.
Đồng hồ: {meters}.

Quy định ở: tối đa {occupants}.
Giới hạn xe: {vehicles}.
Ra vào: {routine}.
Gửi xe: {parking}.
Tiện ích: {amenities}.

Phòng sẵn sàng bàn giao từ {date}.
{cta}`,

// 03: kể theo hướng "nếu bạn cần"
`Nếu bạn đang cần một phòng khoảng {area} để ở, phòng {code} là một lựa chọn để cân nhắc.
Phòng được cho thuê với tình trạng {furnishing}.

Bước vào phòng, bạn sẽ dùng {sanitary}.
Với việc bếp núc, phòng thuộc dạng {kitchen}.
Chủ tin cũng cho biết phòng {comfort}.
Đồ đạc có sẵn để bạn sử dụng là {assets}.

Còn về vị trí, địa chỉ là {location}.
Phòng nằm ở {floor}.
Những tiện ích được liệt kê gồm {amenities}.
Việc đi lại hằng ngày theo quy định: {routine}.
Về xe cộ, {parking}.
Mỗi phòng được để tối đa {vehicles}.

Chi phí cần tính đến trước tiên là tiền phòng {price}.
Tiếp theo là các khoản hằng tháng, cụ thể: {fees}.
Điện nước được theo dõi bằng {meters}.
Lúc nhận phòng, bạn {depositClause}.
Chủ nhà cần người thuê gắn bó ít nhất {lease}.
{?negotiable}Bạn hoàn toàn có thể đề xuất mức giá khác để hai bên cùng bàn.

Số người ở không quá {occupants}.
Thời điểm nhận phòng sớm nhất là ngày {date}.
{cta}`,

// 04: hỏi và đáp
`Bạn muốn biết phòng này rộng bao nhiêu và giá thế nào? Phòng {code} có diện tích {area}, giá thuê {price}.
{?negotiable}Chủ nhà đồng ý để bạn thương lượng giá.

Phòng ở đâu? Câu trả lời là {location}.

Trong phòng có gì? Nội thất thuộc mức {furnishing}.
Danh sách bàn giao có {assets}.
Phòng được bố trí {sanitary}.
Phần bếp: {kitchen}.
Ngoài ra phòng {comfort}.
Tiện ích bạn được dùng: {amenities}.
Phòng thuộc {floor}.

Hằng tháng tốn thêm những gì? Bảng phí gồm: {fees}.
Công tơ sử dụng: {meters}.

Cần chuẩn bị gì khi thuê? Bạn {depositClause}, đồng thời thuê tối thiểu {lease}.
Phòng dành cho tối đa {occupants}.
Số lượng xe tối đa: {vehicles}.
Nội quy ra vào: {routine}.
Chỗ gửi xe: {parking}.

Khi nào dọn đến được? Từ ngày {date} trở đi.
{cta}`,

// 05: ngắn gọn, chuyên nghiệp, mở bằng địa chỉ
`Phòng trọ cho thuê tại {location}.
Phòng mang mã {code}, có diện tích sử dụng {area} và hiện được cho thuê ở mức {furnishing}.

Giá thuê niêm yết {price}.
{?negotiable}Giá niêm yết còn có thể trao đổi.
Người thuê {depositClause}.
Thời hạn hợp đồng tối thiểu là {lease}.
Phí định kỳ được áp dụng như sau: {fees}.
Phương thức theo dõi điện, nước: {meters}.

Công trình vệ sinh là {sanitary}.
Khu vực nấu ăn được xác định là {kitchen}.
Các đặc điểm của phòng: {comfort}.
Phòng được bố trí tại {floor}.
Hạng mục bàn giao kèm theo: {assets}.
Tiện ích được cung cấp: {amenities}.

Sức chứa tối đa của phòng là {occupants}.
Phương tiện đăng ký tối đa: {vehicles}.
Chế độ sinh hoạt: {routine}.
Phương án để xe: {parking}.
Ngày có thể bàn giao: {date}.

Quý khách quan tâm vui lòng kiểm tra lịch xem trong tin đăng.
{cta}`,

// 06: giọng trẻ trung
`Tin cho hội đang săn phòng đây: phòng {code} rộng {area} đang chờ người thuê mới.
Tiền phòng là {price}, bạn nhớ ghi lại để so sánh nhé.
{?negotiable}Giá còn thương lượng được, cứ mạnh dạn hỏi.

Xem nhanh bên trong nè: {sanitary}.
Muốn nấu ăn thì lưu ý: {kitchen}.
Vài điểm cần biết thêm: {comfort}.
Đồ có sẵn gồm {assets}.
Nói gọn về nội thất thì là {furnishing}.
Còn tiện ích thì có {amenities}.

Phòng nằm tại {location}.
Bạn sẽ ở {floor}.
Đi sớm về muộn ra sao: {routine}.
Xe cộ thì {parking}.
Số xe tối đa bạn mang theo được là {vehicles}.

Giờ tới phần ví tiền.
Phí mỗi tháng: {fees}.
Điện nước đo bằng {meters}.
Lúc thuê bạn {depositClause}.
Thời gian thuê ít nhất {lease}.

Phòng ở được tối đa {occupants}, bạn nào định ở ghép nhớ để ý.
Ngày dọn vào được: {date}.
{cta}`,

// 07: nội thất trước
`Điểm đầu tiên nhiều người hỏi là đồ đạc: phòng {code} được bàn giao ở mức {furnishing}.
Cụ thể, bạn sẽ nhận {assets}.
Kèm theo đó là các tiện ích: {amenities}.

Tổng diện tích phòng là {area}.
Bên trong, khu vệ sinh là {sanitary}.
Khu nấu ăn: {kitchen}.
Về ánh sáng, ban công và gác, phòng {comfort}.
Phòng đặt ở {floor}.

Địa chỉ để bạn tiện tính quãng đường: {location}.
Quy định đi lại gồm {routine}.
Về xe, {parking}.

Giá cho thuê là {price}.
{?negotiable}Nếu có đề xuất về giá, bạn cứ trao đổi.
Để nhận phòng, bạn {depositClause}.
Thời gian thuê tối thiểu được đặt ra là {lease}.
Ngoài tiền phòng, hãy lưu ý: {fees}.
Phần công tơ gồm {meters}.

Chủ nhà nhận tối đa {occupants} cho phòng này.
Giới hạn phương tiện là {vehicles}.
Nhận phòng từ {date}.
{cta}`,

// 08: checklist trước khi thuê
`Trước khi đi xem phòng, bạn có thể rà nhanh những thông tin dưới đây của phòng {code}.

Thứ nhất là kích thước: {area}.
Thứ hai là chi phí thuê: {price}.
{?negotiable}Khoản này được ghi là có thể thương lượng.
Thứ ba là tiền cọc, với phòng này bạn {depositClause}.
Thứ tư là cam kết thời gian, tối thiểu {lease}.

Thứ năm là phí sinh hoạt: {fees}.
Đi cùng với đó là cách đo điện nước: {meters}.

Về vật chất trong phòng, bạn nên biết có {sanitary}.
Mức nội thất: {furnishing}.
Phần nấu nướng: {kitchen}.
Cấu trúc phòng: {comfort}.
Đồ đạc cần đối chiếu khi nhận: {assets}.
Tiện ích nên kiểm tra: {amenities}.

Về nội quy, số người tối đa là {occupants}.
Số xe tối đa là {vehicles}.
Chuyện ra vào: {routine}.
Chuyện gửi xe: {parking}.

Địa chỉ xem phòng thuộc {location}.
Tầng cần tìm là {floor}.
Mốc thời gian có thể dọn vào là {date}.
{cta}`,

// 09: nhẹ nhàng, chân thành
`Mình đang có một phòng trọ muốn tìm người thuê, mã phòng {code}.
Mình xin giới thiệu thật rõ để bạn đỡ mất công hỏi lại.
Phòng rộng {area}.

Mình cho thuê với giá {price}.
{?negotiable}Nếu bạn thấy cần bàn thêm về giá, mình sẵn lòng lắng nghe.
Khi vào ở, bạn {depositClause} giúp mình.
Mình mong bạn thuê từ {lease} trở lên.

Trong phòng, bạn được dùng {sanitary}.
Chỗ nấu ăn thì {kitchen}.
Mình cũng nói trước là phòng {comfort}.
Nội thất mình giao ở mức {furnishing}.
Những món bạn sẽ nhận: {assets}.
Tiện ích bạn có thể dùng: {amenities}.

Hằng tháng, các khoản được tính thế này: {fees}.
Để minh bạch, phòng dùng {meters}.

Phòng ở {floor}.
Địa chỉ là {location}.
Mỗi phòng mình nhận tối đa {occupants}.
Về xe, mỗi phòng tối đa {vehicles}.
Thông tin gửi xe: {parking}.
Nề nếp ra vào: {routine}.

Từ ngày {date} là bạn có thể chuyển đến.
{cta}`,

// 10: tiêu đề từng mục
`Thông tin phòng {code}: diện tích {area}, nội thất ở mức {furnishing}.

Tiền phòng: {price}.
{?negotiable}Có hỗ trợ thương lượng.
Về cọc: {depositClause}.
Thuê ngắn nhất: {lease}.
Phí hằng tháng: {fees}.

Vệ sinh: {sanitary}.
Nấu ăn: {kitchen}.
Chi tiết: {comfort}.
Vị trí tầng: {floor}.
Bàn giao: {assets}.

Số người: tối đa {occupants}.
Số xe: tối đa {vehicles}.
Lối đi và giờ giấc: {routine}.
Để xe: {parking}.
Công tơ: {meters}.
Tiện ích: {amenities}.

Địa chỉ: {location}.
Ngày nhận phòng: {date}.
{cta}`,

// 11: mở bằng ngày nhận phòng
`Phòng nhận khách mới từ ngày {date}.
Đó là phòng {code}, diện tích {area}, giá {price}.
{greet}

Nơi bạn sẽ ở có địa chỉ {location}.
Cụ thể hơn, phòng nằm ở {floor}.
Về số người, phòng nhận tối đa {occupants}.

Đi vào chi tiết, phòng gồm {sanitary}.
Phương án bếp là {kitchen}.
Hiện trạng được mô tả là {comfort}.
Mức trang bị: {furnishing}.
Bạn được giao sử dụng {assets}.
Danh mục tiện ích có {amenities}.

Sinh hoạt hằng ngày theo hướng {routine}.
Phương tiện của bạn: {parking}.
Số xe tối đa được chấp nhận là {vehicles}.

Về tài chính, các phí ngoài tiền phòng được liệt kê là {fees}.
Chỉ số tiêu thụ ghi qua {meters}.
Hợp đồng kéo dài tối thiểu {lease}.
Trước khi nhận phòng, bạn {depositClause}.
{?negotiable}Giá thuê vẫn để ngỏ cho việc thương lượng.

{cta}`,

// 12: súc tích kiểu người bận rộn
`Bạn bận rộn và chỉ muốn đọc những ý chính? Đây: phòng {code}, {area}, {price}.
Cọc và thời hạn: {depositClause}, thuê ít nhất {lease}.
{?negotiable}Giá thương lượng được.

Địa điểm: {location}, mời bạn thử ước lượng quãng đường đi làm, đi học của riêng mình.

Có sẵn trong phòng: {sanitary}.
Đồ bàn giao: {assets}.
Nội thất nói chung: {furnishing}.
Nấu ăn: {kitchen}.
Lưu ý về phòng: {comfort}.
Tiện ích: {amenities}.
Ở tại {floor}.

Phí tháng: {fees}.
Điện nước: {meters}.

Tối đa {occupants} cùng ở.
Tối đa {vehicles} được gửi.
Để xe: {parking}.
Giờ giấc, lối đi: {routine}.
Dọn vào từ {date}.

Đọc xong thấy ổn thì bước tiếp theo rất đơn giản.
{cta}`,

// 13: bắt đầu từ chi phí sinh hoạt
`Khi thuê trọ, tiền phòng thôi chưa đủ, phí hằng tháng cũng cần rõ ngay từ đầu.
Với phòng {code}, các khoản phí là {fees}.
Đồng hồ dùng để tính: {meters}.

Tiền thuê phòng là {price} cho không gian {area}.
{?negotiable}Bạn được quyền thương lượng khoản tiền thuê.
Về đặt cọc, bạn {depositClause}.
Thời hạn thấp nhất cho một lần thuê là {lease}.

Chất lượng ở mỗi ngày phụ thuộc vào những thứ cụ thể, nên bạn hãy xem kỹ.
Phòng có {sanitary}.
Việc nấu ăn: {kitchen}.
Bên cạnh đó, phòng {comfort}.
Độ hoàn thiện nội thất là {furnishing}.
Đồ dùng đi kèm: {assets}.
Tiện ích được ghi nhận: {amenities}.

Phòng tọa lạc ở {location}.
Phòng nằm tại {floor}.
Quy định gồm số người ở tối đa là {occupants}.
Xe tối đa: {vehicles}.
Về lối ra vào: {routine}.
Về gửi xe: {parking}.

Lịch bàn giao sớm nhất: {date}.
{cta}`,

// 14: kể một ngày sinh hoạt (không thêm dữ kiện)
`Hãy thử hình dung việc ở tại phòng {code} qua từng thông tin thực tế.

Buổi sáng, chuyện vệ sinh cá nhân gắn với {sanitary}.
Đến bữa ăn, bạn cần nhớ phòng thuộc kiểu {kitchen}.
Khi ra khỏi nhà và trở về, quy định là {routine}.
Chiếc xe của bạn thì sao: {parking}.

Không gian của bạn rộng {area}.
Trong đó, phòng {comfort}.
Nội thất đi cùng thuộc loại {furnishing}.
Bạn có trong tay {assets}.
Quanh việc sinh hoạt còn có {amenities}.
Chỗ ở này thuộc {floor}.

Cuối tháng, bạn thanh toán tiền phòng {price}.
Cộng thêm hoặc đã gộp là các mục: {fees}.
Số điện, số nước được chốt theo {meters}.
{?negotiable}Trước khi chốt, bạn có thể thương lượng giá thuê.

Để bắt đầu, bạn {depositClause} và đăng ký ở tối thiểu {lease}.
Bạn được ở cùng người khác miễn tổng số không vượt quá {occupants}.
Lượng xe đăng ký không quá {vehicles}.

Địa chỉ phòng: {location}.
Ngày có thể bắt đầu cuộc sống mới: {date}.
{cta}`,

// 15: trang trọng
`Kính gửi quý khách đang có nhu cầu thuê phòng.
Chúng tôi xin thông tin về phòng {code} với diện tích {area}.
Đơn giá cho thuê được xác định là {price}.
{?negotiable}Đơn giá có thể được hai bên thỏa thuận lại.

Về điều khoản chính, quý khách {depositClause}.
Thời gian thuê tối thiểu được áp dụng là {lease}.
Các chi phí định kỳ bao gồm: {fees}.
Việc đo đếm được thực hiện qua {meters}.

Về hiện trạng, phòng được trang bị {sanitary}.
Mức độ nội thất được ghi nhận là {furnishing}.
Khu vực chế biến thức ăn: {kitchen}.
Đặc điểm kiến trúc: {comfort}.
Tài sản bàn giao gồm có {assets}.
Tiện ích kèm theo gồm có {amenities}.

Về vị trí, phòng thuộc địa chỉ {location}.
Phòng được đặt tại {floor}.

Về quy định cư trú, số người ở tối đa là {occupants}.
Số phương tiện tối đa là {vehicles}.
Chế độ ra vào: {routine}.
Chế độ giữ xe: {parking}.
Phòng có thể được bàn giao kể từ ngày {date}.

Trân trọng cảm ơn quý khách đã quan tâm.
{cta}`,

// 16: dành cho người ở ghép / tính số người
`Bạn định ở một mình hay ở cùng bạn bè? Phòng {code} cho phép tối đa {occupants}.
Diện tích để mọi người sinh hoạt là {area}.

Khu vệ sinh được bố trí dạng {sanitary}.
Muốn tự nấu thì cần biết: {kitchen}.
Một số đặc điểm đáng lưu tâm: {comfort}.
Tầng ở: {floor}.

Đồ đạc trong phòng được bàn giao gồm {assets}.
Mức nội thất tương ứng là {furnishing}.
Tiện ích mọi người được sử dụng: {amenities}.

Khi chia tiền, bạn có thể bắt đầu từ giá phòng {price}.
Sau đó cộng các khoản theo danh sách: {fees}.
Công tơ của phòng: {meters}.
{?negotiable}Giá phòng còn có thể bàn lại.
Người đứng ra thuê {depositClause}.
Cả nhóm cần xác định ở ít nhất {lease}.

Phương tiện tối đa cho phòng là {vehicles}.
Thông tin gửi xe: {parking}.
Quy định đi về: {routine}.

Phòng thuộc khu vực {location}.
Thời gian nhận phòng tính từ {date}.
{cta}`,

// 17: liệt kê mạch văn liền
`Đang cho thuê: phòng trọ mã {code}, rộng {area}, được giao ở tình trạng {furnishing}.
Mức giá chủ nhà đưa ra là {price}.
{?negotiable}Con số này chưa cố định, bạn có thể thương lượng.

Đi từ cửa vào, những gì bạn cần biết là {sanitary}.
Góc bếp được khai báo: {kitchen}.
Phòng cũng được mô tả là {comfort}.
Khi bàn giao, hai bên sẽ kiểm đếm {assets}.
Người thuê còn được sử dụng {amenities}.

Trước khi ký, mời bạn đọc kỹ phần tiền bạc: bạn {depositClause}, hợp đồng tối thiểu {lease}.
Mỗi tháng có các mục phí sau: {fees}.
Về đo điện và nước, phòng áp dụng {meters}.

Sống chung với quy định cũng quan trọng không kém.
Trong phòng tối đa {occupants}.
Gửi kèm tối đa {vehicles}.
Cách ra vào là {routine}.
Về giữ xe, {parking}.

Tìm đến phòng theo địa chỉ {location}.
Phòng ở trên {floor}.
Bạn dọn đồ đến được từ ngày {date}.
{cta}`,

// 18: nhấn vào minh bạch
`Tin đăng này ghi đúng những gì chủ nhà đã khai báo, để bạn dễ đối chiếu khi đến xem phòng {code}.

Địa chỉ: {location}.
Diện tích khai báo: {area}.
Tầng khai báo: {floor}.

Phần trong phòng gồm {sanitary}.
Bếp được ghi là {kitchen}.
Cửa sổ, ban công và gác: {comfort}.
Hiện trạng đồ đạc: {furnishing}.
Biên bản bàn giao dự kiến có {assets}.
Tiện ích đã đăng ký: {amenities}.

Phần chi phí gồm tiền thuê {price}.
{?negotiable}Tiền thuê được đánh dấu là có thể thương lượng.
Bạn {depositClause}.
Các phí còn lại: {fees}.
Loại công tơ: {meters}.

Phần quy định gồm thời hạn thuê tối thiểu {lease}.
Giới hạn người ở: {occupants}.
Giới hạn xe: {vehicles}.
Đi lại: {routine}.
Đỗ xe: {parking}.
Ngày trống để nhận: {date}.

Nếu thực tế bạn thấy có điểm nào cần làm rõ, hãy hỏi ngay khi xem phòng.
{cta}`,

// 19: nhấn vào bàn giao và dọn vào
`Chuyển chỗ ở sẽ nhẹ hơn khi bạn biết trước mình được nhận những gì.
Với phòng {code}, đó là {assets}.
Tổng thể nội thất ở mức {furnishing}.

Phòng bạn dọn đến có diện tích {area}.
Phần vệ sinh là {sanitary}.
Phần bếp được xếp vào loại {kitchen}.
Bạn cũng nên biết phòng {comfort}.
Tiện ích đi cùng gồm {amenities}.

Điểm đến của chuyến dọn đồ là {location}.
Đồ đạc của bạn sẽ được chuyển đến {floor}.
Về xe của bạn, {parking}.
Chủ tin giới hạn tối đa {vehicles}.
Chuyện giờ về nhà: {routine}.

Ngày sớm nhất để chuyển vào là {date}.
Trước ngày đó, bạn {depositClause}.
Giá thuê hằng kỳ là {price}.
{?negotiable}Giá vẫn có thể điều chỉnh qua thương lượng.
Thời gian ở tối thiểu là {lease}.

Sau khi dọn vào, các khoản phí gồm {fees}.
Chỉ số được theo dõi bằng {meters}.
Số thành viên trong phòng không vượt quá {occupants}.
{cta}`,

// 20: cô đọng, nhiều câu ngắn, kết bằng giá
`{greet}
Tên phòng là {code}.
Phòng rộng {area}.
Phòng ở được tối đa {occupants}.

Bên trong có {sanitary}.
Nội thất được xác định là {furnishing}.
Bếp thì sao? Thông tin là {kitchen}.
Còn nữa, phòng {comfort}.
Đồ nhận kèm: {assets}.
Tiện ích: {amenities}.

Địa chỉ nằm ở {location}.
Phòng thuộc {floor}.
Ra vào theo quy định {routine}.
Gửi xe theo hình thức sau: {parking}.
Xe tối đa: {vehicles}.

Điện nước có {meters}.
Phí tháng được công bố: {fees}.
Ngày vào ở: {date}.

Cuối cùng là điều bạn quan tâm nhất.
Giá thuê {price}.
{?negotiable}Có thể thương lượng thêm.
Bạn {depositClause}, thuê tối thiểu {lease}.
{cta}`,
];

const APARTMENT: string[] = [
// 01
`{greet}
Căn hộ thuộc {project}, diện tích {area}, nằm ở {floor}.
Địa chỉ của căn hộ là {location}.
Căn hộ thuộc tòa/block {block}.
Quy mô tòa nhà là {buildingFloors}.

Cơ cấu căn hộ gồm {rooms}.
Về hướng, căn hộ có {directions}.
Tầm nhìn được mô tả là {view}.
Tình trạng nội thất là {furnishing}.
Những thiết bị được bàn giao gồm {assets}.
Tiện ích đi kèm: {amenities}.

Giá thuê là {price}.
{?negotiable}Bạn có thể [[thương lượng|trao đổi]] thêm về mức giá này.
Khi thuê, bạn {depositClause}.
Thời hạn thuê tối thiểu là {lease}.
Các chi phí hằng tháng gồm: {fees}.

Số người ở tối đa là {occupants}.
Bạn có thể nhận nhà từ ngày {date}.
{cta}`,

// 02
`Cho thuê căn hộ {area} tại dự án {project} với giá {price}.
{?negotiable}Giá thuê có thể thương lượng.

Tiền cọc: {depositClause}.
Thời gian thuê: tối thiểu {lease}.
Phí hằng tháng: {fees}.

Vị trí tầng: {floor}.
Block: {block}.
Tổng số tầng của tòa: {buildingFloors}.
Số phòng: {rooms}.
Hướng: {directions}.
View: {view}.
Nội thất: {furnishing}.
Thiết bị kèm theo: {assets}.

Tiện ích: {amenities}.
Sức chứa tối đa: {occupants}.

Địa chỉ: {location}.
Ngày bàn giao sớm nhất: {date}.
{cta}`,

// 03
`Bạn đang tìm một căn hộ có cơ cấu {rooms}? Vậy hãy xem qua căn hộ ở {project}.
Tổng diện tích căn là {area}, vị trí tại {floor}.

Nội thất của căn thuộc nhóm {furnishing}.
Khi nhận nhà, bạn được bàn giao {assets}.
Cùng với đó là các tiện ích {amenities}.

Nếu bạn quan tâm đến hướng nhà, thông tin là {directions}.
Nếu bạn quan tâm đến tầm nhìn, chủ nhà mô tả: {view}.
Về tòa nhà, căn nằm ở block {block}.
Công trình cao {buildingFloors}.
Địa chỉ cụ thể thuộc {location}.

Chi phí thuê là {price}.
{?negotiable}Chủ nhà để ngỏ khả năng thương lượng.
Bạn {depositClause} và thuê ít nhất {lease}.
Mỗi tháng, những khoản cần nắm là {fees}.

Căn hộ dành cho tối đa {occupants}.
Thời điểm có thể vào ở là {date}.
{cta}`,

// 04
`Dự án: {project}.
Đó là nơi có căn hộ {area} đang cần người thuê.
Căn nằm ở {floor} và được chia thành {rooms}.

Muốn biết căn hộ ở đâu, bạn xem địa chỉ sau: {location}.
Tên tòa trong dự án là {block}.
Tòa nhà gồm {buildingFloors}.

Bước vào trong, mức hoàn thiện nội thất là {furnishing}.
Danh sách đồ đạc có {assets}.
Cư dân thuê căn này có các tiện ích: {amenities}.
Thông số hướng gồm {directions}.
Về view, tin ghi nhận {view}.

Tiền thuê được đặt ở mức {price}.
{?negotiable}Mức này có thể bàn bạc lại.
Khoản cọc được quy định như sau: bạn {depositClause}.
Hợp đồng thuê kéo dài từ {lease}.
Phần phí phát sinh định kỳ: {fees}.

Gia đình hoặc nhóm thuê tối đa {occupants}.
Lịch nhận nhà bắt đầu từ {date}.
{cta}`,

// 05
`Kính mời quý khách tham khảo căn hộ cho thuê tại {project}.
Căn hộ có diện tích {area} và được bố trí tại {floor}.

Về công năng, căn hộ bao gồm {rooms}.
Về phương hướng, căn hộ được ghi nhận có {directions}.
Về tầm nhìn, thông tin được cung cấp là {view}.
Về mức độ trang bị, căn hộ ở tình trạng {furnishing}.
Tài sản bàn giao gồm {assets}.
Các tiện ích được liệt kê gồm {amenities}.

Đơn giá thuê là {price}.
{?negotiable}Đơn giá có thể được thỏa thuận.
Quý khách {depositClause}.
Thời hạn thuê tối thiểu là {lease}.
Các khoản chi phí định kỳ được quy định gồm {fees}.

Địa chỉ căn hộ: {location}.
Tòa nhà: {block}.
Số tầng của tòa nhà: {buildingFloors}.
Số người cư trú tối đa: {occupants}.
Ngày bàn giao: từ {date}.

Trân trọng cảm ơn quý khách.
{cta}`,

// 06
`Nhà mới của bạn có thể là căn hộ {area} này ở {project}.
Cứ đọc hết thông tin rồi hãy quyết định nhé.

Trước hết là các phòng: {rooms}.
Kế đến là tầng, căn ở {floor}.
Còn đây là hướng: {directions}.
Mở cửa nhìn ra thì có gì? Theo chủ nhà, view là {view}.

Đồ đạc thì khỏi phải đoán: nội thất được xếp loại {furnishing}.
Bạn sẽ nhận {assets}.
Tiện ích có thể dùng gồm {amenities}.

Tới chuyện tiền nong.
Mỗi kỳ bạn trả tiền thuê {price}.
{?negotiable}Bạn thử thương lượng cũng được.
Lúc đầu bạn {depositClause}.
Bạn cần thuê tối thiểu {lease}.
Phí hằng tháng thì như vầy: {fees}.

Căn ở được nhiều nhất {occupants}.
Đường đến nhà: {location}.
Block cần tìm: {block}.
Tòa này có {buildingFloors}.
Dọn vào từ {date}.
{cta}`,

// 07
`Phần nội thất thường quyết định chi phí ban đầu khi chuyển nhà.
Căn hộ tại {project} được cho thuê ở mức {furnishing}.
Các món bàn giao cụ thể là {assets}.

Căn rộng {area}, gồm {rooms}.
Bạn sẽ ở {floor}.
Tòa nhà chứa căn hộ là {block}.
Tổng chiều cao công trình: {buildingFloors}.

Ngoài đồ trong căn, tin còn nêu các tiện ích {amenities}.
Thông tin phong thủy mà nhiều người hay hỏi là {directions}.
Tầm nhìn từ căn hộ: {view}.

Về giá, chủ nhà cho thuê {price}.
{?negotiable}Có thể thương lượng trực tiếp.
Về cọc, bạn {depositClause}.
Về thời hạn, tối thiểu là {lease}.
Về phí tháng, bao gồm {fees}.

Giới hạn người ở là {occupants}.
Căn hộ tọa lạc tại {location}.
Có thể nhận bàn giao từ ngày {date}.
{cta}`,

// 08
`Ba con số bạn nên nhớ về căn hộ này: diện tích {area}, giá {price} và thời hạn thuê tối thiểu {lease}.
{?negotiable}Riêng giá thuê có thể thương lượng.
Căn hộ thuộc {project}.

Về tiền cọc, bạn {depositClause}.
Chi phí đi kèm mỗi tháng gồm {fees}.

Không gian được chia thành {rooms}.
Vị trí theo chiều cao là {floor}.
Hướng của căn: {directions}.
Hướng nhìn: {view}.

Chất lượng bàn giao được mô tả bằng mức {furnishing}.
Đồ dùng có trong biên bản: {assets}.
Tiện ích đi cùng: {amenities}.

Thông tin địa điểm là {location}.
Khu block: {block}.
Quy mô: {buildingFloors}.
Căn nhận tối đa {occupants}.
Ngày có thể chuyển đến: {date}.
{cta}`,

// 09
`Mình cần tìm người thuê cho căn hộ ở {project}.
Căn có diện tích {area}, ở {floor}, và mình muốn chia sẻ đầy đủ để bạn dễ cân nhắc.

Bên trong căn gồm {rooms}.
Nội thất mình bàn giao ở mức {furnishing}.
Cụ thể, bạn sẽ có {assets}.
Về tiện ích, mình ghi nhận {amenities}.
Nếu bạn để ý hướng, căn có {directions}.
Còn tầm nhìn thì mình mô tả là {view}.

Mình để giá {price}.
{?negotiable}Bạn muốn thương lượng thì mình sẵn sàng trao đổi.
Mình đề nghị bạn {depositClause}.
Mình ưu tiên người thuê từ {lease} trở lên.
Để bạn tính ngân sách, phí hằng tháng là {fees}.

Căn phù hợp quy định tối đa {occupants}.
Bạn tìm đến địa chỉ {location}.
Tên tòa là {block}.
Cả tòa có {buildingFloors}.
Mình có thể giao nhà từ {date}.
{cta}`,

// 10
`Địa chỉ cho thuê: {location}.
Đây là căn hộ thuộc {project}, diện tích {area}.
Căn đặt tại {floor}.
Mã tòa/block là {block}.
Độ cao của tòa nhà là {buildingFloors}.

Giá thuê hiện tại là {price}.
{?negotiable}Giá còn thương lượng.
Mức cọc áp dụng: {depositClause}.
Thời gian gắn bó tối thiểu: {lease}.
Phí sử dụng hằng tháng: {fees}.

Căn hộ có {rooms}.
Nội thất đi kèm ở mức {furnishing}.
Trang bị được giao: {assets}.
Danh sách tiện ích: {amenities}.

Chi tiết về hướng: {directions}.
Chi tiết về view: {view}.
Quy định số người: không quá {occupants}.
Ngày nhận nhà: từ {date} trở đi.

Trước khi đến xem, bạn nên ghi sẵn các câu hỏi để trao đổi được trọn vẹn.
{cta}`,

// 11
`Từ ngày {date}, căn hộ tại {project} có thể đón người thuê mới.
Căn có diện tích {area}.
{greet}

Cách bố trí phòng: {rooms}.
Tầng của căn hộ: {floor}.
Cùng với đó là {directions}.
Góc nhìn được chủ nhà giới thiệu là {view}.

Mức nội thất bạn nhận được là {furnishing}.
Các tài sản đi cùng căn hộ gồm {assets}.
Về tiện ích, bạn có {amenities}.

Chi phí chính là tiền thuê {price}.
Chi phí định kỳ khác gồm {fees}.
{?negotiable}Riêng tiền thuê, hai bên có thể thỏa thuận thêm.
Về khoản cọc, bạn {depositClause}.
Thời hạn thuê bắt đầu từ mức tối thiểu {lease}.

Vị trí: {location}.
Tòa: {block}.
Số tầng của tòa: {buildingFloors}.
Số người ở không quá {occupants}.
{cta}`,

// 12
`Dành cho người thích đọc nhanh.
Dự án {project}, căn {area}, giá {price}.
Cơ cấu: {rooms}.
Tầng: {floor}.
{?negotiable}Giá thương lượng được.

Nội thất: {furnishing}.
Đồ kèm theo: {assets}.
Tiện ích: {amenities}.
Hướng: {directions}.
View: {view}.

Cọc và thời hạn: bạn {depositClause}, thuê ít nhất {lease}.
Phí tháng: {fees}.
Người ở: tối đa {occupants}.

Địa chỉ: {location}.
Block: {block}.
Tòa cao {buildingFloors}.
Trống từ {date}.

Thông tin nào quan trọng với bạn, hãy kiểm tra lại tận nơi khi đi xem.
{cta}`,

// 13
`Thuê căn hộ không chỉ có tiền thuê, nên tin này nói về phí trước.
Các khoản hằng tháng của căn là {fees}.
Bên cạnh đó, tiền thuê là {price}.
{?negotiable}Khoản tiền thuê có thể được thương lượng.

Để bắt đầu, bạn {depositClause}.
Thời gian thuê ngắn nhất được chấp nhận là {lease}.

Đổi lại, bạn có một căn hộ rộng {area} tại {project}.
Trong căn có {rooms}.
Nội thất được bàn giao theo mức {furnishing}.
Những gì đã có sẵn là {assets}.
Phần tiện ích gồm {amenities}.

Về vị trí trong tòa, căn thuộc {floor}.
Block của căn: {block}.
Tòa có tổng cộng {buildingFloors}.
Căn sở hữu {directions}.
Phần view được ghi là {view}.
Địa chỉ: {location}.

Nhà nhận tối đa {occupants}.
Bạn có thể vào ở kể từ {date}.
{cta}`,

// 14
`Khi đi làm về, điều bạn cần là một nơi ở có thông tin rõ ràng từ đầu.
Căn hộ này nằm trong {project}, rộng {area}.

Trong nhà, các phòng gồm {rooms}.
Đồ đạc ở mức {furnishing}.
Bạn có sẵn {assets} để sử dụng.
Quanh cuộc sống thường ngày còn có {amenities}.

Căn ở trên {floor}.
Hướng được khai báo là {directions}.
Khi nói về khung nhìn, tin ghi {view}.

Địa chỉ nhà là {location}.
Bạn đi vào block {block}.
Tòa nhà có {buildingFloors}.

Về ngân sách, tiền nhà là {price}.
{?negotiable}Bạn có cơ hội thương lượng khoản này.
Phí đi cùng: {fees}.
Tiền cọc theo quy định: bạn {depositClause}.
Kỳ thuê tối thiểu: {lease}.

Số thành viên sống trong căn tối đa là {occupants}.
Ngày dọn về sớm nhất là {date}.
{cta}`,

// 15
`Thông báo cho thuê căn hộ chung cư tại dự án {project}.
Diện tích căn hộ là {area}.
Vị trí căn hộ là {floor}.
Công năng sử dụng gồm {rooms}.

Giá cho thuê được công bố ở mức {price}.
{?negotiable}Bên cho thuê chấp nhận thương lượng.
Bên thuê {depositClause}.
Thời hạn hợp đồng không ngắn hơn {lease}.
Chi phí hằng tháng áp dụng cho căn hộ: {fees}.

Hiện trạng nội thất được xếp vào mức {furnishing}.
Danh mục tài sản bàn giao: {assets}.
Danh mục tiện ích: {amenities}.

Địa chỉ: {location}.
Block: {block}.
Tổng số tầng: {buildingFloors}.
Hướng: {directions}.
Tầm nhìn: {view}.
Số người ở tối đa theo đăng ký là {occupants}.
Thời gian bàn giao từ ngày {date}.

Mọi chi tiết nên được hai bên xác nhận lại khi xem nhà.
{cta}`,

// 16
`Cả nhà đang cân nhắc chuyển đến một căn hộ mới? Hãy bắt đầu bằng cách xem số phòng: {rooms}.
Diện tích chung của căn là {area}.
Quy định về số người ở là tối đa {occupants}.

Căn thuộc dự án {project}.
Nơi ở nằm tại {floor}.
Địa chỉ để cả nhà tính đường đi làm, đi học là {location}.
Tên block: {block}.
Tòa nhà có quy mô {buildingFloors}.

Đồ đạc sẽ nhận gồm {assets}.
Nhìn chung, căn ở tình trạng {furnishing}.
Các tiện ích cả nhà được dùng: {amenities}.
Hướng của căn hộ gồm {directions}.
Tầm nhìn được nhắc đến là {view}.

Ngân sách thuê là {price}.
{?negotiable}Có thể ngồi lại thương lượng giá.
Người đại diện thuê {depositClause}.
Cả nhà cần ở ít nhất {lease}.
Phí sinh hoạt hằng tháng: {fees}.

Lịch chuyển nhà có thể bắt đầu từ {date}.
{cta}`,

// 17
`Một căn hộ {area} ở {project} đang được mở cho thuê.
Điểm qua cấu trúc, căn có {rooms}.
Căn được xếp ở {floor}, thuộc block {block}.

Bạn sẽ nhận nhà trong tình trạng {furnishing}.
Khi giao nhà, hai bên cùng kiểm đếm {assets}.
Ngoài phạm vi căn hộ, tin nêu thêm {amenities}.
Người coi trọng hướng nhà có thể tham khảo: {directions}.
Người thích ngắm cảnh có thể lưu ý view {view}.

Mức giá là {price}.
{?negotiable}Giá chưa chốt cứng.
Cùng với giá là các khoản {fees}.
Về thủ tục, bạn {depositClause} rồi thuê trong tối thiểu {lease}.

Số người ở được giới hạn ở {occupants}.
Tòa nhà có tất cả {buildingFloors}.
Địa chỉ dẫn đến căn hộ: {location}.
Ngày có thể bàn giao là từ {date}.
{cta}`,

// 18
`Để bạn tiện đối chiếu, dưới đây là toàn bộ thông tin chính của căn hộ tại {project}.

Về căn nhà: diện tích {area}.
Về số phòng: {rooms}.
Về tầng: {floor}.
Về block: {block}.
Về chiều cao tòa: {buildingFloors}.
Về hướng: {directions}.
Về view: {view}.

Về nội thất: {furnishing}.
Về tài sản giao kèm: {assets}.
Về tiện ích: {amenities}.

Về tiền thuê: {price}.
{?negotiable}Về thương lượng: chủ nhà đồng ý trao đổi giá.
Về đặt cọc: bạn {depositClause}.
Về thời hạn: tối thiểu {lease}.
Về phí tháng: {fees}.

Về người ở: tối đa {occupants}.
Về địa chỉ: {location}.
Về ngày nhận nhà: từ {date}.

Có điểm nào chưa rõ, bạn nên hỏi trước khi quyết định.
{cta}`,

// 19
`Nếu bạn sắp chuyển nơi ở, hãy lưu lại tin về căn hộ {project} này.
Ngày bàn giao có thể từ {date}.

Chuyển đến, bạn nhận một căn {area} ở {floor}.
Đồ đã có trong nhà gồm {assets}.
Nhờ vậy, bạn biết rõ mức nội thất là {furnishing} và tự lên danh sách đồ cần mang theo.

Số phòng để sắp xếp đồ đạc: {rooms}.
Tiện ích đi kèm nơi ở mới: {amenities}.
Căn được ghi có {directions}.
View theo mô tả: {view}.

Điểm đến là {location}.
Block cần tìm: {block}.
Tòa gồm {buildingFloors}.

Trước khi chuyển, bạn {depositClause}.
Sau đó, tiền thuê là {price}.
{?negotiable}Bạn có thể thương lượng trước khi chốt.
Phí hằng tháng cần dự trù: {fees}.
Thời hạn ở tối thiểu: {lease}.
Tổng người ở cùng không quá {occupants}.
{cta}`,

// 20
`{greet}
Nói ngắn gọn, đây là căn hộ {area} thuộc {project}.
Bạn sẽ có {rooms}.
Căn ở {floor}.

Nội thất ra sao? Câu trả lời: {furnishing}.
Có món gì? Có {assets}.
Còn tiện ích? Gồm {amenities}.

Hướng thế nào? Căn có {directions}.
Nhìn ra đâu? Chủ nhà ghi: {view}.

Ở đâu? Tại {location}.
Thuộc tòa {block}.
Tòa cao {buildingFloors}.
Ở được tối đa {occupants}.

Giá bao nhiêu? Giá là {price}.
{?negotiable}Thương lượng được.
Cần gì để thuê? Bạn {depositClause} và thuê tối thiểu {lease}.
Phí mỗi tháng: {fees}.
Bao giờ vào ở? Từ ngày {date}.
{cta}`,
];

const HOUSE: string[] = [
// 01
`{greet}
Căn nhà nguyên căn có tổng diện tích sử dụng {area}, kết cấu {floors}.
Địa chỉ nhà ở {location}.

Công năng của nhà gồm {rooms}.
Các thông số về đất và đường trước nhà: {dimensions}.
Ngoài ra, nhà có {extras}.
Hình thức ra vào là {access}.
Tình trạng nội thất là {furnishing}.
Những tài sản được bàn giao gồm {assets}.
Tiện ích đi kèm: {amenities}.

Giá thuê là {price}.
{?negotiable}Bạn có thể [[thương lượng|trao đổi]] thêm với chủ nhà về giá.
Khi thuê, bạn {depositClause}.
Thời hạn thuê tối thiểu là {lease}.
Chi phí hằng tháng gồm: {fees}.

Nhà nhận tối đa {occupants}.
Số xe tối đa là {vehicles}.
Bạn có thể nhận nhà từ ngày {date}.
{cta}`,

// 02
`Cho thuê nhà nguyên căn {floors}, diện tích sử dụng {area}, giá {price}.
{?negotiable}Giá có thể thương lượng.

Đặt cọc: {depositClause}.
Thời hạn: tối thiểu {lease}.
Chi phí tháng: {fees}.

Số phòng: {rooms}.
Kích thước và mặt tiền: {dimensions}.
Hạng mục thêm: {extras}.
Lối vào: {access}.

Mức nội thất: {furnishing}.
Bàn giao: {assets}.
Tiện ích: {amenities}.

Người ở: tối đa {occupants}.
Phương tiện: tối đa {vehicles}.

Vị trí: {location}.
Ngày bàn giao: {date}.
{cta}`,

// 03
`Gia đình bạn đang cần một ngôi nhà có {rooms}? Căn nhà này được xây {floors} với tổng diện tích sử dụng {area}.

Điều đáng xem tiếp theo là khuôn đất, gồm {dimensions}.
Nhà còn có {extras}.
Về lối vào, nhà dùng {access}.

Nội thất của nhà ở mức {furnishing}.
Khi nhận nhà, bạn được giao {assets}.
Tiện ích được liệt kê kèm theo là {amenities}.

Về chi phí, tiền thuê nhà là {price}.
{?negotiable}Chủ nhà để ngỏ việc thương lượng.
Gia đình {depositClause}.
Hợp đồng cần kéo dài ít nhất {lease}.
Những khoản chi mỗi tháng được ghi như sau: {fees}.

Số người sinh sống tối đa là {occupants}.
Nhà để được tối đa {vehicles}.
Địa chỉ để cả nhà tính chuyện đi lại là {location}.
Thời gian dọn vào sớm nhất là {date}.
{cta}`,

// 04
`Tại {location} đang có một căn nhà nguyên căn cho thuê.
Nhà gồm {floors}, tổng diện tích sử dụng đạt {area}.

Đi từ ngoài vào trong, trước hết là thông số {dimensions}.
Đường vào nhà theo dạng {access}.
Bên trong được chia thành {rooms}.
Công trình còn bao gồm {extras}.

Đồ đạc được xác định ở mức {furnishing}.
Danh mục giao nhà gồm {assets}.
Người thuê có thể dùng các tiện ích {amenities}.

Chủ nhà đưa ra giá {price}.
{?negotiable}Mức giá này có thể bàn lại.
Về tiền cọc, bạn {depositClause}.
Về thời gian, bạn cần thuê từ {lease}.
Về phí định kỳ, có {fees}.

Giới hạn người ở của nhà là {occupants}.
Giới hạn xe là {vehicles}.
Ngày nhận nhà tính từ {date}.
{cta}`,

// 05
`Trân trọng giới thiệu đến quý khách căn nhà cho thuê nguyên căn.
Tổng diện tích sử dụng của nhà là {area}.
Quy mô xây dựng gồm {floors}.

Về công năng, nhà được bố trí {rooms}.
Về quy cách đất và đường trước nhà, thông tin gồm {dimensions}.
Về hạng mục bổ sung, nhà có {extras}.
Về lối vào, nhà áp dụng {access}.

Mức nội thất được ghi nhận là {furnishing}.
Tài sản bàn giao bao gồm {assets}.
Tiện ích bao gồm {amenities}.

Giá thuê đề xuất là {price}.
{?negotiable}Giá đề xuất có thể được thỏa thuận lại.
Quý khách {depositClause}.
Thời hạn thuê tối thiểu được quy định là {lease}.
Các chi phí hằng tháng gồm {fees}.

Địa chỉ: {location}.
Số người cư trú tối đa: {occupants}.
Số phương tiện tối đa: {vehicles}.
Nhà có thể bàn giao từ ngày {date}.

Trân trọng.
{cta}`,

// 06
`Tìm nhà thuê nguyên căn thì xem ngay căn này nhé!
Nhà {floors}, xài được tổng cộng {area}.

Chia phòng ra sao? Gồm {rooms}.
Đất đai, mặt tiền thì: {dimensions}.
Có thêm gì không? Có {extras}.
Ra vào kiểu gì? Nhà có {access}.

Đồ đạc được xếp mức {furnishing}.
Món nào được bàn giao: {assets}.
Tiện ích đi kèm nè: {amenities}.

Tiền thuê là {price}.
{?negotiable}Giá còn bớt được hay không thì bạn cứ thương lượng.
Muốn thuê, bạn {depositClause}.
Thuê ít nhất {lease} nhé.
Hằng tháng còn có: {fees}.

Cả nhà tối đa {occupants}.
Xe thì tối đa {vehicles}.
Nhà ở {location}.
Có thể dọn tới từ {date}.
{cta}`,

// 07
`Trước khi nói đến kết cấu, hãy nói về những gì có sẵn trong nhà.
Căn nhà được bàn giao ở mức {furnishing}.
Các món nằm trong danh sách bàn giao là {assets}.
Tiện ích đi theo nhà gồm {amenities}.

Về quy mô, nhà có {floors} và {area} diện tích sử dụng.
Không gian được phân thành {rooms}.
Phần ngoài nhà và công năng thêm: {extras}.
Số liệu khu đất: {dimensions}.
Cách đi vào nhà: {access}.

Giá thuê trọn căn là {price}.
{?negotiable}Có thể thương lượng thêm về giá.
Tiền cọc theo yêu cầu: bạn {depositClause}.
Thời hạn thuê không dưới {lease}.
Phí cần trả hoặc đã gộp: {fees}.

Nhà dành cho tối đa {occupants}.
Chỗ cho phương tiện được giới hạn tối đa {vehicles}.
Vị trí nhà thuộc {location}.
Lịch giao nhà bắt đầu từ {date}.
{cta}`,

// 08
`Một vài con số nói lên khá nhiều về căn nhà này.
Tổng diện tích sử dụng: {area}.
Số tầng theo kết cấu: {floors}.
Giá thuê: {price}.
{?negotiable}Giá được phép thương lượng.
Thời hạn tối thiểu: {lease}.

Bố trí phòng gồm {rooms}.
Về số đo, nhà có {dimensions}.
Công trình đi kèm: {extras}.
Lối đi được khai báo: {access}.

Nội thất theo phân loại là {furnishing}.
Tài sản nhận cùng nhà: {assets}.
Tiện ích sử dụng được: {amenities}.

Khi vào thuê, bạn {depositClause}.
Chi phí định kỳ của nhà: {fees}.
Tối đa {occupants} được ở trong nhà.
Tối đa {vehicles} được để tại nhà.

Địa chỉ: {location}.
Nhà sẵn lịch bàn giao từ {date}.
{cta}`,

// 09
`Mình đang cho thuê nguyên căn nhà của mình và muốn gửi đến bạn những thông tin thật cụ thể.
Nhà có {floors}, diện tích sử dụng tổng cộng {area}.

Mình bố trí nhà gồm {rooms}.
Nhà mình cũng có {extras}.
Nếu bạn cần số đo, đây là {dimensions}.
Về việc ra vào, nhà có {access}.

Về đồ đạc, mình bàn giao ở mức {furnishing}.
Mình sẽ giao cho bạn {assets}.
Bạn cũng được sử dụng {amenities}.

Mình cho thuê với giá {price}.
{?negotiable}Giá cả mình có thể bàn thêm cùng bạn.
Mong bạn {depositClause} khi nhận nhà.
Mình cần người thuê ổn định tối thiểu {lease}.
Để bạn khỏi bất ngờ, phí hằng tháng gồm {fees}.

Nhà mình nhận nhiều nhất {occupants}.
Xe để tại nhà tối đa {vehicles}.
Địa chỉ nhà là {location}.
Bạn có thể chuyển đến từ {date}.
{cta}`,

// 10
`Nhà cho thuê tại {location}.
Giá thuê trọn căn: {price}.
{?negotiable}Giá thuê có thể thương lượng.

Nhà được xây {floors}, tổng diện tích sử dụng {area}.
Bên trong gồm {rooms}.
Thông số nhà đất: {dimensions}.
Bạn sẽ có thêm {extras}.
Đường vào thuộc loại {access}.

Hiện trạng nội thất: {furnishing}.
Trang thiết bị trao lại cho người thuê: {assets}.
Tiện ích kèm theo: {amenities}.

Tiền cọc và thời hạn: bạn {depositClause}, thuê tối thiểu {lease}.
Chi phí mỗi tháng: {fees}.

Sức chứa theo quy định là {occupants}.
Lượng xe theo quy định là {vehicles}.
Ngày có thể bàn giao nhà là {date}.

Khi đi xem, bạn nên kiểm tra lần lượt từng tầng để đối chiếu với tin đăng.
{cta}`,

// 11
`Ngày {date} là mốc sớm nhất để bạn nhận căn nhà này.
Nhà gồm {floors}, diện tích sử dụng {area}.
{greet}

Các phòng trong nhà: {rooms}.
Nhà còn được trang bị về kết cấu {extras}.
Kích thước ghi nhận: {dimensions}.
Lối vào nhà là {access}.

Mức nội thất đi cùng là {furnishing}.
Tài sản bạn được sử dụng gồm {assets}.
Về tiện ích, nhà đi kèm {amenities}.

Chi phí thuê là {price}.
Bên cạnh tiền thuê là các mục {fees}.
{?negotiable}Giá thuê vẫn có thể thỏa thuận.
Để nhận nhà, bạn {depositClause}.
Kỳ thuê tối thiểu kéo dài {lease}.

Vị trí nhà: {location}.
Người ở không vượt quá {occupants}.
Xe không vượt quá {vehicles}.
{cta}`,

// 12
`Tóm tắt cho người cần quyết nhanh.
Nhà nguyên căn {floors}, {area}, giá {price}.
{?negotiable}Thương lượng được.
Cơ cấu: {rooms}.

Số đo: {dimensions}.
Có: {extras}.
Lối vào: {access}.
Nội thất: {furnishing}.
Giao kèm: {assets}.
Tiện ích: {amenities}.

Cọc và hạn thuê: bạn {depositClause}, tối thiểu {lease}.
Phí tháng: {fees}.
Người ở tối đa: {occupants}.
Xe tối đa: {vehicles}.

Địa chỉ: {location}.
Giao nhà từ: {date}.

Nếu các điều kiện trên khớp với nhu cầu, bước tiếp theo là đến xem tận nơi.
{cta}`,

// 13
`Thuê cả căn nhà là một khoản chi lớn, vì vậy mời bạn xem phần tiền trước.
Tiền thuê là {price}.
{?negotiable}Bạn có thể đề xuất mức giá để thương lượng.
Bạn {depositClause}.
Thời gian thuê tối thiểu là {lease}.
Các khoản phí hằng tháng: {fees}.

Với mức đó, bạn thuê trọn căn có diện tích sử dụng {area}, xây {floors}.
Số phòng gồm {rooms}.
Nhà bao gồm cả {extras}.
Những số đo chính là {dimensions}.
Nhà có {access}.

Phần đồ đạc ở mức {furnishing}.
Đã có sẵn {assets}.
Phần tiện ích có {amenities}.

Số người dọn đến ở được tối đa {occupants}.
Số xe mang theo được tối đa {vehicles}.
Nhà nằm tại {location}.
Thời điểm nhận nhà: từ {date}.
{cta}`,

// 14
`Một ngôi nhà thuê tốt cần khớp với cách cả nhà sinh hoạt, nên hãy đối chiếu từng điểm.

Nhu cầu về phòng: nhà đáp ứng cơ cấu {rooms}.
Nhu cầu về không gian: tổng diện tích sử dụng là {area}, trải trên {floors}.
Nhu cầu khác: nhà có {extras}.

Chuyện đi lại bắt đầu từ cửa nhà với {access}.
Các thông số bên ngoài gồm {dimensions}.
Địa chỉ cụ thể là {location}.
Phương tiện của gia đình được tối đa {vehicles}.

Đồ đạc trong nhà thuộc mức {furnishing}.
Gia đình được nhận {assets}.
Tiện ích dùng hằng ngày: {amenities}.

Mỗi kỳ, tiền nhà là {price}.
{?negotiable}Gia đình có thể thương lượng khoản này.
Các chi phí đi kèm là {fees}.
Khi bắt đầu thuê, bạn {depositClause} và cam kết ở tối thiểu {lease}.

Số thành viên tối đa là {occupants}.
Cả nhà có thể dọn về từ {date}.
{cta}`,

// 15
`Thông tin cho thuê nhà nguyên căn.
Diện tích sử dụng được khai báo là {area}.
Số tầng được khai báo là {floors}.
Giá cho thuê được công bố là {price}.
{?negotiable}Bên cho thuê đồng ý thương lượng giá.

Công năng bao gồm {rooms}.
Quy cách bao gồm {dimensions}.
Hạng mục đi kèm bao gồm {extras}.
Phương thức tiếp cận nhà là {access}.

Tình trạng trang bị được phân loại là {furnishing}.
Tài sản được liệt kê để bàn giao: {assets}.
Tiện ích được liệt kê: {amenities}.

Bên thuê {depositClause}.
Thời hạn thuê tối thiểu bên thuê cần đáp ứng là {lease}.
Chi phí định kỳ: {fees}.

Số người ở tối đa: {occupants}.
Số xe tối đa: {vehicles}.
Địa chỉ tài sản: {location}.
Thời điểm bàn giao: từ ngày {date}.

Đề nghị hai bên xác nhận lại các nội dung trên khi gặp trực tiếp.
{cta}`,

// 16
`Bạn tính thuê nhà cho đại gia đình hay cho nhóm bạn ở chung? Hãy xem quy định trước: nhà nhận tối đa {occupants}.
Về xe cộ, tối đa {vehicles}.

Để chia phòng, nhà có {rooms}.
Tổng diện tích sử dụng là {area} với {floors}.
Mọi người còn có {extras}.
Lối vào của căn nhà thuộc dạng {access}.
Thông tin đo đạc: {dimensions}.

Đồ dùng sẵn cho cả nhà gồm {assets}.
Xét tổng thể, nội thất ở mức {furnishing}.
Tiện ích mọi người cùng dùng: {amenities}.

Khi chia chi phí, hãy lấy tiền thuê {price} làm mốc.
Cộng thêm các mục sau: {fees}.
{?negotiable}Tiền thuê còn có thể thương lượng.
Người đứng tên {depositClause}.
Thời gian ở chung tối thiểu theo hợp đồng là {lease}.

Địa chỉ: {location}.
Có thể chuyển vào kể từ {date}.
{cta}`,

// 17
`Đang tìm người thuê mới cho một căn nhà {floors} với {area} diện tích sử dụng.
Giá chủ nhà mong muốn là {price}.
{?negotiable}Con số này vẫn thương lượng được.

Mở cửa bước vào, bạn sẽ có {rooms}.
Đi cùng căn nhà còn là {extras}.
Với người quan tâm kích thước, nhà có {dimensions}.
Với người quan tâm sự đi lại, nhà có {access}.

Ngày bàn giao, hai bên sẽ kiểm đếm {assets}.
Nhà được giao trong tình trạng {furnishing}.
Danh sách tiện ích đi theo nhà là {amenities}.

Thủ tục tài chính ban đầu: bạn {depositClause}.
Sau đó là các khoản hằng tháng gồm {fees}.
Bạn nên xác định ở ít nhất {lease}.

Nhà cho phép tối đa {occupants}.
Số xe được để là tối đa {vehicles}.
Đường đến nhà theo địa chỉ {location}.
Bạn nhận nhà được từ {date}.
{cta}`,

// 18
`Dưới đây là hồ sơ ngắn của căn nhà để bạn so sánh với những lựa chọn khác.

Quy mô: {floors}.
Diện tích sử dụng: {area}.
Phòng ốc: {rooms}.
Đất và mặt tiền: {dimensions}.
Hạng mục thêm: {extras}.
Đường vào: {access}.

Nội thất: {furnishing}.
Thiết bị giao nhà: {assets}.
Tiện ích: {amenities}.

Giá: {price}.
{?negotiable}Thương lượng: có.
Đặt cọc: bạn {depositClause}.
Hạn thuê ngắn nhất: {lease}.
Phí tháng: {fees}.

Người ở: không quá {occupants}.
Xe: không quá {vehicles}.
Địa chỉ: {location}.
Nhận nhà: từ ngày {date}.

So sánh xong, bạn hãy đến xem để cảm nhận bằng chính mắt mình.
{cta}`,

// 19
`Chuyển nhà là việc nhiều khâu, bắt đầu bằng việc nắm rõ nơi sẽ đến.
Căn nhà bạn chuyển đến có {floors}, tổng diện tích sử dụng {area}.
Địa chỉ nhận đồ là {location}.

Đồ trong nhà đã có {assets}.
Mức nội thất là {furnishing}, bạn dựa vào đó để chọn đồ mang theo.
Để sắp xếp, bạn có {rooms}.
Ngoài ra còn {extras}.

Xe chở đồ cần lưu ý số đo: {dimensions}.
Đường vào là {access}.
Xe của gia đình để tại nhà tối đa {vehicles}.
Tiện ích đi kèm nơi ở mới là {amenities}.

Thời gian chuyển vào sớm nhất là {date}.
Trước đó, bạn {depositClause}.
Giá thuê là {price}.
{?negotiable}Bạn có thể thương lượng giá trước khi ký.
Hợp đồng tối thiểu {lease}.
Phí hằng tháng cần dự trù gồm {fees}.
Số người chuyển về ở tối đa {occupants}.
{cta}`,

// 20
`{greet}
Căn nhà này rộng bao nhiêu? Tổng diện tích sử dụng là {area}.
Cao mấy tầng? Nhà có {floors}.

Có những phòng nào? Có {rooms}.
Còn gì thêm? Thêm {extras}.
Số đo ra sao? Gồm {dimensions}.
Lối vào thế nào? Nhà dùng {access}.

Đồ đạc thì sao? Mức nội thất là {furnishing}.
Bàn giao những gì? Bàn giao {assets}.
Tiện ích có gì? Có {amenities}.

Giá thuê bao nhiêu? Giá là {price}.
{?negotiable}Giá này có thể thương lượng.
Muốn thuê cần gì? Bạn {depositClause}, thuê từ {lease}.
Phí hằng tháng gồm {fees}.

Ở được mấy người? Tối đa {occupants}.
Để được mấy xe? Tối đa {vehicles}.
Nhà ở đâu? Ở {location}.
Khi nào nhận nhà? Từ ngày {date}.
{cta}`,
];

export const TEMPLATES = { ROOM, APARTMENT, HOUSE };
