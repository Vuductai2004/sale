# KẾ HOẠCH XÂY DỰNG HỆ THỐNG AI AGENT DOANH THU & TƯƠNG TÁC KHÁCH HÀNG
## MARKETING — SALES — CHĂM SÓC KHÁCH HÀNG (CUSTOMER SUCCESS)
### CĂN CỨ THEO TÀI LIỆU ĐẶC TẢ YÊU CẦU HỆ THỐNG: AI-REV-SRS-001 (VERSION 0.1)
#### LỘ TRÌNH TRIỂN KHAI 6 PHÂN KỲ THEO GATE (P0 ➔ P5) — THỨ TỰ THỰC THI 18 BƯỚC — ĐỊNH NGHĨA HOÀN THÀNH (DOD)

> **THÔNG TIN DỰ ÁN & ĐỊNH VỊ CỐT LÕI:**  
> **Mã đặc tả căn cứ:** `AI-REV-SRS-001` (Phiên bản 0.1, ngày 15/09/2026).  
> **Mục tiêu tối thượng:** Xây dựng một **AI Revenue Workforce thống nhất** vận hành tự hành có kiểm soát, trong đó Marketing — Sales — CSKH dùng chung **Customer 360, Revenue Orchestrator, Policy Engine, Evidence Ledger và Audit System**.  
> **Nguyên tắc kỹ thuật sống còn:** **Zero-Disruption & Fail-Closed** — Tuyệt đối không xây lại ERP/POS/Web Commerce core. Hệ thống hiện có tiếp tục là **System of Record**. Mọi quyền thực thi của AI đều có giới hạn, kiểm soát được và có thể truy vết 100%.

---

## PHẦN I: TỔNG QUAN LỘ TRÌNH TRIỂN KHAI 6 PHÂN KỲ THEO GATE (P0 ➔ P5)

Hệ thống được chia thành **6 phân kỳ kỹ thuật theo Gate (P0 ➔ P5)** bám sát chặt chẽ theo Roadmap của Đề bài:  
$$\textbf{Customer Care (P1)} \longrightarrow \textbf{Sales (P2)} \longrightarrow \textbf{Marketing (P3)} \longrightarrow \textbf{Cross-domain (P4)} \longrightarrow \textbf{Controlled Autonomy (P5)}$$

| Giai Đoạn (Gate) | Trọng Tâm Nghiệp Vụ | Deliverables Chính Cần Bàn Giao | Tiêu Chí Hoàn Thành (Exit Gate) |
| :--- | :--- | :--- | :--- |
| **P0: Foundation & Governance** | Nền tảng dữ liệu, bảo mật, khung Agent & Skill | Data Contracts, C360 Pipeline, Authority Engine, Audit Logger, Connector Core. | Agent tuân thủ 100% boundary quyền, không vượt quyền, mọi action sinh ID truy vết. |
| **P1: Customer Care Pilot** | Triển khai CS-01 tiếp nhận đa kênh & Case Mgmt | CS-01 Agent, Tra cứu ERP/Order, FAQ/Escalation, Console takeover 1.0s. | Hội thoại thật E2E: tra cứu đúng order, fail-closed khi lỗi, escalation chuẩn. |
| **P2: Sales Pilot** | Bán hàng, đề xuất & phục hồi giỏ hàng | SAL-01 đến SAL-05, Pricing/Stock Validator, Cart Recovery Engine, Bắn đơn nháp ERP. | Chứng minh luồng: AI Action $\rightarrow$ Order $\rightarrow$ Revenue Evidence; không sai giá/tồn. |
| **P3: Marketing Pilot** | Chiến dịch, phân khúc, content & duyệt bài | MKT-01 đến MKT-06, Brand Guardian, Campaign Approval flow (AUTH-4). | Vận hành E2E chiến dịch có kiểm duyệt; đo lường chính xác Attribution doanh thu. |
| **P4: Cross-domain Orchestration** | Hợp nhất luồng MKT $\rightarrow$ Sales $\rightarrow$ CS $\rightarrow$ Success | Revenue Orchestrator định tuyến đa tác vụ, Retention Agent (CS-02), Unified Timeline. | Xuyên suốt vòng đời khách hàng trên 1 Timeline duy nhất không bị mất context. |
| **P5: Controlled Autonomy & Scale** | Mở rộng tự động hóa có kiểm soát & FinOps | Scoring Engine, Auto-promotion policy (AUTH-2 $\rightarrow$ AUTH-3), Human Command Center. | Đạt Definition of Done: Real Data + Real Execution + Evidence + Test. |

---

## PHẦN II: KIẾN TRÚC HỆ THỐNG CẦN XÂY DỰNG

Hệ thống không phải ba chatbot rời rạc, mà được tổ chức theo trục kiến trúc điều phối tập trung:

```text
                  CUSTOMER / MARKET
                         │
              ┌──────────▼──────────┐
              │ Data & Signal       │
              │ Ingestion           │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ Customer 360        │
              │ + Timeline          │
              └──────────┬──────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
  Marketing AI       Sales AI          CS AI
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │ Revenue Orchestrator│
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Policy + Authority  │
              │ + Approval          │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Execution Layer     │
              └──────────┬──────────┘
                         ▼
        ERP/POS / Web / App / Zalo / Social
                         │
                         ▼
              Evidence → Outcome
                         │
                         ▼
                     Learning
```

---

## PHẦN III: KẾ HOẠCH CHI TIẾT TỪNG GIAI ĐOẠN

---

### GIAI ĐOẠN P0: NỀN TẢNG CỐT LÕI & QUẢN TRỊ (FOUNDATION )
*Mục tiêu: Xây dựng nền tảng dữ liệu, quyền hạn, kiểm toán và điều phối. Nếu làm Agent trước mà chưa có Governance thì hệ thống sẽ mất kiểm soát.*

#### Hạng mục 1: Chuẩn hóa Data Model & Canonical Contracts
* **Xây dựng các Entity cốt lõi:**
  * `Customer`, `CustomerIdentity`, `Consent`, `CustomerEvent`.
  * `Product`, `SKU`, `Price`, `Inventory`.
  * `Order`, `Invoice`.
  * `Conversation`, `Lead`, `Opportunity`.
  * `Campaign`, `Segment`, `Offer`, `Recommendation`.
  * `ServiceCase`.
  * `Agent`, `Skill`, `Workflow`.
  * `Decision`, `Action`, `Approval`, `Execution`, `Evidence`, `Outcome`, `Learning`.
* **Kết quả bắt buộc bàn giao cuối Giai đoạn P0:**
  * Database schema hoàn chỉnh cho 6 domain.
  * API contract chuẩn REST/JSON Schema.
  * Event schema định danh duy nhất: Customer ID, Product/SKU ID, Order ID, Event ID.

#### Hạng mục 2: Customer Intelligence 360 & Timeline
* **Cấu trúc Customer Profile:**
  ```text
  Customer
  ├── Identity (Số điện thoại, Email, Zalo ID, Web cookie, Mã định danh khách hàng)
  ├── Consent (Đồng thuận nhận tin marketing, xử lý dữ liệu)
  ├── Purchase History (Lịch sử giao dịch, chu kỳ tiêu dùng)
  ├── Product Affinity (Ngành hàng và danh mục sản phẩm yêu thích, tần suất mua)
  ├── Web/App Behaviour (Lượt xem, tìm kiếm, giỏ hàng)
  ├── Marketing Interaction (Lịch sử chiến dịch đã tiếp cận)
  ├── Conversation (Lịch sử hội thoại đa kênh)
  ├── Support Case (Các sự cố, khiếu nại đã xử lý)
  ├── Cart & Voucher (Giỏ hàng hiện tại, mã khuyến mãi khả dụng)
  └── Lifecycle (Trạng thái: Mới, Kích hoạt, Thân thiết, Nguy cơ rời bỏ)
  ```
* **Customer Timeline truy vết sự kiện:**
  * `10:01 View → 10:03 Search → 10:05 Add Cart → 10:07 Chat → 10:15 Checkout → 10:20 Abandoned Cart → 10:45 AI Reminder → 11:02 Purchase → 12:30 Delivery → 14:00 Support`.
* **Nguyên tắc phân tách bản chất dữ liệu (BẮT BUỘC):**
  * **FACT:** Dữ liệu đã xác minh từ ERP/POS.
  * **SIGNAL:** Dấu hiệu hành vi quan sát được.
  * **HYPOTHESIS:** Giả thuyết phỏng đoán của AI.
  * **DECISION & ACTION:** Quyết định và hành động được hệ thống phê duyệt.
  * *Nguyên tắc thép:* **Giả thuyết AI không bao giờ được ghi ngược thành Customer Fact.**

#### Hạng mục 3: Agent Runtime, Policy Engine & Revenue Orchestrator
* **Xây dựng Core Platform Runtime:**
  * `Agent Registry`, `Skill Registry`, `Tool Registry`.
  * `Policy Engine`: Khóa cứng $P_{floor}$, kiểm tra tồn kho, kiểm tra consent (`BR-001..010`).
  * `Authority Engine`: Phân tầng thẩm quyền từ AUTH-0 đến AUTH-5.
  * `Idempotent Execution Engine`: Ngăn chặn trùng lặp hành động khi có retry mạng (`BR-005..006`).
* **Chu trình điều phối chuẩn của Revenue Orchestrator:**
  $$\textbf{SIGNAL} \longrightarrow \textbf{CONTEXT} \longrightarrow \textbf{HYPOTHESIS} \longrightarrow \textbf{DECISION} \longrightarrow \textbf{PLAN} \longrightarrow \textbf{ACTION} \longrightarrow \textbf{APPROVAL} \longrightarrow \textbf{EXECUTION} \longrightarrow \textbf{EVIDENCE} \longrightarrow \textbf{OUTCOME} \longrightarrow \textbf{LEARNING}$$

---

### GIAI ĐOẠN P1: THỬ NGHIỆM CHĂM SÓC KHÁCH HÀNG (CUSTOMER CARE )
*Mục tiêu: Đưa vào vận hành Agent CSKH đầu tiên chạy thực tế E2E.*

#### Hạng mục triển khai:
* **CS-01 Omnichannel Customer Care Agent:**
  * Nhận biết tối thiểu 9 nhóm Intent (`FR-CS-001`): Hỏi sản phẩm, giá, tồn kho, đơn hàng, giao hàng, đổi/trả, thanh toán, khiếu nại, hỗ trợ sử dụng và yêu cầu gặp nhân viên.
* **Case Management Workflow chuẩn 7 trạng thái:**
  $$\textbf{NEW} \longrightarrow \textbf{CLASSIFIED} \longrightarrow \textbf{ASSIGNED} \longrightarrow \textbf{IN\_PROGRESS} \longrightarrow \textbf{WAITING\_CUSTOMER} \longrightarrow \textbf{RESOLVED} \longrightarrow \textbf{CLOSED}$$
  * Mỗi Case lưu trữ đầy đủ: Case ID, Customer, Intent, Priority, Conversation, Order, Evidence, Owner, Status, SLA, Resolution, Outcome.
* **Màn hình Conversation Console (SCR-005) & Human Takeover:**
  * Nhân viên theo dõi chat trực tiếp; bấm tiếp nhận là AI ngắt lời trong 1.0 giây; có chức năng sửa câu trả lời của AI và trả lại bot khi xong việc.
* **Demo nghiệm thu MVP cuối P1:**
  * Khách hỏi $\rightarrow$ AI xác định danh tính $\rightarrow$ Tra cứu ERP lấy trạng thái đơn $\rightarrow$ AI trả lời chính xác $\rightarrow$ Ghi nhận Case $\rightarrow$ Lưu vết Evidence $\rightarrow$ Kết quả Outcome.

---

### GIAI ĐOẠN P2: THỬ NGHIỆM BÁN HÀNG TỰ ĐỘNG (SALES )
*Mục tiêu: Xây dựng cụm 4 Agent bán hàng cốt lõi, bảo vệ giá và phục hồi giỏ hàng bỏ quên.*

#### Hạng mục triển khai:
* **SAL-01 — Lead Qualification Agent:**
  * Input: Customer + Hành vi gần nhất + Lịch sử mua + Hội thoại.
  * Output: Nhu cầu, Sản phẩm quan tâm, Mức độ sẵn sàng mua, Cơ hội bán hàng kèm `Reason + Evidence` minh bạch.
* **SAL-02 — AI Sales Advisor:**
  * Sử dụng các kỹ năng: `search-product`, `check-stock`, `check-price`, `compare-product`, `explain-policy`.
  * **Quy tắc tuyệt đối:** Giá và tồn kho bắt buộc lấy từ API ERP chính thống, AI cấm tự suy diễn (`BR-001, BR-003`).
* **SAL-03 — Recommendation Agent:**
  * Hỗ trợ 6 nghiệp vụ: Gợi ý sản phẩm, Cross-sell, Upsell, Đổi món tương đương khi hết hàng (Substitute), Nhắc mua bù (Replenishment), Combo đóng gói (Bundle).
  * Mỗi đề xuất bắt buộc có: Customer, Product, Reason, Evidence, Eligibility, Confidence và Expected Outcome.
* **SAL-04 — Cart Recovery Agent (Use Case tạo doanh thu chứng minh giá trị):**
  * Chu trình: `Abandoned Cart → Customer Context → Consent Check → Inventory Check → Price Check → Suppression Check → Recommendation → Message → Conversion → Order → Attribution`.
* **Bắn Đơn Hàng Nháp Vào ERP (Idempotent Draft Order):**
  * Tự động sinh đơn nháp vào ERP với mã khóa chống trùng lặp, giải phóng nhập tay cho nhân viên.

---

### GIAI ĐOẠN P3: THỬ NGHIỆM TIẾP THỊ TỰ ĐỘNG (MARKETING )
*Mục tiêu: Vận hành chiến dịch Marketing tự động theo quy chuẩn có kiểm duyệt Brand Guardian.*

#### Hạng mục triển khai:
* **Cụm 6 Marketing Agent:**
  * `MKT-01 (Strategist)`: Lập kế hoạch chiến dịch, phân bổ ngân sách và kênh.
  * `MKT-02 (Audience Intelligence)`: Phân tích Cohort dựa trên dữ liệu hành vi (khách mới, khách quay lại, churn-risk).
  * `MKT-03 (Content Agent)`: Sinh nội dung đa kênh (Social, Zalo/LINE, Landing Page, SMS).
  * `MKT-04 (Brand Guardian)`: Chốt chặn kiểm duyệt tone of voice, từ cấm, cam kết sai lệch và chính sách giá.
  * `MKT-05 (Campaign Agent)`: Điều phối chiến dịch theo workflow bắt buộc:  
    $$\textbf{Brief} \longrightarrow \textbf{Audience} \longrightarrow \textbf{Content} \longrightarrow \textbf{Review} \longrightarrow \textbf{Approval (AUTH-4)} \longrightarrow \textbf{Publish} \longrightarrow \textbf{Monitor} \longrightarrow \textbf{Optimize}$$
  * `MKT-06 (Marketing Analyst)`: Đo lường chuyển đổi thực tế, chi phí CAC, ROAS và Attribution đơn hàng.

---

### GIAI ĐOẠN P4: ĐIỀU PHỐI HỢP NHẤT XUYÊN PHÂN HỆ (CROSS-DOMAIN )
*Mục tiêu: Đưa hệ thống trở thành AI Revenue Platform thống nhất, không đứt gãy dữ liệu.*

#### Hạng mục triển khai:
* **Hợp nhất chuỗi giá trị xuyên Agent:**
  * Marketing phát hiện phân khúc $\rightarrow$ Bắn chiến dịch $\rightarrow$ Khách phản hồi $\rightarrow$ Sales Agent tư vấn & chốt đơn $\rightarrow$ CSKH Agent theo dõi bưu kiện $\rightarrow$ Customer Success Agent chăm sóc giữ chân (Retention).
* **CS-02 — Retention & Customer Success Agent:**
  * Tự động phát hiện nguy cơ mất khách (Inactivity $> 45$ ngày), chu kỳ tiêu dùng sản phẩm định kỳ (T+30), cảnh báo khiếu nại chưa xử lý để kích hoạt Next-Best-Action.
* **Chứng minh quy trình Cross-Agent chuẩn:**
  * `Giỏ hàng bỏ quên → Sales phát hiện → Customer 360 lấy context → Recommendation chọn món → Policy kiểm tra → Communication soạn tin → Approval nếu cần → Gửi tin → Khách chốt đơn → Ghi nhận Revenue Evidence`.

---

### GIAI ĐOẠN P5: TỰ HÀNH CÓ KIỂM SOÁT & MỞ RỘNG (CONTROLLED AUTONOMY )
*Mục tiêu: Tăng dần quyền tự động của Agent dựa trên hiệu quả thực chứng; vận hành Command Center và FinOps.*

#### Hạng mục triển khai:
* **Mô hình Thẩm quyền 6 cấp độ (Authority Model):**
  * `AUTH-0 (Observe)`: Chỉ đọc dữ liệu.
  * `AUTH-1 (Recommend)`: Phân tích và tạo đề xuất.
  * `AUTH-2 (Draft)`: Soạn thảo nội dung hoặc đơn hàng nháp.
  * `AUTH-3 (Bounded Execute)`: Tự động thực thi trong phạm vi được phê duyệt (Tra FAQ, kiểm tra đơn, gửi nhắc nạp SIM).
  * `AUTH-4 (Approval Required)`: Bắt buộc Quản lý duyệt (Campaign lớn, voucher vượt hạn mức, hoàn tiền, đổi trả).
  * `AUTH-5 (Prohibited)`: Tuyệt đối cấm (AI tự ý thay đổi giá niêm yết, tự ý hạ giá âm vốn).
* **Human Command Center hoàn chỉnh (5 màn hình):**
  * `SCR-001 (Executive Dashboard)`: Doanh thu AI, Tỷ lệ chuyển đổi, Sự cố bất thường.
  * `SCR-002 (Agent Operations)`: Trạng thái Agent online/offline, độ trễ, chi phí token, lỗi.
  * `SCR-003 (Approval Center)`: Giao diện phê duyệt: **Approve / Reject / Modify / Pause / Cancel**.
  * `SCR-004 (Customer 360 Console)`: Profile + Dòng thời gian Timeline + Bằng chứng Evidence.
  * `SCR-005 (Conversation Console)`: Xem trực tiếp hội thoại AI, tiếp quản can thiệp tức thì.
* **Đo lường FinOps AI:** Giám sát chi phí token LLM, chi phí/lượt chuyển đổi thành công, tỷ lệ can thiệp của con người.

---

## PHẦN IV: CẤU TRÚC KNOWLEDGE BASE (SECOND BRAIN)

AI Agent không chỉ dựa vào kiến thức nội tại của mô hình ngôn ngữ lớn mà bắt buộc phải truy vấn cây tri thức có cấu trúc:

```text
/company
  company.md              # Lịch sử, giá trị cốt lõi, mô hình kinh doanh chuỗi
  positioning.md          # Định vị thương hiệu, phân khúc thị trường và đối tượng mục tiêu
/customer
  customer.md             # Thói quen mua sắm, chân dung khách hàng và văn hóa tiêu dùng
  segmentation.md         # Tiêu chuẩn phân khúc đối tượng
/product
  products.md             # Danh mục sản phẩm, biến thể SKU và chính sách bảo hành
  pricing.md              # Bảng giá niêm yết chính thức
  promotion-policy.md     # Quy định hạn mức khuyến mãi và giá sàn P_floor
/brand
  voice.md                # Văn phong ứng xử (Ấm áp, tôn trọng, gần gũi)
  terminology.md          # Thuật ngữ chuẩn hóa đa ngữ (Việt, Indo, Thái, Trung)
  prohibited-claims.md    # Danh mục từ cấm, cam kết sai lệch bị cấm tiệt
/marketing
  playbook.md             # Kịch bản các chiến dịch theo mùa vụ, ngày lễ
  content-guidelines.md   # Hướng dẫn định dạng nội dung cho từng kênh
  campaign-rules.md       # Tiêu chuẩn phê duyệt chiến dịch
/sales
  sales-playbook.md       # Quy trình tư vấn chốt đơn 24/7
  qualification.md        # Tiêu chí chấm điểm khách hàng tiềm năng
  objection-handling.md   # Kịch bản xử lý từ chối chuẩn
/customer-care
  faq.md                  # Bộ câu hỏi thường gặp về sản phẩm, vận chuyển và đổi trả
  support-policy.md       # Chính sách bảo hành, đổi trả hàng hóa và bồi hoàn
  escalation.md           # Tiêu chí và quy trình phân luồng chuyển giao người thật
/policy
  authority.md            # Quy chế phân định thẩm quyền AUTH-0..5
  approval.md             # Quy trình xét duyệt các quyết định tài chính
```

---

## PHẦN V: KIẾN TRÚC HỆ THỐNG KỸ NĂNG (SKILL SYSTEM)

Tuyệt đối không gắn chết (hard-code) công cụ vào Agent. Thiết kế theo mô hình 4 tầng phân tách:  
$$\textbf{Agent} \longrightarrow \textbf{Skill} \longrightarrow \textbf{Tool} \longrightarrow \textbf{Connector} \longrightarrow \textbf{External System (ERP/Web/LINE)}$$

Mỗi Skill được định nghĩa độc lập theo hợp đồng chuẩn:
1. **Skill ID:** Định danh duy nhất (ví dụ: `check-stock-v1`, `create-draft-order-v1`).
2. **Purpose:** Mục tiêu nghiệp vụ rõ ràng.
3. **Input / Output Schema:** Ràng buộc chặt chẽ kiểu dữ liệu bằng Pydantic/JSON Schema.
4. **Allowed Agent:** Danh sách Agent được cấp phép gọi skill này.
5. **Required Authority:** Cấp độ thẩm quyền tối thiểu để kích hoạt (AUTH-1, AUTH-3...).
6. **Tool / Connector:** Công cụ kỹ thuật thực hiện kết nối.
7. **Validation & Guardrails:** Kiểm tra tính hợp lệ của dữ liệu trước khi gọi.
8. **Retry Policy & Timeout:** Quy tắc thử lại và thời gian chờ tối đa.
9. **Audit Requirement:** Bắt buộc ghi log sự kiện kiểm toán.
10. **Test Cases:** Bộ kiểm thử đơn vị độc lập đi kèm.

---

## PHẦN VI: THIẾT KẾ CƠ SỞ DỮ LIỆU 6 DOMAIN

```text
1. CUSTOMER DOMAIN
   ├── customers                # Thông tin hồ sơ khách hàng cốt lõi
   ├── customer_identities      # Bản đồ định danh đa kênh (SĐT, Email, Zalo ID, Web Cookie)
   ├── consents                 # Lịch sử đồng thuận xử lý dữ liệu và nhận tin
   ├── customer_events          # Dòng sự kiện hành vi thô từ Web/App/Chat
   └── customer_timeline        # Trục dòng thời gian sự kiện hợp nhất

2. COMMERCE DOMAIN (Read-Only Cache từ ERP)
   ├── products                 # Danh mục sản phẩm đồng bộ từ ERP
   ├── skus                     # Mã biến thể, quy cách đóng gói
   ├── prices                   # Bảng giá niêm yết chính thức
   ├── inventory                # Số lượng tồn kho khả dụng thời gian thực
   ├── orders                   # Đơn hàng chính thức và đơn hàng nháp (Draft Orders)
   └── invoices                 # Hóa đơn thanh toán hợp lệ

3. ENGAGEMENT DOMAIN
   ├── conversations            # Phiên hội thoại khách hàng trên các kênh
   ├── leads                    # Cơ hội bán hàng tiềm năng được AI chấm điểm
   ├── opportunities            # Cơ hội chuyển đổi giá trị cao
   ├── campaigns                # Chiến dịch tiếp thị đã lập lịch/phê duyệt
   ├── segments                 # Tập khách hàng mục tiêu theo Cohort
   ├── offers                   # Chính sách voucher, quà tặng khả dụng
   └── recommendations          # Bản ghi đề xuất sản phẩm do AI tạo ra

4. CS DOMAIN
   ├── service_cases            # Hồ sơ vụ việc khiếu nại, hỗ trợ (Ticket)
   └── case_events              # Lịch sử thay đổi trạng thái xử lý vụ việc

5. AI & ORCHESTRATION DOMAIN
   ├── agents                   # Danh mục Agent đang hoạt động
   ├── skills                   # Danh mục Skill được đăng ký
   ├── workflows                # Định nghĩa luồng phối hợp giữa các Agent
   ├── decisions                # Quyết định hành động do Orchestrator phê duyệt
   ├── actions                  # Kế hoạch hành động cụ thể chuẩn bị thực thi
   ├── approvals                # Hồ sơ phê duyệt của Quản lý người thật
   ├── executions               # Bản ghi thực thi hành động ra bên ngoài
   ├── evidence                 # Bằng chứng dữ liệu chứng minh quyết định AI
   ├── outcomes                 # Kết quả kinh doanh thực tế tạo ra
   └── learning                 # Dữ liệu đối soát phản hồi để tinh chỉnh mô hình

6. AUDIT DOMAIN
   └── agent_runs               # Sổ cái kiểm toán bất biến ghi lại 100% lượt chạy
```

---

## PHẦN VII: CHUẨN MỰC BẰNG CHỨNG & SỔ CÁI KIỂM TOÁN (EVIDENCE & AUDIT)

Mỗi lượt chạy của AI Agent (`Agent Run`) bắt buộc phải ghi lại một bản ghi JSON có cấu trúc bất biến:

```json
{
  "run_id": "RUN-20260915-000182",
  "timestamp": "2026-09-15T21:45:10Z",
  "agent": "CartRecoveryAgent",
  "customer_id": "CUS-TW-1029",
  "trigger": "CART_ABANDONED_45MIN",
  "context": {
    "channel": "ZALO_OA",
    "cart_value": 850000,
    "last_interaction": "2026-09-15T21:00:00Z"
  },
  "skill": "cart-recovery-message-v1",
  "tool": "line-messaging-connector",
  "decision": "SEND_REMINDER",
  "reason": "Giỏ hàng có các sản phẩm tồn kho khả dụng, khách có consent nhận tin",
  "evidence": [
    "cart_event_ref_9918",
    "erp_stock_verified_sku_882"
  ],
  "authority": "AUTH-3",
  "approval": null,
  "action": {
    "execution_id": "EXEC-0915-88412",
    "idempotency_key": "IDEM-CART-1029-20260915"
  },
  "execution_status": "SUCCESS",
  "outcome": {
    "converted": true,
    "draft_order_id": "DRAFT-ORD-8821",
    "revenue": 850000
  },
  "latency_ms": 420,
  "cost_usd": 0.0018,
  "error": null
}
```

---

## PHẦN VIII: CƠ CẤU ĐỘI NGŨ TRIỂN KHAI & MA TRẬN RACI

Mô hình đội ngũ tinh gọn từ 6 – 8 nhân sự theo đúng đề xuất tại Điều 28 SRS:

| Vai Trò Dự Án | Số Lượng | Nhiệm Vụ Trọng Tâm Phụ Trách |
| :--- | :--- |
| **Product Manager / BA Lead** | 1 | Quản lý yêu cầu, khóa KPI baseline, thiết lập Business Rules & Approval Policy. |
| **Solution Architect** | 1 | Thiết kế Kiến trúc tổng thể, bảo mật, Data Contracts & Governance Engine. |
| **AI Engineers** | 2 | Phát triển Agent Runtime, Orchestrator, Prompts, RAG & Evaluation Harness. |
| **Backend / Integration Engineers** | 2 | Xây dựng API Gateway, ERP/POS Connectors, Messaging Adapters & Idempotency. |
| **Frontend Engineer** | 1 | Phát triển Human Command Center Console (5 màn hình điều hành). |
| **QA / Test Engineer** | 1 | Xây dựng Automated Test Suite cho 9 Acceptance Tests & Adversarial Tests. |

### Ma trận phân bổ trách nhiệm RACI:

| Hạng Mục Công Việc | BA / PO | Solution Architect | AI Engineering | Backend / IT | Frontend | QA / QC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Khóa KPI, Connector & Policy Ngân sách | **R / A** | C | I | C | I | I |
| 2. Thiết kế Canonical Contracts & Authority | C | **R / A** | C | C | I | I |
| 3. Xây dựng Runtime, Orchestrator & Skills | I | C | **R / A** | C | I | I |
| 4. Xây dựng Connectors, ERP Adapter & Idempotency | I | C | C | **R / A** | I | I |
| 5. Xây dựng Human Command Center | C | I | I | C | **R / A** | I |
| 6. Xây dựng Acceptance Suite TC-E2E-001..009 | C | C | C | C | I | **R / A** |
| 7. Nghiệm thu từng Gate (P0 ➔ P5) | **A** | **R** | R | R | R | R |

---

## PHẦN IX: BỘ KIỂM THỬ CHẤP NHẬN HỆ THỐNG (TC-E2E-001 ĐẾN 009)

Hệ thống chỉ được bàn giao khi vượt qua 100% bộ 9 bài kiểm thử bắt buộc:

1. **TC-E2E-001 (Chu trình E2E khép kín):** Một tín hiệu khách hàng đi trọn vẹn từ `Signal → Decision → Action → Execution → Evidence → Outcome`.
2. **TC-E2E-002 (Kiểm soát thẩm quyền Marketing):** Marketing Agent tuyệt đối không thể tự động publish chiến dịch nếu thiếu phê duyệt `AUTH-4`.
3. **TC-E2E-003 (Bảo vệ giá niêm yết):** Sales Agent đưa ra mức giá không có trong nguồn ERP sẽ lập tức bị Policy Engine hủy bỏ giao dịch.
4. **TC-E2E-004 (Cô lập dữ liệu khách hàng):** Customer Care Agent chỉ được phép tra cứu dữ liệu của đúng khách hàng đã được định danh xác minh.
5. **TC-E2E-005 (Khóa chống trùng giao dịch):** Giả lập retry mạng 10 lần liên tiếp cùng một yêu cầu; hệ thống chỉ gửi 1 tin nhắn và tạo đúng 1 đơn hàng nháp.
6. **TC-E2E-006 (Phòng vệ Prompt Injection):** Khách hàng cố tình gửi prompt ép nâng quyền; hệ thống lập tức từ chối (**DENY**), ghi log cảnh báo an ninh.
7. **TC-E2E-007 (Tuân thủ quyền riêng tư):** Khách hàng từ chối nhận tin (No consent) sẽ bị loại trừ (Suppression) tự động khỏi mọi chiến dịch.
8. **TC-E2E-008 (Cơ chế An toàn khi mất kết nối):** Connector ERP/Zalo gặp sự cố; hệ thống chuyển sang trạng thái retry, tuyệt đối không ghi nhận thành công giả.
9. **TC-E2E-009 (Khả năng giải trình & truy vết):** Mỗi đơn hàng hoặc hành động thành công đều truy ngược được đầy đủ chuỗi `Trigger → Context → Decision → Approval → Evidence`.

---

## PHẦN X: THỨ TỰ LẬP TRÌNH THỰC TẾ (18 BƯỚC THỰC THI)

Khi bước vào giai đoạn code, đội ngũ kỹ thuật tuyệt đối không nhảy cóc, mà tuân thủ đúng trình tự 18 bước:

```text
01. Database / Data Model (Tạo 6 domain schemas)
          ↓
02. API Contract (Khóa interface chuẩn REST/JSON)
          ↓
03. Customer 360 (Xây dựng Profile & Event Timeline)
          ↓
04. Event Ingestion (Tiếp nhận tín hiệu Web/App/Chat)
          ↓
05. Agent Runtime (Khung thực thi Agent độc lập)
          ↓
06. Skill System (Đăng ký kỹ năng tách rời Agent)
          ↓
07. Tool/Connector Layer (ERP Adapter, Messaging Router)
          ↓
08. Policy Engine (Khóa giá sàn P_floor, luật BR-001..010)
          ↓
09. Authority + Approval (Phân quyền AUTH-0..5, chốt chặn duyệt)
          ↓
10. Evidence + Audit (Sổ cái kiểm toán, bằng chứng quyết định)
          ↓
11. Revenue Orchestrator (Bộ điều phối đa tác vụ trung tâm)
          ↓
12. Customer Care Agent (CS-01, Case Management, Takeover)
          ↓
13. Sales Agent (SAL-01..05, Tư vấn, Đơn nháp, Khôi phục giỏ)
          ↓
14. Marketing Agent (MKT-01..06, Phân khúc, Brand Guardian)
          ↓
15. Retention Agent (CS-02, Chăm sóc định kỳ, Churn prediction)
          ↓
16. Human Command Center (5 màn hình Web Console SCR-001..005)
          ↓
17. Evaluation & Acceptance Tests (Chạy tự động TC-E2E-001..009)
          ↓
18. Controlled Autonomy (Mở rộng tự hành có kiểm soát, FinOps)
```

---

## PHẦN XI: ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DOD)

Hệ thống không được coi là hoàn thành chỉ vì Agent có thể chat trả lời qua lại.

Một tính năng hay một phân hệ chỉ được nghiệm thu khi chứng minh được đầy đủ 10 yếu tố:  
$$\textbf{Data thật} + \textbf{Agent thật} + \textbf{Skill thật} + \textbf{Tool thật} + \textbf{Policy thật} + \textbf{Approval thật} + \textbf{Execution thật} + \textbf{Evidence thật} + \textbf{Outcome thật} + \textbf{Test thật}$$

### Mục tiêu bàn giao cuối cùng:
Bàn giao trọn vẹn một **AI Revenue Workforce** có khả năng trực tiếp tham gia vận hành kinh doanh đa kênh (Omnichannel Commerce & Services) với mức tự động hóa cao, mang lại dòng tiền thực tế, đồng thời mọi rủi ro đều được kiểm soát trong vòng tay con người.
