# BÁO CÁO ĐỀ ÁN KỸ THUẬT VÀ KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN
## HỆ THỐNG AI AGENT DOANH THU & CHĂM SÓC KHÁCH HÀNG TỰ HÀNH CẤP ENTERPRISE
### TÍCH HỢP VÀO HỆ THỐNG SẴN CÓ (WEBSITE, MOBILE APP & ERP/POS) CỦA DOANH NGHIỆP
#### (MARKETING AUTOMATION — SALES COPILOT 24/7 — SMART CSKH & RETENTION)

**Mã đề án:** AI-REV-SRS-001  
**Phiên bản:** 1.0 Enterprise Master Edition  
**Căn cứ pháp lý & Kỹ thuật:** Đề bài kỹ thuật SRS AI-REV-SRS-001 | Tiêu chuẩn Zero-Disruption | Chuẩn bảo mật TLS 1.3 / AES-256 | RESTful ERP Integration  
**Phạm vi áp dụng:** Hệ thống Web, Mobile App và ERP/POS hiện hữu của Doanh nghiệp  
**Nguyên tắc kiến trúc bất biến:** **Zero-Disruption (Không đập đi xây lại ERP/Web/App)** & **Fail-Closed (An toàn dữ liệu tuyệt đối)**  

> **ĐỊNH VỊ CHIẾN LƯỢC HỆ THỐNG:**  
> Hệ thống không phải là các chatbot độc lập rời rạc, mà là một **Lực lượng Lao động AI Doanh thu Thống nhất (Enterprise AI Revenue Workforce)** được nhúng trực tiếp vào hạ tầng Web, Mobile App và ERP sẵn có của doanh nghiệp, vận hành khép kín xuyên suốt chuỗi giá trị:  
> **Signal** ➔ **Customer 360** ➔ **Marketing** ➔ **Lead / Opportunity** ➔ **Sales** ➔ **Order** ➔ **CSKH** ➔ **Retention** ➔ **Outcome** ➔ **Learning**  
> Hệ thống hoạt động như một **Lớp Trí tuệ Ngoại vi (Intelligence Layer)**: ERP/POS tiếp tục là **System of Record** duy nhất cho Sản phẩm, Tồn kho, Giá và Đơn hàng. Mọi hành động tự hành của AI đều đặt dưới sự kiểm soát nghiêm ngặt của **Khung Quản trị Thẩm quyền (AUTH-0..5)** và **Hệ thống Luật Doanh nghiệp (BR-001..010)**.

---

## MỤC LỤC TỔNG QUAN HỒ SƠ ĐỀ ÁN

1. **Phần I:** Bối Cảnh, Hiện Trạng Hạ Tầng Sẵn Có & Nỗi Đau Vận Hành Của Doanh Nghiệp
2. **Phần II:** Bản Chất Kinh Tế & Hiệu Quả Đầu Tư (Tối Ưu Hóa Chi Phí Vận Hành & Khai Thác Doanh Thu 24/7)
3. **Phần III:** Nghiên Cứu Hành Vi Khách Hàng Trên Web/App & 5 Điểm Nghẽn Chuyển Đổi Thực Tế
4. **Phần IV:** Kiến Trúc Ghép Nối Ngoại Vi Cắm/Rút Plug-and-Play Vào Web, Mobile App & ERP Hiện Hữu
5. **Phần V:** Đặc Tả Tính Năng Thực Chiến Chi Tiết Của 3 Phân Hệ (Marketing - Sales - CSKH)
6. **Phần VI:** Khung Quản Trị Hệ Thống, Ma Trận Thẩm Quyền AUTH-0..5 & 10 Quy Tắc Nghiệp Vụ BR-001..010
7. **Phần VII:** Lộ Trình Triển Khai 6 Phân Kỳ Kỹ Thuật Gate (P0 ➔ P5) & Thứ Tự Thực Thi 18 Bước
8. **Phần VIII:** Lựa Chọn Mô Hình AI, Tối Ưu Hóa Chi Phí Token (FinOps) & Cấu Trúc Knowledge Base
9. **Phần IX:** Khung An Toàn Dữ Liệu, Bảo Mật Doanh Nghiệp & Phòng Vệ Rủi Ro Hệ Thống
10. **Phần X:** Bộ Kiểm Thử Chấp Nhận Hệ Thống (TC-E2E-001..009) & Giao Thức Đối Chứng A/B Testing
11. **Phần XI:** Human Command Center (5 Màn Hình Quản Trị & Giám Sát Tập Trung Cho Lãnh Đạo)
12. **Phần XII:** Kế Hoạch Bàn Giao, Phân Công Trách Nhiệm RACI & Cam Kết Hoàn Vốn Đầu Tư (ROI)

---

## PHẦN I: BỐI CẢNH, HIỆN TRẠNG HẠ TẦNG SẴN CÓ & NỖI ĐAU DOANH NGHIỆP

### 1. Hiện Trạng Hạ Tầng Công Nghệ Sẵn Có Của Doanh Nghiệp
Doanh nghiệp đang vận hành ổn định với nền tảng công nghệ đã được đầu tư bài bản:
* **Hệ thống Kênh số tiếp cận khách hàng:** Đã có Website thương mại điện tử và Mobile App bán hàng đang hoạt động, phục vụ lượt truy cập và mua sắm hàng ngày của khách hàng.
* **Hệ thống Giao dịch lõi (System of Record):** Đã có phần mềm ERP/POS hoàn chỉnh để quản lý danh mục sản phẩm, biến thể SKU, tồn kho thực tế, bảng giá niêm yết, hóa đơn và khách hàng.
* **Quy trình Giao vận & Thanh toán:** Đã kết nối với các đối tác vận chuyển và cổng thanh toán để xử lý đơn hàng.

### 2. Bốn Điểm Nghẽn Lớn Nhất Trong Vận Hành Khiến Doanh Nghiệp Bị Rơi Rụng Doanh Thu
Mặc dù hạ tầng đã có sẵn, doanh nghiệp vẫn đang đối mặt với những tổn thất doanh thu nghiêm trọng:

1. **Mất đơn hàng ngoài giờ & ban đêm (Night-time Revenue Leakage):**
   * Hơn **40% lượt truy cập** vào Web và Mobile App diễn ra ngoài giờ hành chính (từ 20h đến 24h đêm và cuối tuần) khi khách hàng có thời gian rảnh rỗi.
   * Nhân viên tư vấn không thể trực 24/7. Khi khách hàng thắc mắc về sản phẩm hoặc cần tư vấn mà không được phản hồi trong vòng 30 giây, hơn **70% khách hàng thoát trang** và không bao giờ quay lại.
2. **Tỷ lệ bỏ rơi giỏ hàng (Cart Abandonment) ở mức cao:**
   * Trung bình có tới **68% - 75% phiên mua sắm** phát sinh giỏ hàng nhưng khách hàng thoát ra ở bước cuối cùng vì do dự về giá, phí vận chuyển hoặc bận việc đột xuất.
   * Doanh nghiệp thiếu công cụ tự động phát hiện tức thì để gửi thông điệp chăm sóc cá nhân hóa kéo khách quay lại hoàn tất thanh toán.
3. **Quá tải nhân sự CSKH cho các câu hỏi lặp đi lặp lại:**
   * Hơn **65% thời gian và nguồn lực của đội ngũ CSKH** bị tiêu tốn vào việc trả lời các câu hỏi thủ công: *"Đơn của tôi đang ở đâu?", "Bao giờ giao hàng?", "Còn size/màu này không?", "Chính sách bảo hành đổi trả thế nào?"*.
   * Dù tốn nhiều chi phí lương thưởng, tốc độ phản hồi vẫn bị chậm vào giờ cao điểm, gây bức xúc cho khách hàng.
4. **Dữ liệu phân mảnh giữa các phòng ban (Data Silos):**
   * Marketing chạy quảng cáo kéo khách về Web/App nhưng không nắm được hành vi thực tế của khách hàng cũ trên ERP.
   * Sales tư vấn nhưng không biết khách hàng đang có khiếu nại chưa giải quyết ở CSKH, dẫn đến việc tiếp thị phản cảm.
   * Doanh nghiệp không chủ động nhận diện được chu kỳ tiêu dùng định kỳ để kích hoạt nhắc mua lại (Replenishment) trước khi khách hàng chuyển sang đối thủ.

### 3. Định Vị Mục Tiêu: Cắm Lớp Trí Tuệ Ngoại Vi (AI Revenue Workforce)
* **Tuyệt đối không xây dựng lại Website, Mobile App hay ERP/POS.**
* Xây dựng một **Lớp Trí tuệ Ngoại vi (AI Business Agent Layer)** cắm trực tiếp vào hệ thống sẵn có để:
  * Tự động hóa khâu tư vấn và chốt đơn 24/7 trên Web/App.
  * Tự động phục hồi giỏ hàng bỏ quên và kích hoạt nhu cầu mua lại.
  * Tự động hóa giải quyết 70% yêu cầu CSKH tra cứu vận đơn thời gian thực.
  * Hợp nhất toàn bộ dữ liệu Marketing - Sales - CSKH vào **Customer 360** dùng chung.

---

## PHẦN II: BẢN CHẤT KINH TẾ & HIỆU QUẢ ĐẦU TƯ (ROI)

Giải pháp mang lại giá trị tài chính đo lường được trực tiếp trên bảng cân đối kế toán của Doanh nghiệp:

### 1. Khai Thác Nguồn Doanh Thu Ban Đêm "0 Đồng Chi Phí Nhân Sự"
* Thay vì phải tuyển thêm 1-2 nhân sự trực chat ca đêm với chi phí lương thưởng, phụ cấp ca đêm từ 15 - 20 triệu VNĐ/tháng:
* AI Sales Copilot trực chiến 24/7/365 trên Website và Mobile App, phản hồi tức thì dưới 1 giây, tư vấn kỹ thuật và chốt đơn ngay trong đêm.
* **Hiệu quả tài chính:** Tăng thêm từ **12% đến 18% tổng doanh số tháng** từ tệp khách hàng mua sắm đêm muộn mà không làm phát sinh thêm chi phí nhân sự cố định.

### 2. Thu Hồi Dòng Tiền Từ 70% Giỏ Hàng Bỏ Quên
* Với doanh nghiệp có 1.000 giỏ hàng bị bỏ quên mỗi tháng:
* Động cơ Cart Recovery Agent tự động phân loại, kiểm tra tồn kho trên ERP và gửi tin nhắn kích hoạt thông minh (qua Push App / Zalo / SMS) tới khách hàng có đồng thuận:
* Khôi phục thành công từ **10% đến 15% số giỏ hàng bỏ quên** $ightarrow$ Thu về thêm **100 đến 150 đơn hàng thành công/tháng** hoàn toàn tự động.

### 3. Giảm Tải 65% Áp Lực Vận Hành CSKH
* Agent CS-01 tiếp nhận toàn bộ các yêu cầu tra cứu vận đơn, chính sách, tình trạng hàng hóa thông qua kết nối API ERP thời gian thực.
* Giải phóng nhân sự CSKH để tập trung giải quyết các vụ việc khiếu nại phức tạp hoặc chăm sóc tệp khách hàng VIP.
* Tối ưu hóa chi phí vận hành dịch vụ khách hàng từ **30% đến 45%**.

### 4. Thuật Toán Khóa Cứng Giá Sàn Chống Thất Thoát Doanh Thu (P_floor)
Để đảm bảo an toàn tài chính tuyệt đối, AI không bao giờ được phép tự ý giảm giá tùy tiện. Mọi đề xuất ưu đãi đều tuân thủ công thức:

`P_floor = Giá_vốn × (1 + Tỷ_lệ_lãi_tối_thiểu) + Phí_xử_lý_cố_định`

* **Quy tắc bất biến:** `Giá_ưu_đãi (P_offered) ≥ Giá_sàn (P_floor)`.
* Được kiểm soát bằng code logic cứng (Deterministic Logic) ngoài phạm vi can thiệp của LLM, ngăn chặn 100% rủi ro thất thoát doanh thu.

---

## PHẦN III: NGHIÊN CỨU HÀNH VI KHÁCH HÀNG & 5 ĐIỂM NGHẼN CHUYỂN ĐỔI

Hệ thống tính năng được thiết kế nhằm trực tiếp tháo gỡ **5 Rào cản tâm lý mua sắm trực tuyến** của khách hàng trên Web và Mobile App:

### 1. Rào cản "Sợ mua hớ / Do dự về giá niêm yết"
* **Hành vi:** Khách hàng thêm hàng vào giỏ nhưng dừng lại suy nghĩ xem có mã giảm giá nào khác không.
* **Đòn bẩy công nghệ:** **AI Dynamic Bargain** trong giỏ hàng. AI thương lượng thông minh trong biên độ cho phép: đề xuất mua thêm sản phẩm bổ trợ hoặc chọn thanh toán ngay để nhận ưu đãi, giúp khách hàng ra quyết định chốt đơn tức thì.

### 2. Rào cản "Lười đọc văn bản dài trên màn hình điện thoại"
* **Hành vi:** Người dùng Mobile App/Web ngại đọc bài mô tả sản phẩm chi tiết.
* **Đòn bẩy công nghệ:**
  * **Trắc nghiệm nhu cầu 1-Chạm 30 giây:** Chạm 3 icon tiêu chí, AI tự động gợi ý 2 sản phẩm khớp nhất.
  * **Context Quick Chips:** Khung chat hiển thị sẵn 3 nút bấm câu hỏi phổ biến theo đúng trang sản phẩm đang xem để khách bấm chọn nhanh.

### 3. Rào cản "Ngại thao tác thanh toán chuyển khoản phức tạp"
* **Hành vi:** Ngại nhập số tài khoản, sợ gõ sai số tiền hoặc nội dung đơn hàng.
* **Đòn bẩy công nghệ:** **Mã QR Động 1-Chạm Deeplink**. Tự động sinh mã QR chứa sẵn chính xác số tài khoản của doanh nghiệp, số tiền và mã đơn; trên điện thoại tự động mở App ngân hàng để xác thực FaceID trong 3 giây.

### 4. Rào cản "Sợ bị làm phiền thông tin cá nhân"
* **Hành vi:** Vừa vào web/app đã bị bắt đăng ký tài khoản hoặc để lại số điện thoại khiến khách thoát trang.
* **Đòn bẩy công nghệ:** Nguyên tắc **Trải nghiệm Mượt mà (Zero-Friction Browsing)**: Không đòi hỏi thông tin khi khách đang tìm hiểu sản phẩm. Thông tin chỉ thu thập tự nhiên ở bước xác nhận địa chỉ nhận hàng.

### 5. Rào cản "Băn khoăn về thời gian và địa điểm nhận hàng"
* **Hành vi:** Sợ shipper giao hàng vào giờ không có nhà hoặc lúc đang bận.
* **Đòn bẩy công nghệ:** **Hẹn giờ giao hàng 1-Chạm**: Cho phép khách hàng chủ động chọn khung giờ nhận hàng (Giờ hành chính cơ quan / Buổi tối tại nhà / Cuối tuần).

---

## PHẦN IV: KIẾN TRÚC GHÉP NỐI CẮM/RÚT (ZERO-DISRUPTION ARCHITECTURE)

Hệ thống được thiết kế theo kiến trúc ngoại vi cắm/rút độc lập, cam kết **không làm ảnh hưởng đến tính ổn định của Web, Mobile App và ERP hiện có**:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│              KIẾN TRÚC GHÉP NỐI NGOẠI VI CẮM / RÚT (ZERO-DISRUPTION ARCHITECTURE)                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│     WEBSITE HIỆN CÓ CỦA DOANH NGHIỆP                    MOBILE APP HIỆN CÓ CỦA DOANH NGHIỆP       │
│                   │                                                       │                       │
│                   ├───────────────────────────┬───────────────────────────┤                       │
│                   ▼                           ▼                           ▼                       │
│        ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐            │
│        │ MODULE 1: MARKETING │     │   MODULE 2: SALES   │     │   MODULE 3: CSKH    │            │
│        │  (Bắt thoát, Quiz)  │     │ (Tư vấn, Mặc cả 24h)│     │(Tra cứu đơn, SLA CS)│            │
│        └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘            │
│                   │                           │                           │                       │
│                   └───────────────────────────┼───────────────────────────┘                       │
│                                               ▼                                                   │
│                        ISOLATED SHADOW DOM & SECURE EVENT INGESTION                               │
│                         (Cô lập 100% CSS/JS, không ảnh hưởng web/app cũ)                          │
│                                               │                                                   │
│                                               ▼                                                   │
│                        REVENUE ORCHESTRATOR & GOVERNANCE ENGINE                                   │
│                        (Quản trị thẩm quyền AUTH-0..5 & Luật BR-001..010)                         │
│                                               │                                                   │
│                        ┌──────────────────────┴──────────────────────┐                            │
│                        ▼                                             ▼                            │
│           CUSTOMER 360 INTELLIGENCE                     SYSTEM OF RECORD (ERP / POS)              │
│       (Unified Timeline & Evidence Ledger)          (Sản phẩm, Tồn kho thực, Giá niêm yết)       │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Phương Thức Tích Hợp Kỹ Thuật
* **Trên Website:** Tích hợp thông qua file SDK siêu nhẹ (`< 20KB Gzip`), tải bất đồng bộ (`async defer`), toàn bộ giao diện được đóng gói trong **Shadow DOM** để đảm bảo không xung đột với CSS/JS hiện tại của website.
* **Trên Mobile App:** Kết nối qua REST API chuẩn hóa hoặc WebView nhúng cầu nối JS-Bridge, giữ nguyên mã nguồn native của ứng dụng.
* **Với ERP/POS:** Kết nối qua API Adapter chuẩn:
  * **Read (Đọc):** Tra cứu danh mục sản phẩm, biến thể SKU, giá niêm yết, số lượng tồn kho khả dụng và trạng thái đơn hàng.
  * **Write (Ghi):** Đẩy thông tin đơn hàng nháp (`Draft Order`) kèm mã chống trùng lặp `Idempotency-Key`, nhân viên chỉ việc duyệt trên ERP.

---

## PHẦN V: ĐẶC TẢ TÍNH NĂNG THỰC CHIẾN CỦA 3 PHÂN HỆ

Hệ thống tổ chức thành 3 phân hệ chuyên trách, dùng chung một bộ não điều phối tập trung:

### 1. PHÂN HỆ 1: MARKETING AUTOMATION & CUSTOMER INTELLIGENCE
* **Bắt ý định thoát trang (Exit-Intent Recovery):** Tự động phát hiện khi người dùng chuẩn bị đóng tab hoặc thoát app để đưa ra ưu đãi giữ chân cá nhân hóa dựa trên sản phẩm vừa xem.
* **Trắc nghiệm nhu cầu 1-chạm 30 giây:** Hướng dẫn khách hàng tìm đúng sản phẩm phù hợp qua 3 câu hỏi trắc nghiệm trực quan.
* **Xây dựng Customer 360 Profile:** Tự động tổng hợp hành vi của khách hàng từ mọi điểm chạm (Lượt xem, tìm kiếm, thêm giỏ, lịch sử mua hàng trên ERP) thành một dòng thời gian thống nhất (Unified Timeline).
* **Brand Guardian:** Kiểm duyệt tự động 100% nội dung tiếp thị, đối soát từ cấm và bảo vệ chuẩn mực phát ngôn của thương hiệu trước khi xuất bản.

### 2. PHÂN HỆ 2: SALES COPILOT 24/7 & CHỐT ĐƠN TỰ ĐỘNG
* **Tư vấn chuyên sâu 24/7 (Agent SAL-02):** Giải đáp thắc mắc về tính năng, so sánh các biến thể sản phẩm dựa trên cơ sở tri thức chính thức của doanh nghiệp.
* **Kiểm tra giá & tồn kho thời gian thực:** 100% thông tin giá và số lượng tồn kho được đối soát trực tiếp từ ERP trước khi báo cho khách.
* **Gợi ý sản phẩm thông minh (Recommendation - SAL-03):** Đề xuất sản phẩm mua kèm phù hợp (Cross-sell) hoặc sản phẩm thay thế tương đương khi mã hàng chính tạm hết.
* **Khôi phục giỏ hàng bỏ quên (Cart Recovery - SAL-04):** Tự động quét giỏ hàng chưa thanh toán sau 30-60 phút để gửi thông điệp nhắc nhở kèm ưu đãi có thời hạn.
* **Bắn đơn hàng nháp vào ERP:** Tự động tạo đơn nháp vào ERP với đầy đủ thông tin khách hàng, sản phẩm và chiết khấu, nhân viên chỉ việc bấm xác nhận.

### 3. PHÂN HỆ 3: SMART CSKH & RETENTION SUCCESS
* **Tra cứu vận đơn tự động (Agent CS-01):** Khách hàng chỉ cần nhập số điện thoại hoặc mã đơn, hệ thống tự động gọi API ERP và hãng vận chuyển để trả về vị trí bưu kiện chính xác.
* **Quy trình Quản lý Vụ việc (Case Management 7 bước):** `NEW ➔ CLASSIFIED ➔ ASSIGNED ➔ IN_PROGRESS ➔ WAITING_CUSTOMER ➔ RESOLVED ➔ CLOSED`. Mọi khiếu nại đều có mã ticket và SLA xử lý rõ ràng.
* **Cơ chế Báo động đỏ (Red Alert):** Khi phát hiện khách hàng bức xúc, khiếu nại chất lượng hoặc yêu cầu gặp người thật, AI lập tức chuyển trạng thái `ESCALATED`, gửi thông báo khẩn cấp cho Quản lý CSKH dưới 2 phút.
* **Human Takeover trong 1.0 giây:** Cho phép nhân sự thật tiếp quản cuộc hội thoại ngay lập tức chỉ với một cú nhấp chuột trên màn hình quản trị.
* **Chăm sóc chu kỳ tiêu dùng (Agent CS-02):** Tự động theo dõi chu kỳ sử dụng sản phẩm định kỳ (30 ngày, 60 ngày) để gửi tin nhắn thăm hỏi và nhắc khách mua lại trước khi cạn hàng.

---

## PHẦN VI: KHUNG QUẢN TRỊ THẨM QUYỀN & 10 QUY TẮC BẤT BIẾN

Để đảm bảo hệ thống tự hành nhưng tuyệt đối không vượt quyền hạn, hệ thống thiết lập khung quản trị chặt chẽ:

### 1. Ma Trận Thẩm Quyền 6 Cấp Độ (`AUTH-0` đến `AUTH-5`)

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           MA TRẬN THẨM QUYỀN 6 CẤP ĐỘ CỦA HỆ THỐNG AI AGENT                       │
├──────────────┬────────────────────────┬───────────────────────────────────────────────────────────┤
│ CẤP ĐỘ       │ TÊN QUYỀN HẠN          │ HÀNH ĐỘNG CỤ THỂ ĐƯỢC PHÉP THỰC HIỆN                      │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **AUTH-0**   │ Observe (Chỉ đọc)      │ Đọc dữ liệu sự kiện, phân tích hành vi, không phản hồi.   │
│ **AUTH-1**   │ Recommend (Đề xuất)    │ Gợi ý sản phẩm, tính điểm tiềm năng lead cho nhân viên.   │
│ **AUTH-2**   │ Draft (Soạn nháp)      │ Tạo bài viết nháp, soạn tin nhắn nháp, tạo đơn hàng nháp. │
│ **AUTH-3**   │ Bounded Execute        │ Tự động trả lời FAQ, tra cứu vận đơn, gửi nhắc nhở đơn    │
│              │ (Tự thực thi an toàn)  │ giỏ hàng bỏ quên trong giới hạn chính sách cho phép.      │
│ **AUTH-4**   │ Approval Required      │ Xuất bản chiến dịch diện rộng, giảm giá vượt ngưỡng,     │
│              │ (Bắt buộc duyệt)       │ duyệt đổi trả hàng hoặc hoàn tiền tài chính.             │
│ **AUTH-5**   │ Prohibited             │ TUYỆT ĐỐI CẤM: Tự ý sửa giá niêm yết ERP, bán phá giá âm  │
│              │ (Cấm hoàn toàn)        │ vốn, spam khách từ chối nhận tin, cam kết sai chính sách. │
└──────────────┴────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

### 2. Mười Quy Tắc Nghiệp Vụ Bắt Buộc (`BR-001` đến `BR-010`)
* **BR-001:** AI tuyệt đối không được tự ý tạo giá sản phẩm ngoài dữ liệu ERP.
* **BR-002:** AI không được tự thay đổi giá hoặc áp dụng mức chiết khấu vượt quá biên độ cho phép (P_offered < P_floor).
* **BR-003:** Dữ liệu Giá và Tồn kho bắt buộc phải truy vấn thời gian thực từ ERP/POS có thẩm quyền.
* **BR-004:** Cấm gửi thông điệp tiếp thị tới khách hàng không có đồng thuận (Consent) hoặc đã từ chối nhận tin.
* **BR-005:** Mọi hành động tạo thay đổi bên ngoài bắt buộc phải có `Execution-ID` duy nhất.
* **BR-006 (Idempotency):** Cơ chế thử lại khi mất mạng tuyệt đối không được tạo ra 2 đơn hàng trùng lặp hoặc gửi 2 tin nhắn lặp lại.
* **BR-007:** Mọi quyết định liên quan đến tài chính hoặc bồi thường bắt buộc phải qua cổng phê duyệt người thật (`AUTH-4`).
* **BR-008:** Agent không được phép vượt quyền hạn kể cả khi nhận được chỉ thị từ mô hình ngôn ngữ.
* **BR-009:** Nội dung khách hàng nhập vào (Prompt Injection) không thể làm thay đổi quyền hạn của hệ thống.
* **BR-010:** Mọi hành động quan trọng phải lưu đầy đủ hồ sơ bằng chứng (Evidence Record) vào sổ cái kiểm toán bất biến.

---

## PHẦN VII: LỘ TRÌNH TRIỂN KHAI 6 PHÂN KỲ GATE & 18 BƯỚC THỰC THI

Dự án được điều hành theo **6 Phân kỳ Kỹ thuật theo Gate (P0 ➔ P5)**, nghiệm thu dựa trên tiêu chuẩn chất lượng và an toàn thực tế:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      LỘ TRÌNH 6 PHÂN KỲ KỸ THUẬT THEO GATE (GATE-DRIVEN ROADMAP)                  │
├──────────────┬────────────────────────┬───────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN    │ TRỌNG TÂM TRIỂN KHAI   │ TIÊU CHÍ NGHIỆM THU EXIT GATE BẮT BUỘC                    │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P0**  │ Nền tảng & Quản trị    │ Hoàn thành Database Schemas 6 Domain, Customer 360,       │
│ (Foundation) │ dữ liệu (Governance)   │ Authority Engine AUTH-0..5, Audit Logger, Idempotency.    │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P1**  │ Thử nghiệm CSKH Pilot  │ Vận hành thành công Agent CS-01: Nhận diện 9 nhóm intent, │
│ (Customer)   │ (Tra cứu & Case Mgmt)  │ tra cứu đơn hàng ERP thật, Human Takeover dưới 1.0 giây.  │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P2**  │ Thử nghiệm Sales Pilot │ Cụm Agent SAL-01..05 hoạt động: Bảo vệ giá sàn P_floor,   │
│ (Sales)      │ (Tư vấn & Bắn đơn ERP) │ phục hồi giỏ hàng bỏ quên, tạo đơn hàng nháp vào ERP.     │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P3**  │ Thử nghiệm MKT Pilot   │ Vận hành chiến dịch Marketing E2E có kiểm duyệt Brand     │
│ (Marketing)  │ (Chiến dịch & Content) │ Guardian và Approval Center (AUTH-4); đo lường ROI.       │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P4**  │ Hợp nhất Đa phân hệ    │ Revenue Orchestrator liên kết mượt mà luồng MKT ➔ Sales   │
│ (Orchestrate)│ (Cross-domain Flow)    │ ➔ CSKH ➔ Retention trên 1 dòng thời gian C360 duy nhất.   │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P5**  │ Tự hành có kiểm soát   │ Hoàn thiện 5 màn hình Human Command Center; vượt qua 100% │
│ (Production) │ & Scale Toàn Doanh Nghiệp│ bộ 9 bài kiểm thử E2E; đạt chuẩn 10 yếu tố DoD.         │
└──────────────┴────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

### Mười Tám Bước Thực Thi Lập Trình Tuần Tự
1. Khởi tạo Database Schemas cho 6 Domain (`Customer`, `Commerce`, `Engagement`, `CS`, `AI`, `Audit`).
2. Thiết lập Canonical Contracts chuẩn hóa REST API và Pydantic Schemas.
3. Xây dựng Customer Intelligence 360 Pipeline và Unified Event Timeline.
4. Xây dựng Event Ingestion Layer tiếp nhận sự kiện từ Web và Mobile App.
5. Xây dựng Agent Core Runtime Framework quản lý vòng đời tiến trình.
6. Xây dựng Skill Registry và Tool Execution Contracts độc lập với Agent.
7. Xây dựng Connector Layer kết nối ERP Adapter (tra cứu SP, giá, tồn kho, bưu kiện).
8. Xây dựng Policy Engine và Thuật toán khóa giá sàn `P_floor` (`BR-001..010`).
9. Xây dựng Authority Engine (`AUTH-0..5`) và Module cảnh báo vượt quyền.
10. Xây dựng Idempotency Engine và Sổ cái kiểm toán bất biến (Audit / Evidence Ledger).
11. Xây dựng Central Revenue Orchestrator theo chu trình điều phối 11 bước chuẩn.
12. Phát triển Cụm CSKH Agent (`CS-01`, Case Management 7 trạng thái, Console Takeover).
13. Phát triển Cụm Sales Agent (`SAL-01..05`, Dynamic Bargain, Tạo đơn nháp ERP).
14. Phát triển Cụm Marketing Agent (`MKT-01..06`, Phân khúc C360, Brand Guardian).
15. Phát triển Agent Giữ chân & Thành công Khách hàng (`CS-02` Retention Engine).
16. Xây dựng Human Command Center Console (5 Màn hình điều hành tập trung).
17. Triển khai Bộ kiểm thử tự động Suite 9 Kịch bản Chấp nhận E2E (`TC-E2E-001..009`).
18. Tinh chỉnh FinOps AI, Giám sát Chi phí Token và Bàn giao Vận hành Hệ thống.

---

## PHẦN VIII: LỰA CHỌN MÔ HÌNH AI, TỐI ƯU FINOPS & KNOWLEDGE BASE

### 1. Kiến Trúc Two-Stage RAG & Tối Ưu Hóa Chi Phí Token
* **Vấn đề:** Nếu gửi toàn bộ danh mục sản phẩm vào LLM, chi phí token sẽ rất cao và tốc độ phản hồi chậm.
* **Giải pháp Two-Stage RAG:**
  * **Bước 1 (Lọc thô):** Sử dụng Vector Search nội bộ để tìm ra đúng 2-3 sản phẩm phù hợp nhất với câu hỏi của khách.
  * **Bước 2 (Sinh phản hồi):** Chỉ cung cấp dữ liệu của 3 sản phẩm này cho LLM để tạo câu tư vấn.
  * **Kết quả:** Giảm **85% lượng token tiêu thụ**, chi phí trung bình chỉ từ **25 đến 40 VNĐ cho mỗi cuộc hội thoại**, thời gian phản hồi dưới 1 giây.

### 2. Cấu Trúc Cây Tri Thức Doanh Nghiệp (Knowledge Base)
AI được cung cấp cấu trúc thư mục tri thức chuẩn hóa để tra cứu:
* `/company`: Lịch sử, giá trị thương hiệu và định vị thị trường.
* `/customer`: Chân dung khách hàng và tiêu chí phân khúc đối tượng.
* `/product`: Danh mục sản phẩm, biến thể SKU, giá niêm yết và chính sách khuyến mãi.
* `/brand`: Quy chuẩn văn phong ứng xử và danh mục từ cấm (Prohibited Claims).
* `/marketing`: Kịch bản chiến dịch và quy chuẩn định dạng nội dung.
* `/sales`: Quy trình tư vấn chốt đơn và kịch bản xử lý phản bác.
* `/customer-care`: Bộ câu hỏi thường gặp FAQ, chính sách bảo hành và đổi trả.
* `/policy`: Quy chế thẩm quyền `AUTH-0..5` và quy trình phê duyệt tài chính.

---

## PHẦN IX: KHUNG AN TOÀN DỮ LIỆU & BẢO MẬT DOANH NGHIỆP

1. **Phân tách Dữ liệu Nghiêm ngặt (Evidence Separation):**
   * **FACT:** Dữ liệu giao dịch thực tế đã xác minh từ ERP (đơn hàng, thanh toán, tồn kho).
   * **SIGNAL:** Dấu hiệu hành vi quan sát được (xem hàng, bỏ giỏ).
   * **HYPOTHESIS:** Giả thuyết phỏng đoán của AI (khách thích quà tặng, có nguy cơ rời bỏ).
   * **Nguyên tắc cốt tử:** *Giả thuyết AI không bao giờ được ghi đè làm sai lệch Fact của khách hàng.*
2. **An toàn Kết nối & Dữ liệu:**
   * 100% kết nối truyền tải giữa Web/App/ERP và AI Platform được mã hóa qua giao thức **TLS 1.3**.
   * Dữ liệu nhạy cảm lưu trữ trong cơ sở dữ liệu được mã hóa bằng thuật toán **AES-256**.
   * Cơ chế xác thực API Gateway qua Token và ký số toàn vẹn dữ liệu **HMAC-SHA256**.

---

## PHẦN X: BỘ KIỂM THỬ CHẤP NHẬN HỆ THỐNG (TC-E2E-001 ĐẾN 009)

Hệ thống chỉ được nghiệm thu khi vượt qua 100% bộ 9 bài kiểm thử chấp nhận:
1. **TC-E2E-001 (Chu trình E2E khép kín):** Một tín hiệu đi trọn vẹn từ `Signal ➔ Decision ➔ Action ➔ Execution ➔ Evidence ➔ Outcome`.
2. **TC-E2E-002 (Cổng kiểm soát Marketing):** Marketing Agent tuyệt đối không thể xuất bản chiến dịch nếu thiếu phê duyệt `AUTH-4`.
3. **TC-E2E-003 (Bảo vệ giá niêm yết):** Báo giá sai lệch với ERP lập tức bị hủy bỏ giao dịch (`BR-001..003`).
4. **TC-E2E-004 (Cô lập dữ liệu khách hàng):** CSKH Agent chỉ được tra cứu thông tin của đúng khách hàng đã xác minh.
5. **TC-E2E-005 (Khóa chống trùng giao dịch):** Retry mạng 10 lần liên tiếp chỉ tạo đúng 1 đơn hàng nháp và gửi đúng 1 tin nhắn (`BR-006`).
6. **TC-E2E-006 (Phòng vệ Prompt Injection):** Người dùng nhập prompt ép nâng quyền hoặc hạ giá $ightarrow$ Hệ thống lập tức từ chối (**DENY**) và ghi log cảnh báo an ninh (`BR-008..009`).
7. **TC-E2E-007 (Tuân thủ quyền riêng tư):** Khách hàng chưa cấp quyền hoặc đã opt-out sẽ bị loại trừ tự động khỏi luồng gửi tin (`BR-004`).
8. **TC-E2E-008 (Cơ chế Fail-Closed):** ERP mất kết nối $ightarrow$ Hệ thống chuyển sang trạng thái an toàn, cấm tự đoán mò giá/tồn kho (`NFR-008`).
9. **TC-E2E-009 (Truy vết nguồn gốc):** Mọi hành động thành công đều truy ngược được đầy đủ chuỗi: `Trigger ➔ Context ➔ Decision ➔ Approval ➔ Evidence`.

---

## PHẦN XI: HUMAN COMMAND CENTER (5 MÀN HÌNH ĐIỀU HÀNH)

Cung cấp cho Ban Lãnh đạo và các Trưởng bộ phận trung tâm điều hành trực quan:
* **SCR-001 (Executive Dashboard):** Theo dõi tổng doanh thu AI mang lại, tỷ lệ chốt đơn ban đêm, tỷ lệ khôi phục giỏ hàng và hiệu quả chi phí.
* **SCR-002 (Agent Operations Hub):** Giám sát trạng thái hoạt động của từng Agent, độ trễ phản hồi, chi phí token theo ngày và nhật ký lỗi.
* **SCR-003 (Approval Center):** Nơi cấp Quản lý bấm **Approve / Reject / Modify** đối với các chiến dịch tiếp thị hoặc chính sách ưu đãi lớn.
* **SCR-004 (Customer 360 Viewer):** Tra cứu hồ sơ khách hàng, dòng thời gian sự kiện thống nhất và lịch sử tương tác đa kênh.
* **SCR-005 (Conversation & Takeover Console):** Xem trực tiếp các cuộc trò chuyện của AI; nhân sự có thể bấm nút **"TIẾP QUẢN"** để can thiệp hỗ trợ khách trong vòng **≤ 1.0 giây**.

---

## PHẦN XII: KẾ HOẠCH BÀN GIAO, RACI & CAM KẾT HOÀN VỐN (ROI)

### 1. Ma Trận Phân Công Trách Nhiệm RACI

| Hạng Mục Công Việc | Ban Giám Đốc | Quản Trị Dự Án (PM/BA) | Kỹ Sư AI / Backend | Đội Ngũ Vận Hành (MKT/Sales/CS) | Đội Ngũ QA |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Phê duyệt chính sách giá sàn P_floor & Luật BR | **A** | R | C | C | I |
| 2. Thiết kế Canonical Contracts & Tích hợp ERP | I | C | **R / A** | I | C |
| 3. Xây dựng Lõi Orchestrator, Agent & Skills | I | I | **R / A** | C | C |
| 4. Xây dựng 5 Màn hình Human Command Center | I | C | **R / A** | C | I |
| 5. Kiểm thử 9 Kịch bản Chấp nhận TC-E2E | I | C | C | I | **R / A** |
| 6. Nghiệm thu từng Phân kỳ Gate (P0 ➔ P5) | **A** | **R** | R | R | R |

*(Ghi chú: A: Accountable - Chịu trách nhiệm cuối cùng; R: Responsible - Người thực hiện chính; C: Consulted - Tham vấn ý kiến; I: Informed - Nhận thông tin).*

---

### 2. Định Nghĩa Hoàn Thành Cấp Hệ Thống (Definition of Done - DoD)
Hệ thống chỉ đạt chuẩn nghiệm thu khi chứng minh được đầy đủ 10 yếu tố:
**Data thật + Agent thật + Skill thật + Tool thật + Policy thật + Approval thật + Execution thật + Evidence thật + Outcome thật + Test thật.**

### 3. Cam Kết Hoàn Vốn Đầu Tư (ROI)
* Dự án mang lại dòng tiền ròng thặng dư thông qua 3 nguồn:
  1. Doanh thu tăng thêm từ việc chốt đơn tự động ban đêm trên Web và Mobile App.
  2. Doanh thu thu hồi từ 10% - 15% số lượng giỏ hàng bị bỏ quên.
  3. Tiết kiệm từ 30% - 45% chi phí nhân sự trực ca đêm và xử lý sự vụ CSKH thông thường.
* **Thời gian hoàn vốn dự kiến:** Từ **45 đến 60 ngày** sau khi đưa vào vận hành chính thức toàn diện.

---
Báo cáo Đề án được hoàn thiện làm căn cứ pháp lý và kỹ thuật phục vụ triển khai thực địa.
