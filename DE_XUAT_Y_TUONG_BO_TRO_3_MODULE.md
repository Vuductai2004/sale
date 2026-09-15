# TỔNG HỢP CÁC Ý TƯỞNG ĐỀ XUẤT BỔ TRỢ & MỞ RỘNG
## DỰ PHÒNG MỞ RỘNG HỆ THỐNG AI AGENT THƯƠNG MẠI BÁN LẺ TẠI ĐÀI LOAN
### (CẤU TRÚC CHUẨN 3 PHÂN HỆ: MARKETING - SALES - CHĂM SÓC KHÁCH HÀNG)
#### PHÂN TÍCH CHUYÊN SÂU 4 BƯỚC: THỰC TRẠNG — NGUYÊN NHÂN — GIẢI PHÁP — ĐỀ XUẤT

> **MỤC ĐÍCH TÀI LIỆU:**  
> Tài liệu này tổng hợp các ý tưởng sáng tạo, tính năng tiện ích bổ trợ (**Non-Key / Nice-to-have**) được phân định rành mạch theo **3 phân hệ: Marketing, Sales và Chăm sóc khách hàng (CSKH)**.  
> Toàn bộ các đề xuất dưới đây được lưu trữ độc lập, **không đưa vào danh mục 20% tính năng mũi nhọn cốt lõi (KEY)** của Đề án chính, nhằm bảo đảm hệ thống luôn tinh gọn, tập trung cao độ vào các đòn bẩy kinh doanh sống còn của doanh nghiệp.

---

## PHẦN I: MA TRẬN TỔNG HỢP CÁC ĐỀ XUẤT THEO 3 PHÂN HỆ

| Phân Hệ Nghiệp Vụ | Mã Đề Xuất | Tên Đề Xuất Bổ Trợ | Độ Phức Tạp Kỹ Thuật | Nguồn Dữ Liệu Tích Hợp | Giá Trị Gia Tăng Cho Doanh Nghiệp |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **I. MARKETING** | **MKT-EX01** | **Móc Chuyển Đổi RAG Pháp Lý Sang Đơn Hàng** | Rất thấp (Dễ làm) | Cổng hỏi đáp ARC/BHYT + Mã chào mừng | Biến traffic người hỏi luật miễn phí thành khách mua hàng thực tế. |
| | **MKT-EX02** | **Đồng Hành Đổi Địa Bàn & Giữ Chân Khách Mới** | Thấp (Dễ làm) | Lịch sử địa chỉ bưu cục cũ vs mới trên ERP | Giữ chân khách hàng khi chuyển xưởng, chuyển thành phố sinh sống. |
| **II. SALES** | **SALES-EX01** | **Đón Sóng Ngày Lương Mùng 10 Hàng Tháng** | Rất thấp (Dễ làm) | Lịch sử đơn hàng cũ ERP + Kênh LINE/Zalo | Chốt giỏ hàng quen thuộc đúng ngày kiều bào có tiền nhất tháng. |
| | **SALES-EX02** | **Cứu Đơn Hết Hàng Cục Bộ (Out-of-Stock)** | Thấp (Dễ làm) | Danh mục nhóm hàng tương đương trên ERP | Ngăn khách bỏ sang tiệm khác khi một món lẻ trong kho tạm hết. |
| | **SALES-EX03** | **Tìm Kiếm Sản Phẩm Theo Mô Tả Tự Nhiên** | Thấp (Dễ làm) | Semantic Search + Mô tả sản phẩm ERP | Khách mới không nhớ tên mã SKU chuẩn vẫn tìm ra đúng món cần mua. |
| **III. CSKH** | **CSKH-EX01** | **Lịch Chăm Sóc Xe Điện Định Kỳ 30 - 90 Ngày** | Thấp (Dễ làm) | Ngày xuất hóa đơn bán xe trên ERP | Nhắc bảo dưỡng ắc quy/phanh, xây dựng uy tín thương hiệu chu đáo. |
| | **CSKH-EX02** | **Điều Phối & Trấn An Bưu Kiện Khi Bão Lũ** | Trung bình | Webhook đối tác vận chuyển nội địa Đài Loan | Chủ động giải trình khi tuyến giao bưu cục 7-Eleven bị đình hoãn. |

---

## PHẦN II: PHÂN TÍCH CHI TIẾT TỪNG PHÂN HỆ THEO 4 BƯỚC

---

### CHƯƠNG I: PHÂN HỆ MARKETING (AI MARKETING & LEAD GENERATION)

#### ĐỀ XUẤT MKT-EX01: MÓC CHUYỂN ĐỔI RAG PHÁP LÝ THÀNH ĐƠN HÀNG ĐẦU TIÊN
* **1. Thực trạng:**
  * Hệ thống đã có Cổng RAG hỏi đáp thẻ cư trú (ARC), khám chữa bệnh BHYT (健保) và quyền lợi lao động miễn phí. Lượng kiều bào nhắn tin hỏi thủ tục rất đông. Sau khi AI giải đáp chuẩn xác, đa số khách chỉ nhắn: *"Cảm ơn shop nhé"* rồi thoát ra ngoài, không phát sinh bất kỳ đơn hàng nào.
* **2. Nguyên nhân:**
  * Khách hàng tìm đến vì nhu cầu thủ tục hành chính khẩn cấp, chưa có ý định mua sắm hàng hóa ngay lúc đó. Nếu AI chỉ trả lời câu hỏi thuần túy rồi dừng lại thì doanh nghiệp chỉ đang làm công tác thiện nguyện, tốn chi phí hạ tầng AI mà không chuyển hóa được người dùng thành doanh thu.
* **3. Giải pháp:**
  * Thiết kế một "cái móc chuyển đổi" (Conversion Hook) tự nhiên ngay cuối câu trả lời của AI:
    > *"...Thủ tục gia hạn thẻ ARC chỉ cần 3 loại giấy tờ như trên là hoàn tất ạ. Nhân tiện anh/chị đang làm việc/học tập tại Đài Loan, cửa hàng xin gửi tặng anh/chị mã ưu đãi [DONG_HUONG] giảm ngay 30 NTD cho đơn hàng nhu yếu phẩm hoặc đồ ăn quê hương đầu tiên nhận tại siêu thị 7-Eleven gần nhất. Anh/chị bấm vào liên kết bên dưới để chọn món nhé!"*
* **4. Đề xuất:**
  * Cài đặt cơ chế tự động đính kèm mã voucher chào mừng có thời hạn sử dụng 7 ngày; tích hợp đối soát trực tiếp mã voucher với đơn hàng đầu tiên trên ERP để Ban Giám đốc đo lường chính xác tỷ lệ chuyển đổi ROI từ cổng RAG pháp lý.

---

#### ĐỀ XUẤT MKT-EX02: ĐỒNG HÀNH ĐỔI ĐỊA BÀN & GIỮ CHÂN KHÁCH HÀNG KHI CHUYỂN NƠI Ở
* **1. Thực trạng:**
  * Cộng đồng kiều bào (lao động công xưởng, du học sinh) có tỷ lệ dịch chuyển chỗ ở rất cao: hết hạn hợp đồng đổi sang xưởng mới, sinh viên tốt nghiệp chuyển thành phố đi làm (ví dụ: từ Đào Viên chuyển xuống Đài Nam hoặc Cao Hùng). Khi đổi nơi ở, khách thường mất dấu cửa hàng cũ và chuyển sang mua tại các tiệm tạp hóa bản địa quanh nơi ở mới.
* **2. Nguyên nhân:**
  * Hệ thống ERP chỉ lưu địa chỉ bưu cục cũ. Doanh nghiệp hoàn toàn không có cơ chế phát hiện khách hàng đã chuyển vùng sinh sống, dẫn đến việc mất khách quen một cách âm thầm.
* **3. Giải pháp:**
  * Khi khách hàng quen đặt đơn hàng mới và chọn mã bưu cục 7-Eleven ở một quận/thành phố khác biệt hoàn toàn so với lịch sử cũ:
  * AI nhận diện sự thay đổi tọa độ địa lý và kích hoạt kịch bản "Chào đón đến nơi ở mới":
    > *"Chào mừng anh đến với khu vực Đài Trung! Cửa hàng đã cập nhật địa chỉ nhận hàng mới của anh. Dưới đây là danh sách 3 cửa hàng tiện lợi gần nhất quanh khu vực mới để anh tiện ghé lấy bưu phẩm sau giờ làm việc..."*
* **4. Đề xuất:**
  * Thiết lập luồng đối soát tự động giữa mã bưu cục mới và địa bàn cũ trên ERP; tự động cập nhật Customer360 Profile để duy trì tương tác xuyên suốt vòng đời khách hàng (LTV) trên toàn lãnh thổ Đài Loan.

---

### CHƯƠNG II: PHÂN HỆ SALES (AI SALES COPILOT & CHỐT ĐƠN 24/7)

#### ĐỀ XUẤT SALES-EX01: ĐÓN SÓNG NGÀY LƯƠNG MÙNG 10 HÀNG THÁNG
* **1. Thực trạng:**
  * Hơn 90% lao động nhà máy và hộ lý tại Đài Loan được nhận lương chuyển khoản vào **ngày 10 hàng tháng**. Từ ngày 1 đến ngày 9, họ thắt chặt chi tiêu tối đa. Nhưng từ **chiều ngày 10 đến ngày 15, sức mua bùng nổ gấp 3 - 4 lần**: họ tập trung gửi tiền kiều hối, nạp cước SIM 4G và mua thùng mì, đồ khô tích trữ cho cả tháng.
* **2. Nguyên nhân:**
  * Doanh nghiệp bán lẻ hiện tại chỉ đăng bài chung chung trên Fanpage. Khách hàng tăng ca bận rộn dễ quên mua sắm, hoặc bị các đối thủ cạnh tranh và người bán lẻ tự do tiếp cận chào mời trước.
* **3. Giải pháp:**
  * AI kích hoạt tác vụ hẹn giờ tự động: **Đúng khung giờ 18h30 - 20h00 tối ngày 10 hàng tháng** (giờ tan ca và tiền lương đã vào thẻ ngân hàng/bưu điện):
  * AI quét lịch sử ERP của từng khách cũ, tự động soạn sẵn giỏ hàng và gửi 1 tin nhắn LINE cá nhân hóa:
    > *"Anh Nam ơi, hôm nay ngày lương rồi! Giỏ hàng nhu yếu phẩm quen thuộc tháng trước của anh (1 thùng mì Hảo Hảo, 1 chai dầu ăn, 2 gói xúc xích) đã được soạn sẵn trên hệ thống. Em gửi về cây 7-Eleven gần xưởng cho anh nhận như tháng trước nhé? Anh bấm [Xác nhận 1-Chạm] để gửi hàng ngay tối nay ạ!"*
* **4. Đề xuất:**
  * Cấu hình tính năng Cron Trigger định kỳ ngày 10 hàng tháng, kết nối với API tạo đơn nháp của ERP để biến giỏ hàng cũ thành đơn hàng chờ duyệt ngay khi khách bấm xác nhận.

---

#### ĐỀ XUẤT SALES-EX02: CỨU ĐƠN HẾT HÀNG CỤC BỘ (OUT-OF-STOCK SUBSTITUTE RECOMMENDER)
* **1. Thực trạng:**
  * Khách nhắn tin hỏi mua một sản phẩm quen thuộc: *"Em ơi ship cho anh thùng mì Omachi sườn hầm ngũ quả nhé"*. Tuy nhiên, kho ERP báo món này vừa hết hàng cục bộ (Out-of-stock). Nhân viên thường trả lời ngắn gọn: *"Dạ bên em hết món này rồi anh"*. Khách hụt hẫng, hủy luôn cả giỏ hàng và bỏ sang tiệm khác.
* **2. Nguyên nhân:**
  * Nhân viên tại quầy đang bận rộn đóng hàng và kiểm kho, không nhớ hết các sản phẩm có hương vị hoặc tầm giá tương đương trong kho để tư vấn thay thế; hoặc ngại giải thích dài dòng.
* **3. Giải pháp:**
  * Khi khách hỏi sản phẩm mà ERP báo tồn kho = 0: AI tuyệt đối không trả lời cộc lốc "Hết hàng", mà lập tức đối soát bảng danh mục sản phẩm tương đương (Substitute Mapping) có sẵn trên ERP để chào phương án thay thế:
    > *"Dạ mì Omachi sườn ngũ quả bên em vừa hết chiều nay, nhưng trong kho đang sẵn mì Cung Đình sườn hầm hoặc mì Omachi chua cay (cùng sợi khoai tây, cùng tầm giá 320 NTD) mới về date tuần này. Em đổi sang loại này gửi về 7-Eleven cho anh dùng đỡ ngán nhé?"*
* **4. Đề xuất:**
  * Bổ sung trường dữ liệu `nhóm_hàng_thay_thế` trên danh mục ERP; AI tự động đọc trường này để phản hồi phương án thay thế ngay trong 0.5 giây, bảo vệ trọn vẹn giá trị đơn hàng cho doanh nghiệp.

---

#### ĐỀ XUẤT SALES-EX03: TÌM KIẾM SẢN PHẨM THEO MÔ TẢ TỰ NHIÊN (SEMANTIC PRODUCT FINDER)
* **1. Thực trạng:**
  * Khách hàng kiều bào (đặc biệt là khách mới) khi vào nhắn tin hoặc tìm kiếm trên web/app **thường không nhớ chính xác tên thương hiệu hay mã SKU chuẩn** trên ERP. Khách chỉ nhớ theo hương vị, màu sắc hoặc đặc sản vùng miền:
    * Khách không nhớ tên *"Bánh Pía Tân Huê Viên"* $\rightarrow$ Chỉ hỏi: *"Cái bánh tròn ngọt nhân sầu riêng trứng muối miền Tây"*.
    * Khách hỏi phụ kiện xe $\rightarrow$ Chỉ hỏi: *"Cái sạc xe đạp điện loại 4 bình ắc quy chân vuông"*.
    * Nấu ăn $\rightarrow$ Chỉ hỏi: *"Gói gia vị nấu bò kho"* hoặc *"kẹo dừa Bến Tre màu xanh lá dứa"*.
* **2. Nguyên nhân:**
  * Công cụ tìm kiếm truyền thống trên Website/App hoạt động theo nguyên tắc so khớp từ khóa chính xác (Exact Match). Khách gõ mô tả đời thường thì hệ thống báo *"0 kết quả tìm kiếm"*, khiến khách nghĩ cửa hàng không bán và bỏ đi.
* **3. Giải pháp:**
  * Dùng mô hình tìm kiếm ngữ nghĩa (Semantic Search / Embeddings) quét trên trường mô tả chi tiết của ERP (thành phần, hương vị, xuất xứ, công dụng đời sống):
  * Khi khách gõ câu mô tả bất kỳ: AI hiểu ngữ nghĩa và lập tức bung thẻ sản phẩm chính xác:
    > *"Dạ đúng món anh đang tìm đây ạ: **Bánh Pía Sóc Trăng Tân Huê Viên (Túi 4 cái nhân sầu riêng trứng muối)** - Giá 135 NTD, date mới tuần này. Em gửi kèm hình ảnh sản phẩm bên dưới, anh bấm [Xem giỏ hàng] nhé!"*
* **4. Đề xuất:**
  * Tích hợp lớp Semantic Search vào khung chat LINE/Messenger/Web; cho phép phục vụ chu đáo 100% khách hàng mới mà không đòi hỏi họ phải nhớ chính xác tên mã sản phẩm.

---

### CHƯƠNG III: PHÂN HỆ CHĂM SÓC KHÁCH HÀNG (SMART CSKH & GIỮ CHÂN KHÁCH HÀNG)

#### ĐỀ XUẤT CSKH-EX01: LỊCH CHĂM SÓC HẬU MÃI XE ĐIỆN MỚI ĐỊNH KỲ 30 - 90 NGÀY
* **1. Thực trạng:**
  * Xe đạp điện mới là tài sản lớn (15.000 - 25.000 NTD), biên lợi nhuận cao. Khách mua xe xong mang về xưởng đi làm hàng ngày, thường quên tra dầu mỡ, không kiểm tra phanh mòn hoặc sạc ắc quy sai cách làm giảm tuổi thọ xe. Sau vài tháng xe có tiếng kêu, khách nảy sinh tâm lý không hài lòng và không giới thiệu bạn bè mua xe tại cửa hàng.
* **2. Nguyên nhân:**
  * Sau khi bán xe và xuất hóa đơn trên ERP, cửa hàng không có nhân sự chuyên trách để theo dõi ngày mua và liên lạc chăm sóc lại từng khách hàng sau 1 tháng hay 3 tháng.
* **3. Giải pháp:**
  * Thiết lập tác vụ hẹn giờ tự động đếm ngày dựa trên ngày xuất hóa đơn bán xe trên ERP:
    * **Mốc Ngày 30:** AI tự động gửi tin nhắn LINE: *"Anh Tuấn ơi, xe điện mới mua được 1 tháng rồi, anh chạy đi làm có quen xe không ạ? Bên em mời anh cuối tuần này ghé chi nhánh gần nhất để kỹ thuật viên kiểm tra phanh, siết ốc và cân chỉnh xe hoàn toàn miễn phí nhé!"*.
    * **Mốc Ngày 90:** AI gửi tin nhắc nhở kiểm tra dung lượng bình ắc quy và hướng dẫn cách sạc bảo vệ pin trong mùa lạnh.
* **4. Đề xuất:**
  * Tạo lịch nhắc tự động từ trường `ngày_bán` của hóa đơn xe điện trên ERP; chuyển thông tin khách đồng ý bảo dưỡng về lịch hẹn của kỹ thuật viên tại chi nhánh gần nhất.

---

#### ĐỀ XUẤT CSKH-EX02: ĐIỀU PHỐI & TRẤN AN BƯU KIỆN KHI BÃO LŨ THIÊN TAI
* **1. Thực trạng:**
  * Đài Loan thường xuyên hứng chịu bão lớn và động đất. Khi chính quyền phát lệnh nghỉ bão (Typhoon Day), các tuyến giao vận nội địa (Black Cat, bưu cục 7-Eleven/FamilyMart) tạm đóng cửa, bưu phẩm bị kẹt từ 2 - 4 ngày. Khách hàng không nhận được đồ ăn sẽ sốt ruột, liên tục nhắn tin hỏi *"Sao lâu có hàng thế?", "Có lừa đảo không?"*, gây nghẽn đường dây hỗ trợ.
* **2. Nguyên nhân:**
  * Doanh nghiệp phụ thuộc vào đơn vị vận chuyển bên thứ ba. Dù là thiên tai bất khả kháng, doanh nghiệp không đủ nhân lực để nhắn tin giải thích và trấn an từng khách hàng đang chờ nhận bưu kiện.
* **3. Giải pháp:**
  * AI lắng nghe Webhook trạng thái hoãn giao của đơn vị vận chuyển nội địa.
  * Khi phát hiện tuyến giao nhận bị phong tỏa do bão: AI chủ động gửi tin nhắn trấn an khách hàng *trước khi khách kịp lo lắng*:
    > *"Khu vực của anh/chị hiện đang chịu ảnh hưởng bão, bưu cục 7-Eleven tạm hoãn giao nhận trong 24h để đảm bảo an toàn. Kiện hàng thực phẩm của anh/chị đang được lưu giữ cẩn thận tại kho mát trung chuyển và sẽ giao ngay khi thời tiết ổn định."*
* **4. Đề xuất:**
  * Tích hợp bộ lọc sự kiện hoãn giao do thời tiết từ Webhook giao vận; tự động kích hoạt kịch bản trấn an hàng loạt cho các mã vận đơn bị ảnh hưởng, triệt tiêu 90% khiếu nại hoang mang.

---

## PHẦN III: NGUYÊN TẮC VẬN HÀNH & KHUYẾN NGHỊ TRIỂN KHAI

1. **Nguyên tắc phân định ranh giới:**
   * Toàn bộ 7 đề xuất trên chỉ đóng vai trò là **ngân hàng ý tưởng mở rộng** cho các giai đoạn nâng cấp sau (Giai đoạn P2 / P3 khi hệ thống cốt lõi đã chạy ổn định).
   * Tuyệt đối không đưa các tính năng này vào danh mục 20% KEY của giai đoạn khởi động (MVP) để tránh làm phân tán nguồn lực kỹ thuật và ngân sách đầu tư.
2. **Khuyến nghị sử dụng tài liệu:**
   * Hồ sơ này dùng làm tài liệu phản biện và mở rộng khi Ban Giám đốc hoặc Đối tác bán lẻ đặt câu hỏi: *"Sau khi làm xong 3 module chính thì hệ thống này còn mở rộng thêm được những gì nữa?"*.
