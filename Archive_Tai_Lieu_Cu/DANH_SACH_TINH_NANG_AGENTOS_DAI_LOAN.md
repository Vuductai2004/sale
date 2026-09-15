# DANH MỤC TÍNH NĂNG 3 MODULE PLUG-AND-PLAY AI AGENT THƯƠNG MẠI
## (MODULE 1: MARKETING AUTOMATION | MODULE 2: SALES COPILOT | MODULE 3: SMART CSKH)
### BẢNG ĐẶC TẢ CHI TIẾT & PHƯƠNG ÁN CẮM / RÚT ĐỘC LẬP TÍCH HỢP VÀO HỆ THỐNG HIỆN HỮU

> **ĐỊNH VỊ CỐT LÕI ĐỀ ÁN:**  
> Hệ thống được đóng gói thành **3 Module phần mềm Plug-and-Play hoàn toàn độc lập** (Marketing - Sales - CSKH). Doanh nghiệp có thể **mua lẻ từng module**, cắm / rút độc lập hoặc triển khai đồng thời cả 3 module mà tuyệt đối **không làm xáo trộn hệ thống hiện tại** (Website thương mại điện tử, Mobile App, phần mềm ERP và đối tác giao vận 4 chuỗi siêu thị tiện lợi 7-Eleven, FamilyMart, Hi-Life, OK Mart đang vận hành ổn định).

---

## PHẦN I: TỔNG QUAN KIẾN TRÚC CẮM / RÚT 3 MODULE ĐỘC LẬP

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│              MÔ HÌNH 3 MODULE MICRO-FRONTEND & MICRO-SERVICE CẮM / RÚT LINH HOẠT                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
       [WEBSITE DOANH NGHIỆP]                                 [MOBILE APP DOANH NGHIỆP]
  (WordPress / Sapo / Haravan / Laravel / Shopify)       (Flutter / React Native / iOS / Android)
                 │                                                       │
                 ├───────────────────────────┬───────────────────────────┤
                 ▼                           ▼                           ▼
      ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
      │ MODULE 1: MARKETING │     │   MODULE 2: SALES   │     │   MODULE 3: CSKH    │
      │ (nexus-mkt.min.js)  │     │ (nexus-sales.min.js)│     │ (nexus-cskh.min.js) │
      │  Dung lượng: ~5.8KB │     │  Dung lượng: ~6.5KB │     │  Dung lượng: ~6.9KB │
      ├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤
      │ • Cổng RAG pháp lý  │     │ • Trực chat 24/7    │     │ • Bám bưu kiện 7d   │
      │ • Member-Get-Member │     │ • Bắn đơn nháp ERP  │     │ • Đếm ngược nạp SIM │
      │ • Content đa ngữ    │     │ • Báo đỉnh tỷ giá   │     │ • Hậu mãi xe điện   │
      │ • Đo ROI chuyển đổi │     │ • Hướng dẫn Kiosk   │     │ • Human Takeover 1s │
      │ • Bắt ý định thoát  │     │ • Cross-sell 5 ngành│     │ • Báo động đỏ < 2p  │
      │ • Xả cận date 7h    │     │ • Khóa giá sàn P_fl │     │ • Churn Prediction  │
      └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
                 │                           │                           │
                 └───────────────────────────┼───────────────────────────┘
                                             │ (Tùy chọn: Nhúng 1 file duy nhất nexus-sdk.min.js < 20KB)
                                             ▼
                             [LỚP KẾT NỐI BẢO MẬT VỚI ERP]
                     (REST API / Webhook Adapter - Single Source of Truth)
```

### So Sánh Các Gói Triển Khai Thương Mại:

| Tiêu Chí | Gói Lẻ Từng Module (Modular) | Gói Combo 3 Module Toàn Diện |
| :--- | :--- | :--- |
| **Phù hợp với** | Doanh nghiệp muốn giải quyết cấp bách 1 điểm nghẽn (đơn ca đêm, bưu kiện bom hàng, hoặc thiếu khách mới). | Doanh nghiệp muốn tự động hóa toàn diện chu trình khách hàng từ Thu hút ➔ Chốt đơn ➔ Giữ chân. |
| **Hình thức tích hợp** | Nhúng 1 file JS tương ứng (`nexus-mkt.min.js`, `nexus-sales.min.js`, hoặc `nexus-cskh.min.js`). | Nhúng gói gộp duy nhất `nexus-sdk.min.js` (< 20KB) kích hoạt cả 3 module. |
| **Độ độc lập** | **100% độc lập**. Bật/tắt module không ảnh hưởng tới bất kỳ chức năng nào khác của website hay ERP. | 3 module chia sẻ chung Customer 360 Memory để tối ưu thông điệp xuyên suốt. |
| **Nguồn dữ liệu** | Đọc trực tiếp từ API tương ứng của ERP doanh nghiệp (Chỉ đọc - Read-only, ghi nhận đơn nháp có khóa an toàn). | Đọc và ghi đồng bộ qua Event Bus trung gian kết nối ERP. |

---

## PHẦN II: MA TRẬN TÍNH NĂNG 3 MODULE ĐỘC LẬP (PHÂN ĐỊNH MŨI NHỌN KEY)

### 1. BẢNG MODULE 1: AI MARKETING AUTOMATION & LEAD GENERATION (HÚT KHÁCH & MỞ TỆP)
*File nhúng độc lập: `nexus-mkt.min.js` (~5.8KB)*

| Mã | Phân Loại | Tên Tính Năng | Nút Thắt Thực Tế (Bottleneck) | Đòn Bẩy AI Agent Giải Quyết (Leverage) |
| :---: | :---: | :--- | :--- | :--- |
| **M1-01** | ⭐ **KEY CỐT LÕI** | **Cổng RAG Pháp Lý & Đời Sống (ARC/健保)** | Khách kiều bào mới sang gặp rào cản ngôn ngữ, luôn tìm kiếm thông tin gia hạn thẻ cư trú, đổi xưởng, khám bệnh nhưng sợ bị lừa. Chi phí chạy ads tìm khách mới rất đắt và hay bị khóa trang. | Cung cấp cổng tra cứu pháp lý chuẩn xác 100% miễn phí bằng tiếng mẹ đẻ (Việt/Indo/Thái). Biến nhu cầu thiết yếu thành **chiếc phễu hút hàng nghìn khách tự tìm đến nhắn tin cho cơ sở mỗi tuần mà không tốn 1 đồng tiền ads**. |
| **M1-02** | ⭐ **KEY CỐT LÕI** | **Lan Tỏa Giới Thiệu Người Mới (MGM)** | Kiều bào sinh hoạt theo nhóm bạn bè cùng xưởng, cùng phòng ký túc xá. Họ có tâm lý chỉ tin người quen giới thiệu chứ không tin quảng cáo trên mạng. | Cấp mã mời cá nhân, tự động tặng voucher 50 NTD cho người mới và tích điểm cước SIM/đổi quà cho người giới thiệu ngay khi đơn đầu hoàn tất $\rightarrow$ Kích hoạt hiệu ứng mạng lưới (Network Effect). |
| **M1-03** | Bổ trợ | **Content Đa Ngữ Tự Động Theo Mùa Vụ** | Phục vụ 4 tệp kiều bào (Việt, Indo, Tagalog, Thái) nhưng nhân viên không rành ngôn ngữ và phong tục bản xứ. | Tự động lập lịch sinh nội dung Facebook/TikTok chuẩn ngữ cảnh lễ hội (Tết Việt, Ramadan Hồi giáo, Tết Songkran). |
| **M1-04** | Bổ trợ | **Marketing Attribution Đo Lường ROI** | Ban Giám đốc không biết chính xác chiến dịch nào ra tiền thật, chiến dịch nào lãng phí ngân sách. | Gắn mã UTM đối soát trực tiếp với mã đơn hàng ERP, đo lường chính xác doanh thu thực tế tạo ra từ từng kênh. |
| **M1-05** | Bổ trợ | **Bắt Ý Định Thoát Trang (Exit-Intent)** | 70% khách vào Web/App lướt xem giá rồi thoát mà không để lại thông tin liên lạc. | Phát hiện chuột rời màn hình, tung ngay voucher giảm giá cho đơn đầu giao về siêu thị 7-Eleven giữ chân khách. |
| **M1-06** | Bổ trợ | **AI Xả Hàng Cận Date 7h Sáng** | Thực phẩm tươi/bánh mì cận hạn sử dụng 3-5 ngày trong kho nếu không bán kịp sẽ phải hủy, gây lỗ vốn. | 7h sáng quét kho ERP, gom combo trợ giá buổi sáng và tự đăng bài flash-sale xả hàng dứt điểm trong ngày. |

---

### 2. BẢNG MODULE 2: AI SALES COPILOT 24/7 & CHỐT ĐƠN TỰ ĐỘNG (TƯ VẤN & BẮN ĐƠN ERP)
*File nhúng độc lập: `nexus-sales.min.js` (~6.5KB)*

| Mã | Phân Loại | Tên Tính Năng | Nút Thắt Thực Tế (Bottleneck) | Đòn Bẩy AI Agent Giải Quyết (Leverage) |
| :---: | :---: | :--- | :--- | :--- |
| **M2-01** | ⭐ **KEY CỐT LÕI** | **Trực Chat Bán Hàng 24/7 Đa Ngữ** | **70% kiều bào tan ca xưởng lúc 21h - 2h sáng**. Khi khách có tiền và rảnh tay mua sắm nhất thì nhân viên lại đi ngủ. Khách nhắn tin không ai trả lời sẽ bỏ sang tiệm khác hoặc sáng dậy nguội nhu cầu. | AI trực chiến liên tục 24/7 phản hồi < 0.5s bằng 4 thứ tiếng, kiểm tra tồn kho ERP thật để tư vấn chuẩn size xe điện, cước SIM, chốt giỏ hàng và định vị điểm nhận 7-Eleven ngay trong đêm. |
| **M2-02** | ⭐ **KEY CỐT LÕI** | **Bắn Đơn Nháp Tự Động Vào ERP (Idempotent)** | Nhân viên phải đọc lại từng đoạn chat, gõ tay thủ công từng đơn vào ERP rất chậm (10-15 phút/đơn), dễ gõ sai mã bưu cục 7-Eleven hoặc nhập trùng 2 lần gây đọng vốn. | AI tự trích xuất thông tin chat, tạo bản ghi Đơn Hàng Nháp (Draft Order) vào ERP với mã khóa chống trùng lặp `Idempotency Key` tuyệt đối. Sáng hôm sau nhân viên chỉ cần bấm "Duyệt" là in bill. |
| **M2-03** | ⭐ **KEY CỐT LÕI** | **Báo Đỉnh Tỷ Giá Kiều Hối Tự Động** | Tỷ giá TWD/VND thay đổi liên tục theo giờ. Kiều bào luôn canh gửi lúc tỷ giá cao nhất nhưng không thể ngồi F5 bảng giá cả ngày. | AI liên tục giám sát tỷ giá ERP từng phút, chủ động push tin báo đỉnh cho khách: *"Tỷ giá hôm nay chạm mốc 812 cao nhất tuần! Gửi 3 vạn NTD lời thêm gần nửa triệu VNĐ"*. Kích thích tạo lệnh gửi tiền tức thì. |
| **M2-04** | Bổ trợ | **Hướng Dẫn Nộp Tiền Kiosk (ibon / FamiPort)** | Lao động mới rất sợ thao tác sai tại máy Kiosk tiếng Trung ở 7-Eleven khi nộp tiền mua xe điện hoặc chuyển tiền. | Cấp mã vạch nộp tiền, gửi ảnh chụp màn hình máy ibon kèm hướng dẫn 3 bước trực quan bằng tiếng mẹ đẻ. |
| **M2-05** | Bổ trợ | **Cross-Sell 5 Ngành Hàng Hệ Sinh Thái** | Khách mua SIM thì không biết cửa hàng có xe điện; khách mua đồ ăn thì không biết cơ sở có dịch vụ gửi tiền về quê. | Gợi ý chéo thông minh: Mua SIM gợi ý mì gói; mua đồ ăn nhiều lần gợi ý xe điện đi làm; mua xe điện gợi ý gửi tiền quà quê. |
| **M2-06** | Bổ trợ | **Proactive Sales Chu Kỳ & Ngày Lương Mùng 10** | Kiều bào nhận lương mùng 10 hàng tháng. Trước mùng 10 họ nhịn chi tiêu, từ mùng 10 - 15 sức mua tăng vọt. | Nhận biết chu kỳ lương, đúng ngày 10 AI gửi tin gợi ý đặt lại combo nhu yếu phẩm quen thuộc kèm nút 1-chạm xác nhận. |
| **M2-07** | Bảo vệ | **Khóa Rủi Ro Kiều Hối & Khóa Giá Sàn $P_{floor}$** | Nguy cơ AI bị lừa giảm giá quá sâu qua chat (Prompt Injection) hoặc giao dịch kiều hối trái quy định pháp luật. | Code cứng công thức giá sàn $P_{floor} \ge P_{cost} + Ship + 5\%$, AI không có quyền hạ giá âm vốn; bắt buộc quét định danh ARC chính chủ đối với kiều hối. |

---

### 3. BẢNG MODULE 3: SMART CSKH 24/7 & GIỮ CHÂN KHÁCH HÀNG (BÁM BƯU KIỆN & HẬU MÃI)
*File nhúng độc lập: `nexus-cskh.min.js` (~6.9KB)*

| Mã | Phân Loại | Tên Tính Năng | Nút Thắt Thực Tế (Bottleneck) | Đòn Bẩy AI Agent Giải Quyết (Leverage) |
| :---: | :---: | :--- | :--- | :--- |
| **M3-01** | ⭐ **KEY CỐT LÕI** | **Bám Đuổi Bưu Kiện 7 Ngày Siêu Thị Tiện Lợi** | Hàng ship về 7-Eleven/FamilyMart nhưng công nhân tăng ca quên lấy. Sau 7 ngày bưu kiện bị hoàn về kho, **doanh nghiệp mất 120 NTD tiền ship 2 đầu và hỏng thực phẩm**, tỷ lệ hoàn đơn lên tới 12-15%. | AI lắng nghe Webhook đơn vị vận chuyển, tự động bám đuổi 4 mốc (Ngày 1: Gửi mã + map $\rightarrow$ Ngày 3: Nhắc nhẹ nhờ bạn lấy hộ $\rightarrow$ Ngày 5: Cảnh báo khẩn $\rightarrow$ Ngày 6.5: Báo nhân viên gọi điện) $\rightarrow$ Ép tỷ lệ hoàn đơn xuống dưới 3%. |
| **M3-04** | ⭐ **KEY CỐT LÕI** | **Chuyển Giao Người Thật (Single Responder)** | Khách hàng khi có sự cố rất ức chế nếu bot trả lời vòng vo vô cảm; nếu nhân viên vào chat mà AI vẫn nói leo sẽ gây thảm họa trải nghiệm. | Khóa phiên độc quyền: Khi khách yêu cầu hoặc nhân viên tiếp quản, AI chuyển trạng thái trong < 1.0 giây và **ngắt lời im lặng tuyệt đối**, nhường quyền 100% cho con người. |
| **M3-02** | Bổ trợ | **Đếm Ngược Gia Hạn SIM Chu Kỳ 30 Ngày** | Khách dùng SIM 4G quên ngày hết hạn cước, bị ngắt mạng đột ngột dẫn đến đổi sang mua SIM mạng khác. | Tự động đếm ngày T+27, gửi tin nhắn kèm mã nộp tiền Kiosk, giúp cơ sở bảo toàn doanh thu thuê bao viễn thông định kỳ. |
| **M3-03** | Bổ trợ | **Hậu Mãi & Lịch Chăm Sóc Xe Điện Định Kỳ** | Xe điện là tài sản lớn (15.000 - 30.000 NTD), nếu bỏ bê không chăm sóc khách sẽ không quay lại và không giới thiệu bạn bè. | Tự động đặt lịch nhắc kiểm tra ắc quy, phanh sau 30 và 90 ngày mua xe, kích hoạt cứu hộ tận nơi khi xe hỏng hóc giữa đường. |
| **M3-05** | Bảo vệ | **Báo Động Đỏ Sự Cố & Phân Luồng (< 2 Phút)** | Một bài phốt dịch vụ trên nhóm Facebook người Việt tại Đài Loan có thể hủy hoại uy tín tích lũy cả năm của cửa hàng. | Quét cảm xúc hội thoại, phát hiện từ khóa nguy hiểm (*"lừa đảo"*, *"báo cảnh sát"*), lập tức bắn tin Telegram cho Quản lý can thiệp trong vòng 120 giây. |
| **M3-06** | Bổ trợ | **Dự Báo Nguy Cơ Rời Bỏ (Churn Prediction)** | Khách quen âm thầm dừng mua hàng mà cơ sở không hay biết để can thiệp. | Quét ERP phát hiện khách quen quá 45 ngày chưa mua lại, tự động kích hoạt tin nhắn thăm hỏi kèm voucher tri ân hồi sinh tài khoản. |
| **M3-07** | Bổ trợ | **Trí Tuệ Khiếu Nại & Root Cause Analytics** | Chủ cửa hàng chỉ nghe nhân viên báo chung chung, không biết nguyên nhân gốc rễ lỗi ở khâu nào. | Tổng hợp khiếu nại theo tuần, chỉ rõ tuyến xe nào hay làm vỡ đồ, mặt hàng nào đóng gói lỗi để Ban Giám đốc chấn chỉnh. |

---

## PHẦN III: ĐẶC TẢ CHI TIẾT TỪNG TÍNH NĂNG THEO 3 MODULE ĐỘC LẬP

---

### MODULE 1: AI MARKETING AUTOMATION & LEAD GENERATION
*Tập trung vào: Thu hút tệp khách hàng tiềm năng, giảm chi phí quảng cáo và nhân rộng người dùng tự nhiên.*

#### M1-01: Cổng RAG Hỏi Đáp Pháp Lý & Đời Sống Đài Loan (ARC, BHYT 健保, Luật Lao Động)
* **Bản chất nghiệp vụ:** Người lao động nước ngoài và du học sinh khi mới sang Đài Loan gặp rào cản ngôn ngữ rất lớn và luôn có nhu cầu tìm hiểu thủ tục gia hạn thẻ cư trú (ARC), chuyển đổi công xưởng, khám chữa bệnh BHYT. Doanh nghiệp cung cấp cổng tra cứu miễn phí 24/7 bằng tiếng mẹ đẻ để tạo dựng niềm tin tuyệt đối.
* **Cơ chế vận hành:**
  1. Xây dựng kho tri thức RAG (Retrieval-Augmented Generation) chuẩn hóa từ các văn bản chính thức của Sở Di Dân Đài Loan (National Immigration Agency) và Bộ Lao Động (MOL).
  2. Khách hàng hỏi bằng tiếng Việt/Indo/Thái $\rightarrow$ AI đối soát văn bản pháp lý chính xác và trả lời ngắn gọn trong 3 giây.
  3. Kèm theo lời mời tự nhiên: *"Cơ sở chúng tôi hỗ trợ SIM 4G chuyển tiền và giao nhu yếu phẩm tận xưởng, anh/chị cần hỗ trợ thêm gì không ạ?"*.
* **Tích hợp:** Nhúng khung chat độc lập qua `nexus-mkt.min.js` trên trang chủ Website/Fanpage.

#### M1-02: Lan Tỏa Giới Thiệu Người Mới (Member-Get-Member / MGM Đa Tầng)
* **Bản chất nghiệp vụ:** Cộng đồng kiều bào tại Đài Loan có tính liên kết rất cao theo nhóm đồng hương và bạn bè cùng khu vực. M1-02 biến mỗi khách hàng hiện tại thành một đại sứ quảng bá tự nhiên.
* **Cơ chế vận hành:**
  1. AI cấp cho mỗi khách hàng một đường link/mã giới thiệu định danh duy nhất trong tài khoản.
  2. Khi người được giới thiệu hoàn tất đơn hàng đầu tiên (hoặc giao dịch gửi tiền đầu tiên), AI tự động cộng điểm thưởng cho người giới thiệu và gửi voucher giảm giá trực tiếp cho người mới.
  3. AI chủ động gửi tin nhắn chúc mừng và thông báo số dư thưởng cho cả hai bên qua Zalo/LINE.
* **Tích hợp:** API `POST /api/v1/referrals/redeem` đối soát trực tiếp với mã khách hàng trên ERP.

#### M1-03: AI Content Đa Ngữ Tự Động Theo Lễ Tết & Xu Hướng Đài Loan
* **Bản chất nghiệp vụ:** Doanh nghiệp phục vụ tệp khách hàng đa quốc gia nhưng đội ngũ marketing thường không thông thạo cùng lúc 4 ngôn ngữ (Việt, Indonesia, Philippines, Thái).
* **Cơ chế vận hành:**
  1. AI tự động lập lịch theo niên giám sự kiện: Lễ hội Thuyền Rồng, Tết Trung Thu, Tết Nguyên Đán, Tháng Ramadan của cộng đồng Hồi giáo Indonesia, Quốc khánh Philippines.
  2. Tự động sinh nội dung truyền thông bằng đúng giọng điệu bản xứ và gắn thẻ sản phẩm tương ứng (ví dụ: Ramadan gắn bánh kẹo Halal; Tết Việt gắn bánh chưng, giò lụa).
* **Tích hợp:** Xuất bản nội dung trực tiếp qua Fanpage Facebook API và Zalo OA.

#### M1-04: Marketing Attribution & Đo Lường ROI Thực Tế
* **Bản chất nghiệp vụ:** Giải quyết câu hỏi lớn của Ban Giám đốc: *"Ngân sách tiếp thị bỏ ra đem lại bao nhiêu đơn hàng và tiền thật về két?"*.
* **Cơ chế vận hành:**
  1. Mọi đường link tiếp thị đều gắn mã UTM định danh.
  2. Khi khách hàng bấm link và phát sinh đơn hàng trên Web/App hoặc chốt qua Chat, AI liên kết mã UTM với Mã đơn hàng (Order ID) trên ERP.
  3. Báo cáo tự động tính toán: Chi phí thu hút một khách (CAC), Doanh thu tạo ra trên mỗi đồng chi phí (ROAS).

#### M1-05: Bắt Ý Định Thoát Trang & Flash Deal Cá Nhân Hóa (Exit-Intent)
* **Bản chất nghiệp vụ:** Hơn 70% khách vào website xem hàng rồi thoát mà không để lại thông tin hay bấm mua hàng.
* **Cơ chế vận hành:**
  1. Đo lường tốc độ di chuột lên góc thoát trình duyệt (hoặc thao tác vuốt ngược trên điện thoại).
  2. Lập tức hiển thị pop-up 1-chạm: *"Đừng bỏ lỡ! Tặng riêng bạn mã giảm giá 50 NTD cho đơn hàng đầu tiên hôm nay"*.
* **Tích hợp:** Script `nexus-mkt.min.js` kích hoạt Shadow DOM không đè lên giao diện chính.

#### M1-06: AI Quảng Bá Cận Date 7h Sáng (Tự Động Kích Hoạt Xả Hàng)
* **Bản chất nghiệp vụ:** Chuỗi bán lẻ thực phẩm thường xuyên tồn các mặt hàng đồ ăn nhanh, bánh mì, sữa tươi còn hạn sử dụng từ 3 đến 7 ngày. Nếu không bán kịp sẽ phải hủy bỏ gây thất thoát lợi nhuận.
* **Cơ chế vận hành:**
  1. 7h00 sáng mỗi ngày, AI quét danh mục tồn kho ERP tìm các sản phẩm cận hạn.
  2. Tự động gom thành "Combo Trợ Giá Buổi Sáng" và tạo bài đăng flash-sale trên các kênh truyền thông của cửa hàng.

---

### MODULE 2: AI SALES COPILOT 24/7 & CHỐT ĐƠN TỰ ĐỘNG
*Tập trung vào: Tư vấn chuyển đổi doanh số, bán hàng đa ngữ liên tục 24/7, bắn đơn nháp an toàn vào ERP và thúc đẩy kiều hối.*

#### M2-01 ⭐: AI Trực Chat & Tư Vấn Bán Hàng 24/7 Đa Ngữ (Sales Conversion)
* **Bản chất nghiệp vụ:** 70% khách hàng kiều bào chỉ có thời gian rảnh để mua sắm vào đêm muộn (21h - 2h sáng) sau khi tan ca xưởng. Khi nhân viên ngủ, AI đóng vai trò người bán hàng tận tâm nhất.
* **Cơ chế vận hành:**
  1. Phản hồi dưới 0.5 giây bằng 4 ngôn ngữ (Việt, Indonesia, Thái, Trung).
  2. Tự động tra cứu tồn kho thực tế trên ERP: Không bao giờ tư vấn hàng đã hết.
  3. Gợi ý chọn size xe điện, giải thích thông số ắc quy, tư vấn cước SIM 4G và chốt địa chỉ nhận hàng tại 7-Eleven gần khách nhất.
* **Tích hợp:** Cổng Chat nhúng độc lập qua `nexus-sales.min.js` trên Web, App hoặc kết nối trực tiếp Fanpage/LINE OA.

#### M2-02 ⭐: Bắn Đơn Nháp Tự Động Vào ERP (Idempotent Draft Order Injection)
* **Bản chất nghiệp vụ:** Sau khi khách đồng ý mua qua chat, nhân viên không cần phải gõ tay lại đơn hàng vào ERP. AI tự động tạo đơn nháp giúp tăng tốc độ xử lý kho lên gấp 10 lần.
* **Cơ chế vận hành:**
  1. AI trích xuất đầy đủ thông tin: Tên khách, SĐT, Danh sách sản phẩm, Mã cửa hàng tiện lợi nhận hàng.
  2. Sinh mã khóa bất biến (Idempotency Key): `UUIDv5(tenant_id + session_id + order_items_hash)`.
  3. Gọi API `POST /api/v1/orders/draft` vào ERP. Dù mạng chập chờn hay AI retry 10 lần thì ERP vẫn chỉ tạo đúng 1 đơn hàng duy nhất, tuyệt đối không trùng lặp.
* **Ranh giới an toàn:** AI chỉ có quyền tạo **Đơn Hàng Nháp (Draft)**. Chỉ khi kế toán/thủ kho xác nhận đơn thì ERP mới chính thức trừ kho xuất hóa đơn.

#### M2-03 ⭐: Báo Đỉnh Tỷ Giá Kiều Hối Tự Động (High-Frequency Remittance Revenue)
* **Bản chất nghiệp vụ:** Lao động nước ngoài rất nhạy cảm với tỷ giá TWD/VND. Khi tỷ giá tăng cao, nhu cầu gửi tiền về quê hương bùng nổ.
* **Cơ chế vận hành:**
  1. AI liên tục giám sát bảng tỷ giá ngoại tệ từ ERP theo từng phút.
  2. Khi tỷ giá chạm ngưỡng kỳ vọng (hoặc lập đỉnh cao nhất trong tuần), AI chủ động gửi tin nhắn: *"Anh/chị ơi, hôm nay tỷ giá TWD/VND vừa chạm đỉnh 812! Gửi 3 vạn NTD tiết kiệm được thêm 450.000 VNĐ. Bấm vào đây để tạo lệnh gửi ngay nhé!"*.
  3. Khách bấm vào $\rightarrow$ chuyển thẳng sang giao diện nhập người thụ hưởng trên Web/App kiều hối.

#### M2-04: Hướng Dẫn Nộp Tiền Kiosk Đa Nền Tảng (ibon 7-Eleven / FamiPort)
* **Bản chất nghiệp vụ:** Khách hàng lao động mới thường lúng túng trước màn hình cảm ứng tiếng Trung của máy Kiosk tại siêu thị tiện lợi khi nộp tiền mua xe điện hoặc chuyển tiền kiều hối.
* **Cơ chế vận hành:**
  1. AI cấp mã vạch / mã thanh toán nạp tiền tương thích với chuỗi siêu thị khách chọn.
  2. Gửi ảnh chụp thực tế màn hình máy ibon (hoặc FamiPort) đánh số rõ các bước: `[Bước 1: Bấm phím mã số] ➔ [Bước 2: Nhập mã] ➔ [Bước 3: Lấy bill ra quầy nộp tiền]`.

#### M2-05: Cross-Sell / Upsell Hệ Sinh Thái 5 Ngành Hàng
* **Bản chất nghiệp vụ:** Tận dụng thế mạnh của cơ sở kinh doanh đa dịch vụ để gia tăng giá trị trọn đời của một khách hàng (Customer Lifetime Value).
* **Cơ chế vận hành:**
  * Mua SIM 4G mới $\rightarrow$ Gợi ý gói gia vị quê nhà nấu ăn tại ký túc xá.
  * Mua đồ ăn vặt nhiều lần $\rightarrow$ Gợi ý mua xe điện đi làm tiết kiệm tiền xe buýt.
  * Mua xe điện thành công $\rightarrow$ Gợi ý gói kiều hối chuyển tiền mừng về cho bố mẹ ở quê.

#### M2-06: Proactive Sales Theo Chu Kỳ Tiêu Dùng & Ngày Lương Mùng 10
* **Bản chất nghiệp vụ:** Hầu hết công nhân nhà máy tại Đài Loan nhận lương vào ngày 10 hàng tháng. Trước ngày này họ thắt chặt chi tiêu, nhưng từ mùng 10 đến ngày 15 sức mua tăng vọt.
* **Cơ chế vận hành:**
  1. AI nhận biết chu kỳ lương của từng khách hàng.
  2. Đúng ngày 10 hàng tháng, AI gửi tin nhắn cá nhân hóa: Gợi ý đặt lại giỏ hàng nhu yếu phẩm quen thuộc đã dùng hết trong tháng trước kèm nút bấm 1-chạm xác nhận.

#### M2-07: Bộ Lọc Tuân Thủ Kiều Hối & Khóa Cứng Giá Sàn ($P_{floor}$)
* **Bản chất nghiệp vụ:** Ngăn chặn tuyệt đối việc AI bị khách lừa giảm giá quá đà (Prompt Injection) hoặc tự ý hứa hẹn các giao dịch kiều hối trái quy định pháp luật.
* **Cơ chế an toàn:**
  1. **Khóa giá sàn code cứng:**
     $$P_{min} = \text{Giá vốn ERP} + \text{Phí vận chuyển} + \text{Biên lợi nhuận tối thiểu (5\%)}$$
     AI không có thẩm quyền giảm giá dưới $P_{min}$ trong mọi trường hợp.
  2. **Bộ lọc tuân thủ kiều hối 3 cấp:** Yêu cầu định danh ARC chính chủ, từ chối mọi giao dịch không rõ nguồn gốc hoặc vượt hạn mức luật định Đài Loan.

---

### MODULE 3: SMART CSKH 24/7 & GIỮ CHÂN KHÁCH HÀNG
*Tập trung vào: Bảo vệ dòng tiền, triệt tiêu bưu kiện hoàn đơn, chăm sóc hậu mãi và phát hiện bức xúc của khách hàng tức thì.*

#### M3-01 ⭐: Bám Đuổi Bưu Kiện 7 Ngày Siêu Thị Tiện Lợi (Triệt Tiêu Hoàn Đơn)
* **Bản chất nghiệp vụ:** Tại Đài Loan, hàng hóa thương mại điện tử chủ yếu giao đến 4 chuỗi siêu thị tiện lợi (7-Eleven, FamilyMart, Hi-Life, OK Mart). Hàng lưu kho 7 ngày, nếu khách quên lấy sẽ bị hoàn về. Doanh nghiệp vừa mất phí ship 2 đầu (khoảng 120 NTD) vừa bị đọng vốn và hỏng thực phẩm.
* **Cơ chế bám đuổi 4 mốc thời gian:**
  * **Mốc 1 (Ngày 1 - Hàng vừa đến Kiosk):** AI gửi tin nhắn kèm mã nhận hàng và định vị Google Map của đúng cửa hàng tiện lợi đó: *"Bưu kiện của anh/chị đã về 7-Eleven đối diện cổng xưởng, mời anh/chị ghé lấy nhé!"*.
  * **Mốc 2 (Ngày 3 - Nhắc nhẹ nhàng):** AI gửi tin nhắn hỏi thăm: *"Anh/chị đã nhận được kiện hàng chưa ạ? Nếu bận ca làm có thể nhờ bạn cùng phòng mang mã này ra đọc 3 số cuối điện thoại lấy giúp nhé"*.
  * **Mốc 3 (Ngày 5 - Cảnh báo khẩn):** AI push tin cảnh báo: *"Chỉ còn 48h nữa bưu kiện sẽ bị hệ thống tự động hoàn về kho"*.
  * **Mốc 4 (Ngày 6.5 - Báo động nhân viên gọi điện):** Nếu khách vẫn chưa lấy, AI tự động kích hoạt báo động cho nhân viên cửa hàng gọi điện trực tiếp hỗ trợ.

#### M3-02: Đếm Ngược Gia Hạn SIM Chu Kỳ 30 Ngày
* **Bản chất nghiệp vụ:** Khách dùng SIM 4G trả trước thường quên ngày hết hạn cước, dẫn đến bị ngắt mạng đột ngột và chuyển sang mua SIM của đơn vị khác.
* **Cơ chế vận hành:**
  1. AI theo dõi chu kỳ nạp cước trên ERP. Vào ngày $T+27$ (3 ngày trước khi hết gói), AI tự động gửi tin nhắn: *"Gói Data của bạn sắp hết hạn trong 3 ngày tới. Bấm vào đây để nhận mã thanh toán ibon nạp ngay chỉ trong 1 phút"*.
  2. Giúp doanh nghiệp bảo toàn doanh thu thuê bao viễn thông định kỳ hàng tháng.

#### M3-03: Hậu Mãi & Lịch Chăm Sóc Xe Điện Định Kỳ
* **Bản chất nghiệp vụ:** Xe điện là sản phẩm giá trị cao (từ 15.000 đến 30.000 NTD). Khách hàng mua xe điện nếu được chăm sóc kỹ sẽ giới thiệu rất nhiều bạn bè cùng khu công nghiệp đến mua tiếp.
* **Cơ chế vận hành:**
  1. Sau khi giao xe 30 ngày: AI nhắn tin hỏi thăm cảm nhận vận hành, hướng dẫn cách sạc pin an toàn kéo dài tuổi thọ ắc quy.
  2. Sau 90 ngày: AI gửi voucher mời ghé cửa hàng bảo dưỡng, cân chỉnh phanh và kiểm tra áp suất lốp hoàn toàn miễn phí.

#### M3-04: Chuyển Giao Người Thật Tức Thì (Human Takeover Single Responder)
* **Bản chất nghiệp vụ:** Khách hàng gặp vấn đề phức tạp đòi hỏi cảm xúc hoặc cần khiếu nại gay gắt phải được nói chuyện ngay với nhân viên con người.
* **Cơ chế kỹ thuật:**
  1. Khách bấm nút *"Gặp nhân viên"* hoặc AI nhận diện từ khóa bức xúc.
  2. AI chuyển trạng thái phiên hội thoại thành `HUMAN_CONTROL` trong vòng 1.0 giây và gửi thông báo khẩn tới máy nhân viên trực.
  3. **Khóa phản hồi độc quyền:** Khi nhân viên đã gõ tin nhắn, AI lập tức khóa mic/khóa chat, không được tự ý chen ngang trả lời, đảm bảo tính nhất quán tuyệt đối.

#### M3-05: Báo Động Đỏ Sự Cố & Phân Luồng Khiếu Nại (Red Alert < 2 Phút)
* **Bản chất nghiệp vụ:** Một bài phốt trên nhóm cộng đồng Facebook người Việt tại Đài Loan có thể hủy hoại uy tín tích lũy nhiều năm của cửa hàng chỉ sau 1 đêm.
* **Cơ chế vận hành:**
  1. AI liên tục quét cảm xúc hội thoại (Sentiment Analysis).
  2. Nếu phát hiện các từ khóa nguy cơ cao: *"lừa đảo"*, *"báo công an"*, *"thực phẩm ôi thiu"*, *"mất tiền kiều hối"*, AI lập tức kích hoạt `RED_ALERT`.
  3. Bắn tin nhắn trực tiếp kèm đường link phiên chat tới Quản lý qua Telegram/Zalo trong vòng 120 giây để xử lý ngay trước khi khách đăng bài lên mạng xã hội.

#### M3-06: Dự Báo Nguy Cơ Rời Bỏ (Customer Churn Prediction Agent)
* **Bản chất nghiệp vụ:** Chi phí giữ chân một khách hàng cũ chỉ bằng 1/5 chi phí tìm kiếm một khách hàng mới.
* **Cơ chế vận hành:**
  1. AI quét tần suất mua sắm trên ERP. Nếu một khách thường xuyên mua hàng mỗi 2 tuần mà đã quá 45 ngày không phát sinh đơn hàng mới, AI xếp vào nhóm `Nguy cơ rời bỏ`.
  2. AI tự động kích hoạt kịch bản chăm sóc cá nhân hóa: Gửi mã giảm giá riêng hoặc tin nhắn thăm hỏi kèm quà tặng cho đơn hàng kế tiếp.

#### M3-07: Trí Tuệ Khiếu Nại & Root Cause Analytics
* **Bản chất nghiệp vụ:** Không chỉ giải quyết từng vụ việc riêng lẻ, AI tự động tổng hợp toàn bộ khiếu nại trong tuần để tìm ra nguyên nhân gốc rễ phục vụ Ban Giám đốc cải tiến vận hành.
* **Cơ chế vận hành:**
  * Báo cáo tự động chỉ ra: *"Tuần này có 14 phản hồi về việc bưu phẩm móp méo, toàn bộ xuất phát từ đơn vị vận chuyển Tuyến Đào Viên ➔ Cần làm việc lại với nhà xe đối tác"*.

---

## PHẦN IV: HẠ TẦNG KẾT NỐI TÍCH HỢP SẴN (SHARED INTEGRATION ADAPTER)

Khi doanh nghiệp triển khai cả 3 Module hoặc kết nối với hệ sinh thái ERP sẵn có, hệ thống sử dụng các bộ chuyển tiếp tiêu chuẩn (Adapter) siêu nhẹ:

```
                  ┌──────────────────────────────────────────────┐
                  │      HỆ THỐNG ERP & KHO SẴN CÓ CỦA CƠ SỞ     │
                  └──────────────────────┬───────────────────────┘
                                         │ (Single Source of Truth)
                 ┌───────────────────────┴───────────────────────┐
                 │        SHARED ADAPTER & EVENT-DRIVEN BUS      │
                 ├───────────────────────────────────────────────┤
                 │ • REST API Client (GET tồn kho, POST đơn nháp)│
                 │ • Webhook Receiver (Nhận trạng thái giao vận) │
                 │ • Customer 360 Redis Cache (Bộ nhớ đệm khách) │
                 │ • AI Audit Log Engine (Ghi vết minh bạch 100%)│
                 └───────────────────────┬───────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│    MODULE 1     │             │    MODULE 2     │             │    MODULE 3     │
│   (MARKETING)   │             │     (SALES)     │             │     (CSKH)      │
└─────────────────┘             └─────────────────┘             └─────────────────┘
```

1. **REST API Client:** Giao tiếp chuẩn JSON qua TLS 1.3, chỉ đọc tồn kho/giá và gửi bản ghi nháp (Draft).
2. **Webhook Receiver:** Bắt sự kiện thời gian thực từ đơn vị vận chuyển Kiosk (Hàng đã tới trạm 7-Eleven, khách đã nhận hàng, khách chưa lấy hàng).
3. **Customer 360 Cache:** Lưu trữ ngữ cảnh hội thoại, ngôn ngữ ưu tiên và lịch sử tương tác gần nhất trong Redis với độ trễ phản hồi < 50ms.
4. **AI Audit Log Engine:** Ghi vết 100% quyết định của AI để đối soát khi cần thiết: Thời điểm tương tác, căn cứ dữ liệu ERP, nội dung đã gửi và mã phản hồi của khách.
