# BÁO CÁO ĐỀ ÁN KỸ THUẬT VÀ PHƯƠNG ÁN TRIỂN KHAI 3 MODULE PLUG-AND-PLAY
## TÍCH HỢP VÀO HỆ THỐNG SẴN CÓ (WEBSITE, MOBILE APP & ERP) CỦA DOANH NGHIỆP
### (MODULE 1: MARKETING AUTOMATION | MODULE 2: SALES COPILOT 24/7 | MODULE 3: SMART CSKH)
#### LỚP TRÍ TUỆ NGOẠI VI (AI BUSINESS AGENT LAYER) CẮM / RÚT ĐỘC LẬP — TIÊU CHUẨN ZERO-DISRUPTION

> **TÀI LIỆU KỸ THUẬT VẬN HÀNH & ĐỀ ÁN KINH DOANH TRÌNH BAN GIÁM ĐỐC**  
> **Chủ thể ứng dụng:** Chuỗi Bán lẻ Hàng hóa & Dịch vụ Tổng hợp phục vụ kiều bào và lao động nước ngoài tại Đài Loan (Việt Nam, Indonesia, Philippines, Thái Lan).  
> **Hiện trạng hạ tầng của cơ sở:** Doanh nghiệp đang kinh doanh ổn định; hạ tầng công nghệ hiện tại (Website thương mại điện tử, Mobile App bán hàng, hệ thống ERP quản lý kho/kế toán/giá/khách hàng và App giao vận nội địa kết nối 4 chuỗi siêu thị tiện lợi 7-Eleven, FamilyMart, Hi-Life, OK Mart) đã hoàn chỉnh và vận hành trơn tru.  
> **Định vị cốt lõi của đề án:** **Tuyệt đối không xây thêm hệ thống bán hàng mới**, không đập đi xây lại phần mềm cũ. Đề án đóng gói thành **3 Module phần mềm Plug-and-Play hoàn toàn độc lập** (Marketing - Sales - CSKH). Doanh nghiệp có thể **mua lẻ từng module**, cắm / rút độc lập theo nhu cầu hoặc triển khai trọn bộ.  
> **Chuyển đổi mô hình:** Nâng cấp từ mô hình *"AI Chatbot thụ động"* (User hỏi $\rightarrow$ LLM trả lời) thành mô hình **"AI Agent Kinh Doanh Thực Thụ"** vận hành theo chu trình tự hành:  
> $$\textbf{Observe} \longrightarrow \textbf{Understand} \longrightarrow \textbf{Decide} \longrightarrow \textbf{Act} \longrightarrow \textbf{Learn}$$

---

## MỤC LỤC ĐỀ ÁN

1. **CHƯƠNG I:** TỔNG QUAN ĐỊNH VỊ & TRIẾT LÝ 3 MODULE PLUG-AND-PLAY ĐỘC LẬP
2. **CHƯƠNG II:** KIẾN TRÚC GHÉP NỐI MICRO-FRONTEND & MICRO-SERVICE CẮM / RÚT
3. **CHƯƠNG III:** BÁO CÁO ĐỀ ÁN MODULE 1 — AI MARKETING AUTOMATION & LEAD GENERATION
4. **CHƯƠNG IV:** BÁO CÁO ĐỀ ÁN MODULE 2 — AI SALES COPILOT 24/7 & CHỐT ĐƠN TỰ ĐỘNG
5. **CHƯƠNG V:** BÁO CÁO ĐỀ ÁN MODULE 3 — SMART CSKH 24/7 & GIỮ CHÂN KHÁCH HÀNG
6. **CHƯƠNG VI:** MA TRẬN PHÂN ĐỊNH TRÁCH NHIỆM (ERP CÓ SẴN VS TỪNG MODULE AI VS CON NGƯỜI)
7. **CHƯƠNG VII:** KHUNG TIÊU CHUẨN KỸ THUẬT NGHIỆM THU & GIAO THỨC A/B TESTING TỪNG MODULE
8. **CHƯƠNG VIII:** PHƯƠNG ÁN ĐÓNG GÓI THƯƠNG MẠI & LỘ TRÌNH TRIỂN KHAI CẮM / RÚT
9. **CHƯƠNG IX:** KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG TIẾP THEO

---

## CHƯƠNG I: TỔNG QUAN ĐỊNH VỊ & TRIẾT LÝ 3 MODULE PLUG-AND-PLAY ĐỘC LẬP

### 1.1 Triết Lý 3 Module Tách Biệt: Cắm / Rút Linh Hoạt (Plug-and-Play Decoupled Architecture)

Khác biệt hoàn toàn với các giải pháp AI dạng "nguyên khối" (Monolithic Platform) bắt buộc doanh nghiệp phải mua cả cụm và phụ thuộc công nghệ, đề án này được thiết kế theo nguyên tắc **Tách Rời Hoàn Toàn Thành 3 Module Độc Lập**:

```
                  ┌────────────────────────────────────────────────────────┐
                  │      HẠ TẦNG HIỆN HỮU (ERP + WEB/APP + LOGISTICS)      │
                  └───────────────────────────┬────────────────────────────┘
                                              │ (REST API / Webhook)
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌─────────────────────────┐        ┌─────────────────────────┐        ┌─────────────────────────┐
│  MODULE 1: MARKETING    │        │     MODULE 2: SALES     │        │     MODULE 3: CSKH      │
│  (AI Lead & Traffic)    │        │ (AI 24/7 & Chốt Đơn)    │        │  (Bám Đơn & Giữ Chân)   │
├─────────────────────────┤        ├─────────────────────────┤        ├─────────────────────────┤
│ • Cổng RAG di trú / ARC │        │ • Trực chat 24/7 4 ngôn │        │ • Bám đuổi bưu kiện     │
│ • Giới thiệu người mới  │        │   ngữ (Việt/Indo/Thái)  │           7 ngày tại 7-Eleven   │
│   (Member-Get-Member)   │        │ • Bắn đơn nháp vào ERP  │        │ • Đếm ngược nạp SIM 30d │
│ • Content & đo lường    │        │ • Báo đỉnh tỷ giá tự    │        │ • Hậu mãi xe điện       │
│   Attribution ROI       │        │   động (Kiều hối)       │        │ • Phân luồng khiếu nại  │
│ • Bắt ý định rời trang  │        │ • Cross-sell 5 ngành    │        │ • Báo động đỏ < 2 phút  │
├─────────────────────────┤        ├─────────────────────────┤        ├─────────────────────────┤
│ 🔌 Nhúng: nexus-mkt.js  │        │ 🔌 Nhúng: nexus-sales.js│        │ 🔌 Nhúng: nexus-cskh.js │
│ 📦 ĐỘC LẬP HOÀN TOÀN    │        │ 📦 ĐỘC LẬP HOÀN TOÀN    │        │ 📦 ĐỘC LẬP HOÀN TOÀN    │
└─────────────────────────┘        └─────────────────────────┘        └─────────────────────────┘
```

#### 3 Giá Trị Cốt Lõi Của Kiến Trúc Module Độc Lập:
1. **Linh hoạt thương mại (Thích hợp cho Bán lẻ & B2B):** 
   * Doanh nghiệp đang nhức nhối vì **mất đơn hàng đêm muộn khi nhân viên ngủ** $\rightarrow$ Chỉ cần mua và cắm **Module 2: AI Sales Copilot**.
   * Doanh nghiệp đang đau đầu vì **tỷ lệ hoàn đơn bom hàng tại 7-Eleven quá cao** $\rightarrow$ Chỉ cần mua và cắm **Module 3: Smart CSKH**.
   * Doanh nghiệp muốn **mở rộng tệp khách hàng tự nhiên không tốn tiền ads** $\rightarrow$ Chỉ cần mua và cắm **Module 1: Marketing Automation**.
   * Khi cần tăng tốc toàn diện $\rightarrow$ Kích hoạt trọn bộ cả 3 Module.
2. **Độc lập kỹ thuật (Fault Isolation):** Nếu Module 1 bảo trì cập nhật nội dung, Module 2 vẫn chốt đơn và Module 3 vẫn bám đuổi giao vận bình thường. Nếu tháo gỡ bất kỳ module nào, hệ thống Web/App/ERP của doanh nghiệp vẫn hoạt động nguyên vẹn như trước khi nhúng.
3. **Không làm xáo trộn vận hành (Zero-Disruption):** Nhân viên cửa hàng không phải học sử dụng phần mềm mới. Mọi đơn hàng chốt qua AI đều tự động đổ về màn hình ERP quen thuộc.

---

### 1.2 Nguyên Tắc Dữ Liệu: ERP Là "Nguồn Chân Lý Duy Nhất" (Single Source of Truth)

Doanh nghiệp đã sở hữu tài sản giá trị nhất: **Dữ liệu thật trong đời sống thật** (tồn kho thời gian thực, bảng giá niêm yết, lịch sử đơn hàng, dữ liệu SIM, hồ sơ bảo hành xe điện và mạng lưới Kiosk tiện lợi).
* Các Module AI **tuyệt đối không tự ý lưu trữ bản sao dữ liệu**, không tạo database song song.
* AI chỉ đọc dữ liệu từ ERP để hiểu và ra quyết định. Mọi hành động ghi dữ liệu (tạo đơn hàng, tích điểm, ghi nhận khiếu nại) đều thực hiện qua các API có cơ chế xác thực bảo mật và khóa chống trùng lặp.

---

## CHƯƠNG II: KIẾN TRÚC GHÉP NỐI MICRO-FRONTEND & MICRO-SERVICE CẮM / RÚT

### 2.1 Phương Thức Nhúng Độc Lập (Client-Side Micro-Frontend)

Mỗi module được đóng gói thành một file Javascript độc lập, tải bất đồng bộ và cô lập hoàn toàn giao diện trong Shadow DOM:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                 CƠ CHẾ CÔ LẬP GIAO DIỆN & TẢI NHẸ CHO TỪNG MODULE                                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
       [TRÌNH DUYỆT CỦA KHÁCH HÀNG (WEBSITE HOẶC WEBVIEW MOBILE APP)]
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  nexus-mkt.js   │ │ nexus-sales.js  │ │ nexus-cskh.js   │
        │     (~5.8KB)    │ │     (~6.5KB)    │ │     (~6.9KB)    │
        ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
        │  Shadow DOM #1  │ │  Shadow DOM #2  │ │  Shadow DOM #3  │
        │(CSS Reset 100%) │ │(CSS Reset 100%) │ │(CSS Reset 100%) │
        └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                 │                   │                   │
                 └───────────────────┼───────────────────┘
                                     │ (Tải bất đồng bộ: async defer)
                                     ▼
                      [WEBSITE HIỆN HỮU CỦA DOANH NGHIỆP]
                 (Không bị chậm trang - Điểm Google PageSpeed giữ vững)
```

1. **Dung lượng siêu nhẹ (< 7KB/module):** Tải về máy khách hàng trong chưa đầy 0.1 giây.
2. **Cô lập Shadow DOM:** Toàn bộ CSS/JS của khung chat, popup hay nút bấm AI đều đóng kín trong Shadow Root, không bị vỡ giao diện hay xung đột với mã nguồn cũ của website.
3. **Tùy chọn bundle hợp nhất:** Với khách hàng sử dụng cả 3 module, hệ thống cung cấp file `nexus-sdk.min.js` (< 20KB) kết hợp cả 3 chức năng.

---

### 2.2 Kiến Trúc Máy Chủ Xử Lý Độc Lập (Server-Side Micro-Services)

Mỗi module giao tiếp với hệ thống ERP hiện có qua một Adapter chuẩn hóa:

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                        KIẾN TRÚC ADAPTER KẾT NỐI VỚI HỆ THỐNG HIỆN HỮU                            |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
  [MODULE 1: MARKETING]     [MODULE 2: SALES COPILOT]     [MODULE 3: SMART CSKH]
 (RAG tri thức di trú)     (Bán hàng 24/7 & Chốt đơn)   (Bám bưu kiện & Churn)
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │   INTEGRATION ADAPTER & EVENT BUS │
                     ├───────────────────────────────────┤
                     │ • Token Verification (HMAC-SHA256)│
                     │ • Idempotency Engine (Khóa trùng) │
                     │ • Rate Limiting & Risk Firewall   │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼ (Cổng REST API / Webhook an toàn)
                  ┌───────────────────────────────────────────────┐
                  │          HỆ THỐNG ERP & KHO HIỆN HỮU          │
                  │  (PostgreSQL / MySQL / SAP / Sapo / Haravan)  │
                  └───────────────────────────────────────────────┘
```

---

## CHƯƠNG III: BÁO CÁO ĐỀ ÁN MODULE 1 — AI MARKETING AUTOMATION & LEAD GENERATION

### 3.1 Định Vị Mũi Nhọn Nghiệp Vụ
* **Bài toán thực tế:** Khách hàng là người lao động nước ngoài tại Đài Loan thường xuyên thay đổi số điện thoại, đổi xưởng hoặc chuyển nơi ở. Chi phí chạy quảng cáo Facebook/Google ngày càng đắt đỏ và dễ bị khóa tài khoản.
* **Đòn bẩy của Module 1:** Tận dụng nhu cầu thiết yếu về **thông tin đời sống, pháp lý di trú và mạng lưới đồng hương** để biến họ thành nguồn truy cập tự nhiên (Organic Traffic) đổ về cơ sở hoàn toàn miễn phí.

---

### 3.2 Danh Mục Tính Năng Chi Tiết Module 1

#### 1. M1-01: Cổng RAG Hỏi Đáp Pháp Lý & Đời Sống (ARC, BHYT 健保, Thẻ Cư Trú)
* **Cơ chế:** Nạp toàn bộ dữ liệu chính thức từ Sở Di Dân Đài Loan và Bộ Lao Động vào cơ sở dữ liệu Vector RAG.
* **Hoạt động:** Khi khách hàng hỏi các câu hỏi: *"Làm thế nào để đổi xưởng?"*, *"Bị mất thẻ ARC thì báo ở đâu?"*, AI đối soát văn bản và trả lời chính xác bằng tiếng Việt, Indonesia, Tagalog hoặc Thái trong 3 giây.
* **Hiệu quả:** Xây dựng uy tín hàng đầu, thu hút 1.000 - 3.000 lượt tương tác tự nhiên mỗi tuần mà không tốn ngân sách quảng cáo.

#### 2. M1-02: Lan Tỏa Giới Thiệu Người Mới (Member-Get-Member / MGM)
* **Cơ chế:** Mỗi khách hàng có mã mời riêng. Khi giới thiệu bạn cùng xưởng mua đơn hàng đầu tiên:
  * Người mới được giảm ngay 50 NTD.
  * Người giới thiệu được cộng 50 điểm tích lũy đổi quà hoặc trừ tiền cước SIM.
* **Đòn bẩy:** Tận dụng thói quen sinh hoạt tập thể của công nhân tại các khu công nghiệp (Đào Viên, Tân Trúc, Đài Trung, Cao Hùng).

#### 3. M1-03: AI Content Đa Ngữ Tự Động Theo Lịch Sự Kiện Đài Loan
* **Cơ chế:** Tự động lên lịch đăng bài theo các mốc: Tết Nguyên Đán, Lễ hội Thuyền Rồng, Lễ Ramadan của người Hồi giáo Indo, ngày lễ của Philippines.
* **Nội dung:** Bài viết kèm hashtag và hình ảnh chuẩn văn hóa bản địa, kích hoạt nhu cầu mua thực phẩm truyền thống tương ứng.

#### 4. M1-04: Marketing Attribution & Đo Lường ROI Thực Tế
* **Cơ chế:** Gắn thẻ UTM cho từng kênh chia sẻ. Khi khách phát sinh đơn hàng trên Web/App hoặc qua Chat, AI liên kết mã đơn ERP với nguồn tiếp thị.
* **Hiệu quả:** Đo lường chính xác tỷ lệ hoàn vốn (ROAS) của từng chiến dịch, không dựa trên số liệu ước đoán chủ quan.

#### 5. M1-05: Bắt Ý Định Thoát Trang & Flash Deal Cá Nhân Hóa (Exit-Intent)
* **Cơ chế:** Bắt sự kiện chuột di chuyển nhanh lên thanh đóng trình duyệt hoặc thao tác vuốt thoát trang.
* **Hành động:** Kích hoạt modal 1-chạm: *"Tặng riêng bạn mã giảm giá 30 NTD áp dụng cho đơn hàng giao tới siêu thị 7-Eleven hôm nay"*.

#### 6. M1-06: AI Quảng Bá Cận Date 7h Sáng
* **Cơ chế:** 7h00 sáng mỗi ngày, AI quét kho ERP tìm các mặt hàng thực phẩm còn hạn 3-5 ngày, tự động tạo bài flash-sale trợ giá buổi sáng để xả hàng dứt điểm.

---

---

## CHƯƠNG IV: BÁO CÁO ĐỀ ÁN MODULE 2 — AI SALES COPILOT 24/7 & CHỐT ĐƠN TỰ ĐỘNG

### 4.1 Định Vị Mũi Nhọn Nghiệp Vụ
* **Bài toán thực tế:** 70% khách hàng kiều bào chỉ rảnh tay mua sắm vào ban đêm (21h - 2h sáng). Nhân viên cửa hàng nghỉ ngủ dẫn đến khách bỏ sang chỗ khác hoặc quên mất nhu cầu vào sáng hôm sau.
* **Đòn bẩy của Module 2:** AI đóng vai trò **Nhân viên Bán hàng Xuất sắc túc trực 24/7**, tư vấn am hiểu sản phẩm, kiểm tra kho thật trên ERP và tự động bắn đơn nháp vào hệ thống.

---

### 4.2 Danh Mục Tính Năng Chi Tiết Module 2

#### 1. M2-01 ⭐: Trực Chat & Tư Vấn Bán Hàng 24/7 Đa Ngữ (Sales Conversion)
* **Cơ chế:** Phản hồi tức thì (< 0.5s) bằng 4 thứ tiếng (Việt, Indonesia, Tagalog, Thái).
* **Đồng bộ kho ERP thời gian thực:** AI đọc trực tiếp số lượng tồn kho trên ERP. Nếu một mẫu xe điện màu đỏ đã hết hàng, AI chủ động giới thiệu mẫu màu đen còn hàng hoặc mẫu tương đương, tuyệt đối không tư vấn bán hàng ảo.

#### 2. M2-02 ⭐: Bắn Đơn Nháp Tự Động Vào ERP (Idempotent Draft Order Injection)
* **Bản chất:** Thay vì bắt khách phải tự bấm qua 5 bước checkout phức tạp trên web, AI chốt đơn qua chat và tự động sinh bản ghi đơn hàng nháp (Draft Order) vào ERP.
* **Cơ chế Khóa chống trùng lặp (Idempotency Key):**
  $$Key = \text{SHA256}(\text{TenantID} + \text{SessionID} + \text{ItemsHash})$$
  Đảm bảo dù mạng chập chờn hay khách bấm gửi nhiều lần, ERP chỉ tạo đúng 1 đơn duy nhất.
* **Ranh giới kế toán:** Đơn hàng do AI tạo ở trạng thái `DRAFT`. Nhân viên kho/kế toán chỉ cần bấm "Duyệt" là xuất phiếu giao hàng, giảm 100% thời gian gõ tay lại thông tin.

#### 3. M2-03 ⭐: Báo Đỉnh Tỷ Giá Kiều Hối Tự Động (High-Frequency Revenue)
* **Cơ chế:** Giám sát tỷ giá TWD/VND từ ERP từng phút.
* **Hành động:** Khi tỷ giá vượt đỉnh tuần, AI tự động kích hoạt tin nhắn tới nhóm khách quen gửi tiền: *"Tỷ giá hôm nay chạm mốc 812! Gửi 3 vạn NTD tiết kiệm thêm gần nửa triệu VNĐ. Tạo lệnh chuyển ngay tại đây!"*.
* **Hiệu quả:** Gia tăng ngay lập tức 25 - 35% doanh số chuyển tiền trong các ngày tỷ giá cao.

#### 4. M2-04: Hướng Dẫn Nộp Tiền Kiosk ibon / FamiPort Trực Quan Bằng Ảnh
* **Cơ chế:** Sinh mã thanh toán tương thích hệ thống Kiosk tiện lợi. Gửi kèm ảnh chụp màn hình máy ibon (7-Eleven) từng bước để khách hàng lần đầu cũng tự tin thao tác nộp tiền mặt.

#### 5. M2-05: Cross-Sell / Upsell Hệ Sinh Thái 5 Ngành Hàng
* **Cơ chế:** Tận dụng trọn vẹn vòng đời sản phẩm:
  * Khách mua xe điện $\rightarrow$ Đề xuất nón bảo hiểm chuẩn Đài Loan và khóa chống trộm.
  * Khách mua đồ khô $\rightarrow$ Đề xuất mua SIM 4G dung lượng lớn không giới hạn.

#### 6. M2-06: Proactive Sales Chu Kỳ Tiêu Dùng & Ngày Lương Mùng 10
* **Cơ chế:** Ghi nhận chu kỳ dùng hết gia vị/gạo sau 25-30 ngày. Đúng ngày 10 (ngày nhận lương công xưởng), AI gửi tin nhắn gợi ý nạp lại giỏ hàng kèm ưu đãi freeship siêu thị.

#### 7. M2-07: Bộ Lọc Tuân Thủ Kiều Hối & Khóa Cứng Giá Sàn ($P_{floor}$)
* **Khóa cứng giá sàn:** Thuật toán code cứng tại tầng backend:
  $$P_{sell} \ge P_{cost} + \text{Phí ship} + 5\% \text{ Biên lãi tối thiểu}$$
  Dù khách hàng có mặc cả hoặc cố tình lừa AI (Prompt Injection), hệ thống cũng từ chối mọi mức giá dưới $P_{floor}$.
* **Kiểm soát rủi ro kiều hối:** Yêu cầu quét thẻ cư trú ARC hợp lệ, từ chối mọi giao dịch không rõ nguồn gốc theo luật phòng chống rửa tiền Đài Loan.

---

---

## CHƯƠNG V: BÁO CÁO ĐỀ ÁN MODULE 3 — SMART CSKH 24/7 & GIỮ CHÂN KHÁCH HÀNG

### 5.1 Định Vị Mũi Nhọn Nghiệp Vụ
* **Bài toán thực tế:** Khách đặt hàng giao tới siêu thị 7-Eleven / FamilyMart nhưng tăng ca quên lấy, dẫn đến bưu kiện bị hoàn về kho sau 7 ngày. Doanh nghiệp chịu lỗ 2 đầu cước vận chuyển và hàng thực phẩm bị hư hỏng. Ngoài ra, khiếu nại không được xử lý nhanh dễ bùng phát thành khủng hoảng mạng xã hội.
* **Đòn bẩy của Module 3:** **Bám đuổi bưu kiện tự động**, nhắc hạn gia hạn SIM chu kỳ, chăm sóc xe điện định kỳ và **báo động đỏ lập tức cho con người khi có sự cố nghiêm trọng**.

---

### 5.2 Danh Mục Tính Năng Chi Tiết Module 3

#### 1. M3-01 ⭐: Bám Đuổi Bưu Kiện 7 Ngày Siêu Thị Tiện Lợi (Triệt Tiêu Hoàn Đơn)
* **Quy trình 4 mốc thời gian cứu vãn đơn bom:**
  * **Mốc 1 (Ngày 1 - Hàng vừa đến Kiosk):** Bắn tin kèm mã lấy hàng và Google Map địa chỉ 7-Eleven.
  * **Mốc 2 (Ngày 3 - Nhắc nhở thân thiện):** Nhắc khách ghé lấy hàng sau giờ tan ca, hướng dẫn cách nhờ bạn cùng phòng đọc số điện thoại lấy hộ nếu bận việc.
  * **Mốc 3 (Ngày 5 - Cảnh báo khẩn):** Push thông báo còn 48h trước khi bưu phẩm bị trả về.
  * **Mốc 4 (Ngày 6.5 - Báo động nhân viên gọi điện):** Kích hoạt tác vụ cho nhân viên cửa hàng gọi điện thoại trực tiếp can thiệp.
* **Hiệu quả:** Cắt giảm tỷ lệ hoàn đơn từ 12-15% xuống dưới 3%, tiết kiệm hàng chục vạn NTD phí vận chuyển mỗi tháng.

#### 2. M3-02: Đếm Ngược Gia Hạn SIM Chu Kỳ 30 Ngày
* **Cơ chế:** Tự động đếm ngược ngày $T+27$ của chu kỳ cước SIM. Gửi tin nhắn hướng dẫn nạp tiền kèm mã Kiosk, bảo vệ toàn diện nguồn doanh thu viễn thông đều đặn hàng tháng.

#### 3. M3-03: Hậu Mãi & Lịch Chăm Sóc Xe Điện Định Kỳ
* **Cơ chế:** Tự động nhắc lịch bảo dưỡng miễn phí sau 30 ngày và 90 ngày mua xe: Kiểm tra ắc quy, xiết ốc, cân chỉnh phanh. Tạo dựng uy tín thương hiệu vượt trội so với các cửa hàng xe bãi truyền thống.

#### 4. M3-04: Chuyển Giao Người Thật Tức Thì (Human Takeover Single Responder)
* **Cơ chế:** Khi khách hàng bấm nút *"Gặp nhân viên"* hoặc AI phát hiện vấn đề phức tạp:
  1. AI đổi trạng thái phiên sang `HUMAN_TAKEN` trong vòng 1.0 giây.
  2. Bắn thông báo về ứng dụng nhân viên trực.
  3. **Khóa phản hồi độc quyền:** Khi nhân viên đã vào chat, AI lập tức im lặng hoàn toàn, không trả lời chen ngang, bảo đảm sự nhất quán và trải nghiệm tôn trọng khách hàng.

#### 5. M3-05: Báo Động Đỏ Sự Cố & Phân Luồng Khiếu Nại (Red Alert < 2 Phút)
* **Cơ chế:** Quét liên tục các từ khóa nhạy cảm (*"lừa đảo"*, *"báo cảnh sát"*, *"cháy nổ"*, *"mất tiền"*).
* **Hành động:** Gửi thông báo khẩn qua Telegram/Zalo cho Quản lý trong vòng 120 giây để can thiệp trực tiếp trước khi sự việc lan rộng lên các hội nhóm Facebook.

#### 6. M3-06: Dự Báo Nguy Cơ Rời Bỏ (Customer Churn Prediction Agent)
* **Cơ chế:** AI phân tích lịch sử mua hàng, phát hiện khách quen đã quá 45 ngày không phát sinh đơn hàng mới để tự động kích hoạt kịch bản gửi tặng voucher tri ân hồi sinh tài khoản.

#### 7. M3-07: Trí Tuệ Khiếu Nại & Phân Tích Nguyên Nhân Gốc (Root Cause Analytics)
* **Cơ chế:** Hàng tuần AI tổng hợp toàn bộ khiếu nại, phân loại theo nhóm nguyên nhân (Lỗi sản phẩm, Lỗi đóng gói, Đơn vị vận chuyển giao chậm) giúp Ban Giám đốc cải thiện chất lượng dịch vụ tận gốc.

---

---

## CHƯƠNG VI: MA TRẬN PHÂN ĐỊNH TRÁCH NHIỆM (ERP CÓ SẴN VS TỪNG MODULE AI VS CON NGƯỜI)

Bảng phân định dứt điểm ranh giới để Ban Giám đốc và đội ngũ IT hiện tại hoàn toàn yên tâm về tính toàn vẹn của hệ thống:

| Nghiệp Vụ Doanh Nghiệp | Hệ Thống ERP Hiện Hữu (Source-of-Truth) | Module AI Tương Ứng Đảm Nhận | Con Người (Nhân Viên / Quản Lý) |
| :--- | :--- | :--- | :--- |
| **Quản lý Tồn kho** | Lưu trữ số lượng tồn thực tế của từng SKU trong kho. | Đọc tồn kho thời gian thực để tư vấn chính xác cho khách. | Kiểm kê kho định kỳ, nhập kho hàng hóa mới. |
| **Bảng Giá & Khuyến Mãi** | Lưu giá niêm yết, giá vốn và quy tắc khuyến mãi chuẩn. | Áp dụng đúng giá niêm yết, tuân thủ khóa cứng giá sàn $P_{floor}$. | Thiết lập chính sách giá và ngân sách khuyến mãi tổng. |
| **Tạo Đơn Hàng Mới** | Tiếp nhận bản ghi Đơn Hàng Nháp (Draft Order) từ AI. | Tự động trích xuất thông tin chat và bắn đơn nháp vào ERP. | Bấm duyệt đơn nháp, in phiếu đóng gói và xuất kho. |
| **Dịch Vụ Kiều Hối** | Lưu tỷ giá thời gian thực, xử lý hạch toán chuyển tiền. | Giám sát tỷ giá báo đỉnh, tư vấn và cấp mã Kiosk nộp tiền. | Đối soát ngân hàng, ký duyệt các lệnh chuyển tiền lớn. |
| **Giao Vận Siêu Thị** | Lưu mã vận đơn (Tracking No), nhận Webhook trạng thái. | Bám đuổi 4 mốc thời gian nhắc khách lấy hàng tại 7-Eleven. | Xử lý bưu phẩm có sự cố đặc biệt hoặc hàng trả về. |
| **Chăm Sóc & Khiếu Nại** | Lưu lịch sử tương tác và ghi chú của khách hàng. | Trả lời tự động, phân loại cảm xúc, báo động đỏ < 2 phút. | Tiếp nhận xử lý trực tiếp các ca khiếu nại phức tạp. |

---

## CHƯƠNG VII: KHUNG TIÊU CHUẨN KỸ THUẬT NGHIỆM THU & GIAO THỨC A/B TESTING TỪNG MODULE

Để đảm bảo minh bạch tài chính và kỹ thuật, mỗi module khi triển khai đều tuân thủ quy trình kiểm chứng thực nghiệm 3 giai đoạn:

```
                  ┌──────────────────────────────────────────────┐
                  │ GIAI ĐOẠN 1: KIỂM TRA MÔ PHỎNG (STAGING)    │
                  │ Kiểm tra an toàn giá sàn, khóa trùng đơn     │
                  │ và tốc độ phản hồi qua 1.000 kịch bản test   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ GIAI ĐOẠN 2: A/B TESTING ĐỐI ĐẦU THỰC TẾ     │
                  │ 50% Khách hàng: Vận hành theo cách cũ       │
                  │ 50% Khách hàng: Kích hoạt Module AI hỗ trợ  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ GIAI ĐOẠN 3: ĐỐI SOÁT TÀI CHÍNH & TRIỂN KHAI │
                  │ So sánh doanh thu, tỷ lệ hoàn đơn và chi phí │
                  │ Nghiệm thu bằng số liệu thật trên hệ thống   │
                  └──────────────────────────────────────────────┘
```

1. **Giai đoạn 1 (7 ngày):** Chạy thử nghiệm trên môi trường Staging với dữ liệu mô phỏng. Bắt buộc 100% test case về khóa trùng đơn (Idempotency) và giá sàn $P_{floor}$ phải đạt chuẩn tuyệt đối.
2. **Giai đoạn 2 (14 ngày):** Chia ngẫu nhiên 50% lưu lượng truy cập tương tác với AI và 50% tương tác theo quy trình cũ. Đo lường chênh lệch thực tế về doanh số ca đêm và tỷ lệ bưu kiện hoàn đơn.
3. **Giai đoạn 3:** Xuất báo cáo đối soát từ cơ sở dữ liệu ERP. Ban Giám đốc chỉ ký nghiệm thu khi các chỉ số cam kết đạt hoặc vượt mục tiêu SLA.

---

## CHƯƠNG VIII: PHƯƠNG ÁN ĐÓNG GÓI THƯƠNG MẠI & LỘ TRÌNH TRIỂN KHAI CẮM / RÚT

### 8.1 Lựa Chọn Gói Triển Khai Linh Hoạt

| Phương Án | Module Bao Gồm | Thời Gian Tích Hợp | Giá Trị Mang Lại Tức Thì |
| :--- | :--- | :---: | :--- |
| **GÓI 1: BỨT PHÁ DOANH SỐ** | **Chỉ triển khai Module 2 (AI Sales Copilot 24/7)** | **3 - 5 ngày** | Cứu vãn doanh số ca đêm, tự động chốt đơn và tăng tốc dịch vụ kiều hối. |
| **GÓI 2: CHỐNG THẤT THOÁT** | **Chỉ triển khai Module 3 (Smart CSKH 24/7)** | **3 - 5 ngày** | Triệt tiêu hoàn đơn siêu thị 7-Eleven, khóa doanh thu SIM và dập tắt khiếu nại. |
| **GÓI 3: MỞ RỘNG THỊ PHẦN** | **Chỉ triển khai Module 1 (Marketing Automation)** | **3 - 5 ngày** | Thu hút tệp khách lao động mới qua cổng RAG di trú và chương trình giới thiệu MGM. |
| **GÓI ALL-IN-ONE COMBO** | **Kích hoạt trọn vẹn cả 3 Module (MKT + SALES + CSKH)** | **7 - 10 ngày** | Tự động hóa khép kín toàn bộ hành trình khách hàng từ lúc biết đến cửa hàng đến khi gắn bó trọn đời. |

---

### 8.2 Lộ Trình Triển Khai Chi Tiết (Tuần 1 - Tuần 6)

```
Tuần 1: Cắm Module 2 (Sales 24/7, Bắn đơn nháp ERP) & Module 3 (Bám đuổi bưu kiện 7-Eleven)
  ├── Kết nối REST API đọc tồn kho và POST đơn nháp vào ERP
  ├── Lắng nghe Webhook giao nhận từ đối tác Kiosk tiện lợi
  └── Kích hoạt 4 tính năng mũi nhọn cốt lõi: M2-01, M2-02, M2-03, M3-01

Tuần 2: Cắm Module 1 (Cổng RAG di trú ARC/BHYT) & Bộ kiểm soát rủi ro kiều hối
  ├── Triển khai kho tri thức RAG pháp lý lao động Đài Loan
  ├── Kích hoạt bộ lọc tuân thủ định danh kiều hối (M2-07) và Báo động đỏ (M3-05)
  └── Đánh giá hiệu quả bước đầu qua A/B Testing 50/50

Tuần 3 - 4: Mở rộng tính năng giá trị gia tăng
  ├── Kích hoạt Đếm ngược gia hạn SIM (M3-02) và Hậu mãi xe điện (M3-03)
  ├── Kích hoạt Giới thiệu người mới MGM (M1-02) và Cross-sell hệ sinh thái (M2-05)
  └── Kích hoạt Bắt ý định thoát trang (M1-05)

Tuần 5 - 6: Trí tuệ nâng cao & Tự động hóa hoàn toàn
  ├── Kích hoạt AI Churn Prediction (M3-06) và Root Cause Analytics (M3-07)
  ├── Kích hoạt Marketing Attribution (M1-04) và Tự động xả hàng cận date 7h sáng (M1-06)
  └── Hoàn tất nghiệm thu toàn diện và bàn giao tài liệu kỹ thuật
```

---

## CHƯƠNG IX: KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG TIẾP THEO

### 9.1 Sáu Nguyên Tắc Vận Hành Bất Biến

1. **ERP là Chân Lý Duy Nhất:** AI chỉ đọc và đề xuất, ERP giữ quyền quyết định cuối cùng về giá, tồn kho và xuất hóa đơn.
2. **Module Hóa Độc Lập:** 3 Module cắm/rút độc lập, không ép buộc triển khai nguyên khối, bảo đảm an toàn vận hành 100%.
3. **Tuyệt Đối Không Trùng Đơn:** 100% đơn nháp bắn vào ERP đều qua cơ chế khóa Idempotency Key bất biến.
4. **Khóa Cứng Giá Sàn:** Không để AI tự ý đàm phán giá dưới biên lợi nhuận an toàn ($P_{floor}$).
5. **Ưu Tiên Tuyệt Đối Người Thật:** Nhân viên can thiệp thì AI ngắt phản hồi tức thì trong 1.0 giây, không nói tranh.
6. **Tuân Thủ Pháp Lý Kiều Hối:** Không để AI tự động chuyển tiền vượt hạn mức hoặc thiếu giấy tờ định danh hợp pháp.

---

### 9.2 Bốn Tính Năng Mũi Nhọn Cần Kích Hoạt Đầu Tiên (Pareto 80/20)

Theo nguyên lý Pareto, 4 tính năng sau đây sẽ mang lại 80% giá trị tài chính ngay trong 2 tuần đầu:
1. **M3-01 ⭐ (Bám đuổi bưu kiện 7-Eleven):** Cắt đứt nguồn thất thoát tiền mặt do hoàn đơn bom hàng.
2. **M2-01 ⭐ (Trực chat bán hàng 24/7):** Khai thác triệt để doanh thu khung giờ vàng ca đêm khi nhân viên ngủ.
3. **M2-02 ⭐ (Bắn đơn nháp tự động vào ERP):** Giải phóng đội ngũ bán hàng khỏi việc nhập liệu thủ công.
4. **M2-03 ⭐ (Báo đỉnh tỷ giá kiều hối tự động):** Kích hoạt dòng tiền chuyển khoản kiều hối tần suất cao.

---

### 9.3 Đề Xuất Bước Đi Tiếp Theo
Ban Giám đốc phê duyệt triển khai thử nghiệm **Pha 1 (2 tuần đầu)** với **Module 2 (Sales 24/7)** và **Module 3 (Bám đuổi bưu kiện)** trên một nhóm sản phẩm tiêu biểu. Hiệu quả kinh doanh thực tế sẽ là căn cứ vững chắc nhất để mở rộng toàn diện hệ thống.
