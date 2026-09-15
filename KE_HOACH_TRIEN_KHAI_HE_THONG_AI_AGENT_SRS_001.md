# BÁO CÁO ĐỀ ÁN KỸ THUẬT VÀ KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN
## HỆ THỐNG AI AGENT DOANH THU & CHĂM SÓC KHÁCH HÀNG TỰ HÀNH CẤP ENTERPRISE
### TÍCH HỢP 3 MODULE PLUG-AND-PLAY (MARKETING — SALES — CSKH) VÀO HỆ THỐNG SẴN CÓ (WEBSITE, MOBILE APP & ERP) CỦA DOANH NGHIỆP
#### ÁP DỤNG CHUẨN ĐẶC TẢ KIẾN TRÚC MINH BẠCH: AI-REV-SRS-001 (VERSION 1.0 ENTERPRISE)

**Mã đề án:** AI-REV-SRS-001  
**Phiên bản:** 1.0 Enterprise Master Edition  
**Chủ thể áp dụng:** Chuỗi Bán lẻ Hàng hóa & Dịch vụ Tổng hợp phục vụ kiều bào và lao động tại Đài Loan (Việt Nam, Indonesia, Philippines, Thái Lan)  
**Hiện trạng hạ tầng của doanh nghiệp:** Đã có sẵn Website thương mại điện tử, Mobile App bán hàng, hệ thống ERP/POS quản lý kho/giá/đơn hàng và hệ thống kết nối giao nhận bưu cục 7-Eleven, FamilyMart  
**Nguyên tắc kỹ thuật sống còn:** **Zero-Disruption (Tuyệt đối không xây thêm web/app mới, không đập đi xây lại ERP)** & **Fail-Closed (An toàn dữ liệu tuyệt đối)**  
**Ranh giới phạm vi bắt buộc:** 
* ❌ Tuyệt đối KHÔNG gom đơn KTX / xưởng.
* ❌ Tuyệt đối KHÔNG thu cũ đổi mới xe điện.
* ❌ Tuyệt đối KHÔNG chỉ làm ca đêm mà vận hành **AI tự hành 24/7 toàn thời gian**.
* ❌ Tuyệt đối KHÔNG dùng "bạn cùng xưởng", chuẩn hóa thành **"Giới thiệu người mới (Member-Get-Member)"**.
* ❌ Tuyệt đối KHÔNG đưa vào các con số ước đoán chủ quan; quản trị tiến độ theo **Gate Kỹ thuật P0 ➔ P5 (Không ép tuần/ngày)**.

> **ĐỊNH VỊ CHIẾN LƯỢC HỆ THỐNG:**  
> Hệ thống được tổ chức thành **3 Module Plug-and-Play độc lập (Marketing Automation - Sales Copilot 24/7 - Smart CSKH & Retention)** cắm trực tiếp vào Web, Mobile App và ERP sẵn có của doanh nghiệp. Ba module vận hành liên thông khép kín theo chu trình điều phối chuẩn của Ban Giám đốc:  
> **Signal** ➔ **Customer 360** ➔ **Marketing** ➔ **Lead / Opportunity** ➔ **Sales** ➔ **Order** ➔ **CSKH** ➔ **Retention** ➔ **Outcome** ➔ **Learning**  
> ERP/POS tiếp tục là **System of Record (Nguồn chân lý duy nhất)** cho Sản phẩm, Biến thể SKU, Giá niêm yết, Tồn kho thực tế và Đơn hàng. Mọi quyền thực thi của AI đều bị khóa cứng bởi **Khung Quản trị Thẩm quyền (AUTH-0..5)** và **10 Quy tắc Nghiệp vụ (BR-001..010)**.

---

## MỤC LỤC HỒ SƠ ĐỀ ÁN TOÀN DIỆN

1. **Phần I:** Bối Cảnh Thực Tế, Hiện Trạng Hạ Tầng Sẵn Có & Ranh Giới Phạm Vi Đề Án
2. **Phần II:** Bản Chất Kinh Tế: Cơ Chế Tái Phân Bổ Hoa Hồng Sales & Khóa Cứng Giá Sàn Chống Bán Lỗ ($P_{floor}$)
3. **Phần III:** Kiến Trúc Ghép Nối Ngoại Vi 3 Module Plug-and-Play (Zero-Disruption Architecture)
4. **Phần IV:** Danh Mục Tính Năng Chi Tiết 3 Module & Phân Định Nhóm Tính Năng Mũi Nhọn (KEY ~20%)
5. **Phần V:** Khung Quản Trị Hệ Thống, Ma Trận Thẩm Quyền AUTH-0..5 & 10 Quy Tắc Nghiệp Vụ BR-001..010
6. **Phần VI:** Lộ Trình Triển Khai 6 Phân Kỳ Kỹ Thuật Gate (P0 ➔ P5) & Thứ Tự Thực Thi 18 Bước
7. **Phần VII:** Thiết Kế Cơ Sở Dữ Liệu 6 Domain & Customer Intelligence 360 (Tách Biệt FACT vs HYPOTHESIS)
8. **Phần VIII:** Kiến Trúc Two-Stage RAG, Tối Ưu FinOps Token & Cấu Trúc Knowledge Base 5 Ngành Hàng
9. **Phần IX:** Khung An Toàn Dữ Liệu, Bảo Mật Doanh Nghiệp & Tiêu Chuẩn Giao Tiếp API
10. **Phần X:** Bộ Kiểm Thử Chấp Nhận Hệ Thống (TC-E2E-001..009) & Giao Thức Đối Chứng A/B Testing
11. **Phần XI:** Human Command Center (5 Màn Hình Quản Trị & Giám Sát Tập Trung Cho Ban Lãnh Đạo)
12. **Phần XII:** Ma Trận Phân Công Trách Nhiệm RACI & Định Nghĩa Hoàn Thành (Definition of Done - DoD)

---

## PHẦN I: BỐI CẢNH THỰC TẾ, HIỆN TRẠNG HẠ TẦNG & RANH GIỚI PHẠM VI

### 1. Hiện Trạng Hạ Tầng Công Nghệ Sẵn Có
Doanh nghiệp đang vận hành chuỗi siêu thị bán lẻ và dịch vụ đa kênh phục vụ cộng đồng kiều bào (lao động công xưởng, hộ lý, du học sinh, người định cư) tại Đài Loan:
* **Kênh số sẵn có:** Website thương mại điện tử và Mobile App bán hàng đang chạy ổn định.
* **Hệ thống lõi sẵn có (System of Record):** Hệ thống ERP/POS quản lý tập trung toàn bộ dữ liệu 5 ngành hàng:
  1. *Nhu yếu phẩm & Đồ ăn quê hương* (mì tôm, gia vị, đồ hộp, đồ khô).
  2. *SIM 4G / Thẻ cước data* (chu kỳ tiêu dùng 30 ngày).
  3. *Xe đạp điện mới & Phụ kiện chính hãng* (sạc, bình ắc quy, lốp, phanh).
  4. *Dịch vụ Kiều hối* (báo tỷ giá TWD/VND).
  5. *Dịch vụ Vận chuyển 2 chiều Đài - Việt*.
* **Mạng lưới giao vận:** Đã liên kết API hoàn chỉnh với 4 chuỗi siêu thị tiện lợi nội địa Đài Loan (**7-Eleven, FamilyMart, Hi-Life, OK Mart**) để khách nhận hàng tại bưu cục sau giờ tan ca.

### 2. Bốn Điểm Nghẽn Vận Hành Lớn Nhất Cần Hóa Giải
1. **Nhu cầu mua sắm rải rác 24/7:** Khách hàng tan ca xưởng lúc 21h - 2h sáng, hoặc tranh thủ lướt điện thoại giờ nghỉ trưa. Nhân viên cửa hàng không thể trực chat liên tục 24/7 $
ightarrow$ Mất khách vào tay các tiệm tạp hóa bản địa.
2. **Khách hàng mới không nhớ mã SKU chuẩn:** Khách tìm kiếm theo mô tả đời thường hoặc hương vị quê hương (ví dụ: *"bánh tròn ngọt nhân sầu riêng trứng muối"*, *"sạc xe 4 bình chân vuông"*). Công cụ tìm kiếm từ khóa cũ trên Web/App báo *"0 kết quả"* $
ightarrow$ Khách bỏ đi.
3. **Mất đơn khi hết hàng cục bộ (Out-of-Stock):** Khi kho hết một loại mì hoặc gia vị quen thuộc, nhân viên trả lời *"Hết hàng"* $
ightarrow$ Khách hủy cả giỏ hàng.
4. **Quá tải CSKH tra cứu vận đơn & Bão lũ (Typhoon Day):** Đội ngũ CSKH mất 70% thời gian tra cứu bưu kiện 7-Eleven. Khi có bão lớn chính quyền cho nghỉ bão, giao vận bị đình trệ, khách lo lắng nhắn tin dồn dập gây nghẽn tổng đài.

### 3. Ranh Giới Phạm Vi Tuyệt Đối (Non-Negotiable Boundaries)
* **Zero-Disruption:** Không xây dựng lại website hay app; không can thiệp cơ sở dữ liệu gốc của ERP.
* **Cấm triệt để:** Không làm tính năng gom đơn KTX/xưởng; Không làm thu cũ đổi mới xe điện; Không chỉ giới hạn ở ca đêm mà vận hành tự hành 24/7; Thay thế "bạn cùng xưởng" bằng cơ chế **"Giới thiệu người mới (Member-Get-Member)"** áp dụng chung cho mọi đối tượng kiều bào.

---

## PHẦN II: BẢN CHẤT KINH TẾ & THUẬT TOÁN KHÓA CỨNG GIÁ SÀN ($P_{floor}$)

### 1. Bản Chất Kinh Tế: Tái Phân Bổ Hoa Hồng Sales Thành Biên Độ Mặc Cả
* Trong mô hình bán hàng truyền thống, doanh nghiệp phải chiết khấu từ **3% đến 7% hoa hồng** cho nhân viên tư vấn chốt đơn.
* Khi AI Agent tự hành tư vấn và chốt đơn 24/7 trên Web/App: Chi phí hoa hồng nhân viên bằng **0 TWD**.
* Doanh nghiệp sử dụng chính khoản hoa hồng tiết kiệm được này (3% - 5%) làm **Biên độ Mặc cả Độc quyền cho AI**. AI dùng khoản này để bớt trực tiếp tiền mặt vào hóa đơn cho khách hàng khi thương lượng.

**Giá bán truyền thống** = Giá vốn + Chi phí vận hành + **Lợi nhuận ròng** + **Hoa hồng Sales (3% - 7%)**  
**Giá bán qua AI** = Giá vốn + Chi phí vận hành + **Lợi nhuận ròng (Bảo toàn 100%)** + **Giảm tiền mặt cho khách (3% - 5%)**

➔ **Kết quả:** Khách hàng thỏa mãn tâm lý săn deal hời; Doanh nghiệp bảo toàn nguyên vẹn 100% tỷ suất lợi nhuận ròng.

### 2. Thuật Toán Khóa Cứng Giá Sàn Chống Bán Lỗ ($P_{floor}$)
Để ngăn chặn hoàn toàn rủi ro khách hàng tấn công Prompt Injection ép AI bán phá giá hoặc hạ giá âm vốn:

`P_floor = Giá_vốn × (1 + Tỷ_lệ_lãi_tối_thiểu) + Phí_xử_lý_cố_định`

* **Quy tắc bất biến:** `Giá_đề_xuất (P_offered) ≥ Giá_sàn (P_floor)`.
* Thuật toán được code cứng bằng Python Logic độc lập ngoài LLM. Mọi mức giá do AI đề xuất bắt buộc phải được Policy Engine thẩm định trước khi hiển thị cho khách hàng.

---

## PHẦN III: KIẾN TRÚC GHÉP NỐI NGOẠI VI 3 MODULE PLUG-AND-PLAY

Hệ thống được đóng gói thành **3 Module độc lập hoàn toàn**, có thể cắm / rút linh hoạt vào Web, Mobile App và ERP sẵn có:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│              KIẾN TRÚC GHÉP NỐI NGOẠI VI 3 MODULE PLUG-AND-PLAY (ZERO-DISRUPTION)                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│     WEBSITE HIỆN CÓ CỦA DOANH NGHIỆP                    MOBILE APP HIỆN CÓ CỦA DOANH NGHIỆP       │
│                   │                                                       │                       │
│                   ├───────────────────────────┬───────────────────────────┤                       │
│                   ▼                           ▼                           ▼                       │
│        ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐            │
│        │ MODULE 1: MARKETING │     │   MODULE 2: SALES   │     │   MODULE 3: CSKH    │            │
│        │ (nexus-mkt.min.js)  │     │(nexus-sales.min.js) │     │ (nexus-cskh.min.js) │            │
│        │  Dung lượng: ~5.8KB │     │  Dung lượng: ~6.5KB │     │  Dung lượng: ~6.9KB │            │
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

* **Độc lập vận hành:** Doanh nghiệp có thể bật/tắt từng module độc lập. Nếu tắt Module Marketing, Module Sales và CSKH vẫn hoạt động bình thường.
* **An toàn giao diện:** Toàn bộ giao diện cắm vào Web/App được đóng gói trong **Shadow DOM**, đảm bảo không bao giờ làm biến dạng giao diện cũ của doanh nghiệp.

---

## PHẦN IV: DANH MỤC TÍNH NĂNG CHI TIẾT 3 MODULE & ĐỊNH VỊ NHÓM KEY (~20%)

Để đảm bảo hệ thống tập trung cao độ vào hiệu quả kinh doanh, các tính năng được phân định rõ ràng giữa **Nhóm Mũi Nhọn (KEY ~20% tạo 80% kết quả)** và **Nhóm Bổ trợ mở rộng**:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      MA TRẬN PHÂN LOẠI TÍNH NĂNG 3 MODULE (KEY VS BỔ TRỢ)                         │
├─────────────────────┬──────────────────────────────────────────────┬──────────────────────────────┤
│ PHÂN HỆ NGHIỆP VỤ   │ 🟢 TÍNH NĂNG MŨI NHỌN (KEY ~20% LÀM NGAY)    │ 🟡 TÍNH NĂNG BỔ TRỢ MỞ RỘNG  │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────┤
│ **1. Marketing**    │ • **Exit-Intent Recovery Popup** (Bắt thoát) │ • Dwell-Time Tracker (> 8s)  │
│ **Automation**      │ • **Interactive Quiz 30s** (Trắc nghiệm nhu  │ • LocalStorage Zero-Login    │
│                     │   cầu tìm sản phẩm 1-chạm)                   │ • Brand Guardian (Duyệt bài) │
│                     │ • **Member-Get-Member** (Giới thiệu người    │ • Móc chuyển đổi RAG di trú/ │
│                     │   mới nhận voucher mua hàng)                 │   ARC sang đơn hàng          │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────┤
│ **2. AI Sales**     │ • **AI Dynamic Bargain** (Mặc cả có giá sàn) │ • Target-Fit Check           │
│ **Copilot 24/7**    │ • **Slide-Over Quick Cart** (Giỏ trượt 1-trang│ • Ghi nhớ tài khoản 1-chạm   │
│                     │ • **Đón sóng ngày lương mùng 10 hàng tháng** │ • Hẹn giờ nhận hàng bưu cục  │
│                     │ • **Cứu đơn hết hàng cục bộ (Substitute)**   │ • Nhắc mua bù định kỳ        │
│                     │ • **Tìm kiếm theo mô tả tự nhiên/hương vị**  │   (Replenishment Engine)     │
├─────────────────────┼──────────────────────────────────────────────┼──────────────────────────────┤
│ **3. Smart CSKH &** │ • **Quick Action Chips 0.5s** (Chạm nhanh)   │ • Rút gọn Tag kho đóng gói   │
│ **Retention 24/7**  │ • **Tra cứu vận đơn 7-Eleven tự động từ ERP**│ • Hướng dẫn mở hộp 3 bước    │
│                     │ • **Báo động đỏ (Crisis Alert < 2 phút)**    │ • Model-Match phụ kiện xe    │
│                     │ • **Lịch chăm sóc SIM 30d & Xe điện 30-90d** │ • Trấn an bưu kiện khi có    │
│                     │ • **Human Takeover trong ≤ 1.0 giây**        │   bão lũ (Typhoon Day)       │
└─────────────────────┴──────────────────────────────────────────────┴──────────────────────────────┘
```

---

### ĐẶC TẢ CHI TIẾT CÁC TÍNH NĂNG MŨI NHỌN (KEY):

#### Nhóm Marketing:
1. **Exit-Intent Recovery Popup (MKT-KEY-01):** Bắt chuyển động chuột vọt lên thanh tab hoặc thao tác back nhanh trên mobile $
ightarrow$ Bung modal giữ chân kèm voucher độc quyền phiên truy cập.
2. **Interactive Quiz 30s (MKT-KEY-02):** Chạm 3 icon trực quan (Nhu cầu đồ ăn/SIM/xe $
ightarrow$ Ngân sách $
ightarrow$ Tiêu chí) $
ightarrow$ Gợi ý ngay 2 sản phẩm khớp nhất trong 15 giây.
3. **Member-Get-Member (MKT-KEY-03):** Cơ chế kiều bào giới thiệu người mới (du học sinh mới sang, lao động mới sang xưởng) cùng nhận mã ưu đãi giảm giá bưu cục.

#### Nhóm Sales:
1. **AI Dynamic Bargain ($P_{floor}$) (SAL-KEY-01):** Mặc cả thông minh 3 hiệp trong giỏ trượt; giằng co và bớt trực tiếp 3% - 5% tiền mặt vào đơn hàng, khóa giá trong 10 phút.
2. **Slide-Over Quick Cart (SAL-KEY-02):** Bấm mua là giỏ hàng trượt ra từ bên phải màn hình. Xem giỏ, chọn bưu cục 7-Eleven và chốt đơn ngay tại 1 trang duy nhất không tải lại trang.
3. **Đón sóng ngày lương mùng 10 (SAL-KEY-03):** Tự động hẹn giờ tối ngày 10 (ngày kiều bào nhận lương), quét lịch sử ERP cũ và gửi tin nhắn LINE/Zalo kèm giỏ hàng quen thuộc đã soạn sẵn chỉ cần bấm xác nhận.
4. **Cứu đơn hết hàng cục bộ (Substitute) (SAL-KEY-04):** Khi sản phẩm khách hỏi tạm hết kho ERP, AI đối soát ngay danh mục thay thế tương đương để chào phương án đổi món trong 0.5 giây, bảo vệ 100% giá trị đơn hàng.
5. **Tìm kiếm theo mô tả tự nhiên / hương vị (SAL-KEY-05):** Khách gõ mô tả đời thường (*"bánh tròn ngọt sầu riêng"*, *"sạc xe 4 bình"*) $
ightarrow$ Semantic Search tìm ra chính xác mã SKU trên ERP.

#### Nhóm CSKH:
1. **Quick Action Chips 0.5s (CS-KEY-01):** Khung chat tự động bung sẵn 3 câu hỏi nhanh theo đúng ngữ cảnh sản phẩm đang xem.
2. **Tra cứu vận đơn 7-Eleven tự động (CS-KEY-02):** Khách hỏi tiến độ đơn $
ightarrow$ AI nhận diện danh tính, tra cứu mã vận đơn trên ERP và trả về hành trình bưu kiện chuẩn xác.
3. **Báo động đỏ & Human Takeover ≤ 1.0s (CS-KEY-03):** Khách bức xúc hoặc yêu cầu gặp người thật $
ightarrow$ AI ngắt lời ngay lập tức, báo động Telegram cho quản lý dưới 2 phút, nhân viên bấm tiếp quản trong 1.0 giây.
4. **Lịch chăm sóc SIM 30 ngày & Xe điện 30-90 ngày (CS-KEY-04):** Tự động đếm ngày từ hóa đơn ERP để nhắc nạp cước data trước khi khóa SIM, và nhắc bảo dưỡng ắc quy/phanh xe điện mới định kỳ.

---

## PHẦN V: KHUNG QUẢN TRỊ THẨM QUYỀN & 10 QUY TẮC BẤT BIẾN (BR-001..010)

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
│ **AUTH-3**   │ Bounded Execute        │ Tự động trả lời FAQ, tra cứu vận đơn 7-Eleven, gửi nhắc   │
│              │ (Tự thực thi an toàn)  │ giỏ hàng bỏ quên trong giới hạn chính sách cho phép.      │
│ **AUTH-4**   │ Approval Required      │ Xuất bản chiến dịch diện rộng, giảm giá vượt ngưỡng,     │
│              │ (Bắt buộc duyệt)       │ duyệt bồi thường hoặc hoàn tiền tài chính.               │
│ **AUTH-5**   │ Prohibited             │ TUYỆT ĐỐI CẤM: Tự ý sửa giá niêm yết ERP, bán phá giá âm  │
│              │ (Cấm hoàn toàn)        │ vốn, spam khách từ chối nhận tin, cam kết sai chính sách. │
└──────────────┴────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

### 2. Mười Quy Tắc Nghiệp Vụ Bắt Buộc (`BR-001` đến `BR-010`)
* **BR-001:** AI tuyệt đối không được tự ý sinh giá bán sản phẩm ngoài dữ liệu ERP.
* **BR-002:** AI không được tự thay đổi giá hoặc áp dụng mức giảm giá vượt quá biên độ cho phép (P_offered < P_floor).
* **BR-003:** Dữ liệu Giá niêm yết và Tồn kho bắt buộc phải truy vấn thời gian thực từ ERP có thẩm quyền.
* **BR-004:** Cấm gửi thông điệp tiếp thị tới khách hàng không có đồng thuận (Consent) hoặc đã chọn từ chối nhận tin (Opt-out).
* **BR-005:** Mọi hành động tạo thay đổi bên ngoài bắt buộc phải có `Execution-ID` duy nhất.
* **BR-006 (Idempotency):** Cơ chế thử lại khi mất mạng tuyệt đối không được tạo ra 2 đơn hàng trùng lặp hoặc gửi 2 tin nhắn lặp lại cho khách.
* **BR-007:** Mọi quyết định liên quan đến tiền bạc, bồi thường hoặc hoàn tiền bắt buộc phải qua cổng phê duyệt người thật (`AUTH-4`).
* **BR-008:** Agent không được phép tự nâng quyền hạn của mình dưới bất kỳ hình thức nào.
* **BR-009:** Nội dung khách hàng nhập vào (Prompt Injection) không thể làm thay đổi quyền hạn hoặc phá vỡ chính sách của hệ thống.
* **BR-010:** Mọi hành động quan trọng phải lưu đầy đủ hồ sơ bằng chứng (Evidence Record) vào sổ cái kiểm toán bất biến.

---

## PHẦN VI: LỘ TRÌNH TRIỂN KHAI 6 PHÂN KỲ GATE & 18 BƯỚC THỰC THI

Dự án vận hành theo **6 Phân kỳ Kỹ thuật theo Gate (P0 ➔ P5)**, không gò bó số tuần mà nghiệm thu dựa trên tiêu chuẩn chất lượng:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      LỘ TRÌNH 6 PHÂN KỲ KỸ THUẬT THEO GATE (GATE-DRIVEN ROADMAP)                  │
├──────────────┬────────────────────────┬───────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN    │ TRỌNG TÂM TRIỂN KHAI   │ TIÊU CHÍ NGHIỆM THU EXIT GATE BẮT BUỘC                    │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P0**  │ Nền tảng & Quản trị    │ Hoàn thành Database Schemas 6 Domain, Customer 360,       │
│ (Foundation) │ dữ liệu (Governance)   │ Authority Engine AUTH-0..5, Audit Logger, Idempotency.    │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P1**  │ Thử nghiệm CSKH Pilot  │ Vận hành thành công Agent CS-01: Nhận diện intent, tra    │
│ (Customer)   │ (Tra cứu & Case Mgmt)  │ cứu đơn 7-Eleven ERP thật, Human Takeover dưới 1.0 giây.  │
├──────────────┼────────────────────────┼───────────────────────────────────────────────────────────┤
│ **Gate P2**  │ Thử nghiệm Sales Pilot │ Cụm Agent SAL-01..05 hoạt động: Bảo vệ giá sàn P_floor,   │
│ (Sales)      │ (Tư vấn & Bắn đơn ERP) │ cứu đơn hết hàng, tạo đơn hàng nháp vào ERP.              │
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

### Mười Tám Bước Thực Thi Lập Trình Tuần Tự:
1. Khởi tạo Database Schemas cho 6 Domain (`Customer`, `Commerce`, `Engagement`, `CS`, `AI`, `Audit`).
2. Thiết lập Canonical Contracts chuẩn hóa REST API và Pydantic Schemas.
3. Xây dựng Customer Intelligence 360 Pipeline và Unified Event Timeline.
4. Xây dựng Event Ingestion Layer tiếp nhận sự kiện từ Web và Mobile App.
5. Xây dựng Agent Core Runtime Framework quản lý vòng đời tiến trình.
6. Xây dựng Skill Registry và Tool Execution Contracts độc lập với Agent.
7. Xây dựng Connector Layer kết nối ERP Adapter (tra cứu SP, giá, tồn kho, bưu kiện 7-Eleven).
8. Xây dựng Policy Engine và Thuật toán khóa giá sàn `P_floor` (`BR-001..010`).
9. Xây dựng Authority Engine (`AUTH-0..5`) và Module cảnh báo vi phạm an ninh.
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

## PHẦN VII: THIẾT KẾ DỮ LIỆU 6 DOMAIN & CUSTOMER 360

Hệ thống tổ chức dữ liệu thành 6 Domain chuẩn hóa:

```text
1. CUSTOMER DOMAIN
   ├── customers                # Thông tin định danh kiều bào cốt lõi
   ├── customer_identities      # Bản đồ định danh đa kênh (SĐT, LINE ID, Zalo, Cookie)
   ├── consents                 # Lịch sử đồng thuận nhận tin tiếp thị (BR-004)
   ├── customer_events          # Dòng sự kiện hành vi thô từ Web/App/Chat
   └── customer_timeline        # Trục dòng thời gian sự kiện hợp nhất (Unified Timeline)

2. COMMERCE DOMAIN (Read-Only Cache từ ERP)
   ├── products                 # Danh mục sản phẩm đồng bộ từ ERP (5 ngành hàng)
   ├── skus                     # Mã biến thể, màu sắc, quy cách đóng gói
   ├── prices                   # Bảng giá niêm yết chính thức
   ├── inventory                # Số lượng tồn kho khả dụng thời gian thực
   ├── orders                   # Đơn hàng chính thức và đơn hàng nháp (Draft Orders)
   └── invoices                 # Hóa đơn thanh toán hợp lệ

3. ENGAGEMENT DOMAIN
   ├── conversations            # Phiên hội thoại khách hàng đa kênh
   ├── leads                    # Cơ hội bán hàng được AI chấm điểm
   ├── campaigns                # Chiến dịch tiếp thị đã được duyệt (AUTH-4)
   ├── segments                 # Phân khúc khách hàng (công nhân, du học sinh, hộ lý)
   └── recommendations          # Bản ghi đề xuất sản phẩm do AI tạo ra

4. CS DOMAIN
   ├── service_cases            # Hồ sơ vụ việc khiếu nại, hỗ trợ (Ticket 7 trạng thái)
   └── case_events              # Lịch sử thay đổi trạng thái xử lý vụ việc

5. AI & GOVERNANCE DOMAIN
   ├── agents                   # Danh mục Agent đang hoạt động
   ├── skills                   # Danh mục Skill được đăng ký
   ├── decisions                # Quyết định hành động do Orchestrator phê duyệt
   ├── approvals                # Hồ sơ phê duyệt của Quản lý người thật
   ├── executions               # Bản ghi thực thi hành động kèm Execution ID
   └── evidence                 # Bằng chứng dữ liệu chứng minh quyết định AI

6. AUDIT DOMAIN
   └── agent_runs               # Sổ cái kiểm toán bất biến ghi lại 100% lượt chạy
```

### Nguyên Tắc Phân Tách Bản Chất Dữ Liệu:
* **FACT:** Dữ liệu đã xác minh từ ERP (lịch sử mua hàng, hóa đơn, tồn kho).
* **SIGNAL:** Dấu hiệu hành vi quan sát được (xem bánh pía 3 lần, dừng lại ở sạc xe).
* **HYPOTHESIS:** Giả thuyết phỏng đoán của AI (khách thích ăn ngọt, xe có dấu hiệu mòn phanh).
* **Nguyên tắc thép:** *Giả thuyết AI không bao giờ được ghi ngược làm sai lệch Fact của khách hàng.*

---

## PHẦN VIII: KIẾN TRÚC TWO-STAGE RAG, FINOPS & KNOWLEDGE BASE

### 1. Kiến Trúc Two-Stage RAG Tối Ưu Chi Phí
* Thay vì gửi toàn bộ catalog hàng nghìn sản phẩm vào Prompt (tốn kém và chậm trễ):
* **Bước 1 (Lọc thô):** Dùng Vector Search nội bộ tìm ra đúng 2-3 sản phẩm phù hợp nhất với câu hỏi của khách hàng.
* **Bước 2 (Tư vấn):** Chỉ gửi thông tin của 3 sản phẩm này cho LLM để tạo câu trả lời.
* ➔ Giảm 85% chi phí token, chi phí trung bình chỉ từ **25 - 40 VNĐ cho mỗi cuộc hội thoại**, thời gian phản hồi dưới 1 giây.

### 2. Cấu Trúc Cây Tri Thức Doanh Nghiệp (Knowledge Base)
AI được cung cấp cây tri thức chuyên sâu về 5 ngành hàng:
* `/company`: Lịch sử chuỗi siêu thị, vị trí các chi nhánh và mạng lưới đối tác bưu cục.
* `/customer`: Chân dung đời sống kiều bào tại Đài Loan, văn hóa tiêu dùng và lịch nhận lương.
* `/product`: Danh mục 5 ngành hàng, bảng giá niêm yết và chính sách giá sàn `P_floor`.
* `/brand`: Văn phong ứng xử ấm áp, gần gũi và danh mục từ cấm (Prohibited Claims).
* `/marketing`: Kịch bản tiếp thị ngày lương mùng 10, chiến dịch ngày lễ quê hương.
* `/sales`: Quy trình tư vấn 5 ngành hàng, kịch bản mặc cả có kiểm soát và cứu đơn hết hàng.
* `/customer-care`: Bộ FAQ về bưu cục 7-Eleven, chính sách bảo hành xe điện và đổi trả hàng.
* `/policy`: Quy định phân quyền `AUTH-0..5` và quy trình phê duyệt tài chính.

---

## PHẦN IX: KHUNG AN TOÀN DỮ LIỆU & BẢO MẬT DOANH NGHIỆP

1. **Chuẩn mã hóa đường truyền:** 100% dữ liệu truyền tải giữa Web/App/ERP và AI Platform được mã hóa qua giao thức **TLS 1.3**.
2. **Mã hóa dữ liệu lưu trữ (Data at Rest):** Các trường dữ liệu nhạy cảm (Số điện thoại, Địa chỉ nhận hàng, Tên khách) được mã hóa bằng thuật toán **AES-256**.
3. **Ký số toàn vẹn Webhook:** Mọi lệnh cập nhật đơn hàng hoặc trạng thái giao vận đều được ký số bằng mã **HMAC-SHA256**.
4. **Cơ chế Fail-Closed (NFR-008):** Khi mất kết nối ERP hoặc không xác minh được giá/tồn kho, hệ thống tự động từ chối giao dịch an toàn, tuyệt đối không cho phép AI tự phỏng đoán.

---

## PHẦN X: BỘ KIỂM THỬ CHẤP NHẬN HỆ THỐNG (TC-E2E-001 ĐẾN 009)

Hệ thống chỉ được bàn giao khi vượt qua 100% bộ 9 bài kiểm thử bắt buộc:
1. **TC-E2E-001 (Chu trình E2E khép kín):** Một tín hiệu đi trọn vẹn qua chuỗi: `Signal ➔ Decision ➔ Action ➔ Execution ➔ Evidence ➔ Outcome`.
2. **TC-E2E-002 (Cổng kiểm soát Marketing):** Marketing Agent tuyệt đối không thể xuất bản chiến dịch nếu thiếu phê duyệt `AUTH-4`.
3. **TC-E2E-003 (Bảo vệ giá niêm yết):** Báo giá sai lệch với ERP lập tức bị Policy Engine chặn đứng (`BR-001..003`).
4. **TC-E2E-004 (Cô lập dữ liệu khách hàng):** CSKH Agent chỉ được tra cứu dữ liệu của đúng khách hàng đã xác minh.
5. **TC-E2E-005 (Khóa chống trùng đơn):** Giả lập retry mạng 10 lần liên tiếp cùng một yêu cầu; hệ thống chỉ gửi 1 tin nhắn và tạo đúng 1 đơn hàng nháp (`BR-006`).
6. **TC-E2E-006 (Phòng vệ Prompt Injection):** Người dùng nhập prompt yêu cầu nâng quyền admin hoặc hạ giá $
ightarrow$ Hệ thống lập tức từ chối (**DENY**), ghi log cảnh báo an ninh (`BR-008..009`).
7. **TC-E2E-007 (Tuân thủ quyền riêng tư):** Khách hàng chưa cấp quyền hoặc đã opt-out sẽ bị loại trừ tự động khỏi luồng gửi tin (`BR-004`).
8. **TC-E2E-008 (An toàn khi mất kết nối):** Giả lập ERP ngắt kết nối $
ightarrow$ Hệ thống chuyển trạng thái retry có kiểm soát, tuyệt đối không báo thành công giả (`NFR-008`).
9. **TC-E2E-009 (Truy vết nguồn gốc):** Mọi hành động thành công đều truy ngược được đầy đủ chuỗi: `Trigger ➔ Context ➔ Decision ➔ Approval ➔ Evidence`.

---

## PHẦN XI: HUMAN COMMAND CENTER (5 MÀN HÌNH ĐIỀU HÀNH TẬP TRUNG)

Cung cấp cho Ban Giám đốc bộ công cụ giám sát trực quan gồm 5 màn hình:
* **SCR-001 (Executive Dashboard):** Theo dõi tổng doanh thu AI mang lại, tỷ lệ chốt đơn tự động 24/7, tỷ lệ khôi phục giỏ hàng và chỉ số bảo toàn biên lãi ròng.
* **SCR-002 (Agent Operations Hub):** Giám sát trạng thái hoạt động của từng Agent, độ trễ phản hồi (ms), chi phí token theo ngày và nhật ký lỗi.
* **SCR-003 (Approval Center):** Nơi cấp Quản lý bấm **Approve / Reject / Modify** đối với các chiến dịch tiếp thị hoặc chính sách chiết khấu lớn.
* **SCR-004 (Customer 360 Viewer):** Tra cứu hồ sơ khách hàng, dòng thời gian sự kiện thống nhất và lịch sử giao dịch 5 ngành hàng.
* **SCR-005 (Conversation & Takeover Console):** Xem trực tiếp hội thoại AI; nhân sự có thể bấm nút **"TIẾP QUẢN"** để can thiệp hỗ trợ khách trong vòng **≤ 1.0 giây**.

---

## PHẦN XII: MA TRẬN RACI & ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE)

### 1. Ma Trận Phân Công Trách Nhiệm RACI

| Hạng Mục Công Việc | Ban Giám Đốc | Quản Trị Dự Án (PM/BA) | Kỹ Sư AI / Backend | Đội Ngũ Vận Hành (MKT/Sales/CS) | Đội Ngũ QA |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Khóa Business Rules & Ngưỡng duyệt AUTH | **A** | R | C | C | I |
| 2. Thiết kế Canonical Contracts & Adapter ERP | I | C | **R / A** | I | C |
| 3. Xây dựng Lõi Orchestrator & Cụm Agent 3 Phân hệ | I | I | **R / A** | C | C |
| 4. Xây dựng 5 Màn hình Human Command Center | I | C | **R / A** | C | I |
| 5. Kiểm thử 9 Kịch bản Chấp nhận TC-E2E | I | C | C | I | **R / A** |
| 6. Nghiệm thu từng Phân kỳ Gate (P0 ➔ P5) | **A** | **R** | R | R | R |

*(Ghi chú: A: Accountable - Chịu trách nhiệm cao nhất; R: Responsible - Trực tiếp thực hiện; C: Consulted - Tham vấn; I: Informed - Nhận báo cáo).*

---

### 2. Định Nghĩa Hoàn Thành Cấp Hệ Thống (Definition of Done - DoD)
Hệ thống không được coi là hoàn thành chỉ vì Agent có thể trò chuyện qua lại.

Một phân hệ hay một tính năng chỉ đạt chuẩn nghiệm thu khi chứng minh được đầy đủ 10 yếu tố:  
$$**Data thật + Agent thật + Skill thật + Tool thật + Policy thật + Approval thật + Execution thật + Evidence thật + Outcome thật + Test thật**$$

### 3. Kết Luận
Bản kế hoạch này thiết lập cầu nối vững chắc giữa **Nghiệp vụ thực tế của Chuỗi Bán lẻ Đa kênh tại Đài Loan** và **Khung Kiến trúc Quản trị Chuẩn Enterprise (`AI-REV-SRS-001`)**, sẵn sàng làm cơ sở pháp lý và kỹ thuật phục vụ triển khai thực địa.
