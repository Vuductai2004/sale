# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG AI AGENT DOANH THU & TƯƠNG TÁC KHÁCH HÀNG
## MARKETING — SALES — CHĂM SÓC KHÁCH HÀNG (CUSTOMER SUCCESS)
### CĂN CỨ THEO ĐỀ BÀI KỸ THUẬT: AI-REV-SRS-001 (VERSION 0.1)
#### LỘ TRÌNH THỰC THI 6 GIAI ĐOẠN (GATE P0 ➔ P5) & MA TRẬN PHÂN QUYỀN KIỂM SOÁT

> **THÔNG TIN HỒ SƠ KẾ HOẠCH:**  
> **Căn cứ đề tài:** Đề bài kỹ thuật SRS mã `AI-REV-SRS-001` (Ngày ban hành: 15/09/2026).  
> **Mục tiêu cốt lõi:** Xây dựng hệ thống **AI Agent Doanh thu & Tương tác khách hàng hợp nhất**, vận hành xuyên suốt chuỗi giá trị:  
> $$\textbf{Signal} \longrightarrow \textbf{Customer 360} \longrightarrow \textbf{Marketing} \longrightarrow \textbf{Sales} \longrightarrow \textbf{Care} \longrightarrow \textbf{Retention} \longrightarrow \textbf{Outcome} \longrightarrow \textbf{Learning}$$  
> **Nguyên tắc kỹ thuật sống còn:** **Zero-Disruption & Fail-Closed** — ERP/POS/Web/App tiếp tục là **System of Record**. Tuyệt đối không tạo dữ liệu song song; mọi hành động tác động ra ngoài bắt buộc có `execution_id`, `audit trace`, có phê duyệt theo ma trận `AUTH-0..5` và vượt qua bộ 9 kiểm thử chấp nhận `TC-E2E-001..009`.

---

## PHẦN I: TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC PHẠM VI

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              HUMAN COMMAND CENTER (SCR-001..005)                       │
│  [Executive Dashboard]  [Agent Operations]  [Approval Center]  [Customer 360 Console] │
└─────────────────────────────────────────▲──────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────┴──────────────────────────────────────────────┐
│                              REVENUE ORCHESTRATOR LAYER                                │
│       SIGNAL → CONTEXT → HYPOTHESIS → DECISION → PLAN → ACTION → APPROVAL             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│     MARKETING AGENTS             SALES AGENTS                  CUSTOMER CARE AGENTS    │
│  • MKT-01 Strategist          • SAL-01 Lead Qualify         • CS-01 Omnichannel Care   │
│  • MKT-02 Audience Intel      • SAL-02 Sales Advisor        • CS-02 Retention/Success  │
│  • MKT-03 Content Gen         • SAL-03 Recommendation       • Case Management Workflow │
│  • MKT-04 Brand Guardian      • SAL-04 Cart Recovery                                   │
│  • MKT-05 Campaign Engine     • SAL-05 Reorder / Replenish                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                       KNOWLEDGE BASE & SKILL REGISTRY (Tách rời Agent)                 │
│  • /company, /customer, /product, /brand, /marketing, /sales, /customer-care, /policy  │
│  • Skill Contracts: ID, Input, Output, Allowed Agent, Required Auth, Timeout, Tests   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                        POLICY & GOVERNANCE ENGINE (BR-001..010)                        │
│  • Authority Matrix: AUTH-0 (Observe) → AUTH-3 (Bounded) → AUTH-4 (Approval Required)  │
│  • Price Floor $P_{floor}$ & Promotion Rules | Data Consent Check | Fail-Closed Guard │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                     CUSTOMER INTELLIGENCE 360 (FR-C360-001..003)                       │
│  • Unified Identity | Unified Event Timeline | Evidence Separation (FACT vs HYPOTHESIS)│
├────────────────────────────────────────────────────────────────────────────────────────┤
│                        EXECUTION, AUDIT & LEARNING LEDGER                              │
│  • Idempotent Execution Engine | Immutable Audit Log | Evidence & Attribution Tracker  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                         CONNECTORS & INTEGRATION LAYER (REST/PubSub)                   │
│   [ERP/POS Adapter]      [Web/App Event Ingestion]      [Omnichannel Messaging Router] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3 Nguyên tắc Phạm vi Bất biến:
1. **Không xây lại hệ thống giao dịch lõi (System of Record):** ERP, POS, Website, Mobile App hiện có tiếp tục là nguồn sự thật duy nhất cho Sản phẩm, SKU, Giá, Tồn kho, Khách hàng, Đơn hàng và Vận chuyển. AI chỉ đọc và tạo dữ liệu giao dịch nháp thông qua API được kiểm soát.
2. **Phân tách rạch ròi bản chất dữ liệu (Evidence Separation):**
   * **FACT:** Dữ liệu thực tế đã xác minh từ ERP/POS (Lịch sử đơn, hóa đơn, thanh toán).
   * **SIGNAL:** Dấu hiệu hành vi quan sát được (Xem sản phẩm, click, giỏ hàng bỏ quên).
   * **HYPOTHESIS:** Giả thuyết phỏng đoán của AI (Dự báo nhu cầu, phân khúc tiềm năng).
   * **DECISION & ACTION:** Quyết định và kế hoạch hành động được hệ thống phê duyệt.
   * *Nguyên tắc thép:* **Giả thuyết AI (Hypothesis) tuyệt đối không được ghi đè thành Fact của khách hàng.**
3. **Cơ chế An toàn Đóng (Fail-Closed):** Bất cứ khi nào không xác minh được giá niêm yết, tồn kho, quyền thực thi (Authority) hoặc sự đồng thuận của khách hàng (Consent), hệ thống phải từ chối hành động an toàn, không được tự suy diễn.

---

## PHẦN II: LỘ TRÌNH THỰC THI 6 PHÂN KỲ THEO GATE (P0 ➔ P5)

Kế hoạch triển khai được thiết kế nghiêm ngặt theo 6 mốc Gate, mỗi mốc có **Điều kiện nghiệm thu (Exit Gate)** cụ thể, đảm bảo làm đến đâu chắc chắn và an toàn đến đó:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ P0: NỀN TẢNG │ ──> │   P1: CSKH   │ ──> │  P2: SALES   │ ──> │ P3: MARKETING│ ──> │P4: HỢP NHẤT  │ ──> │P5: TỰ HÀNH   │
│ (Foundation) │     │ (Care Pilot) │     │(Sales Pilot) │     │ (Mkt Pilot)  │     │(Cross-Domain)│     │(Autonomy)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

### GIAI ĐOẠN P0: NỀN TẢNG CỐT LÕI & QUẢN TRỊ THẨM QUYỀN (FOUNDATION)
*Trọng tâm: Dựng khung xương an toàn, hợp đồng dữ liệu chuẩn và cơ chế kiểm soát trước khi có bất kỳ Agent nào hoạt động.*

#### 1. Hạng mục triển khai chi tiết:
* **Canonical Contracts & Schemas:**
  * Chuẩn hóa cấu trúc dữ liệu `CustomerProfile`, `IdentityMapping`, `ConsentRecord`, `LifecycleState` (`FR-C360-001`).
  * Xây dựng trục dòng thời gian thống nhất `CustomerTimeline` (`FR-C360-002`): `View → Search → Cart → Order → Care → Review`.
  * Chuẩn hóa cấu trúc phân định bản chất dữ liệu: Fact, Signal, Hypothesis, Decision, Action (`FR-C360-003`).
* **Authority & Policy Engine (Mô hình phân quyền BR-001..010):**
  * Thiết lập 6 cấp độ thẩm quyền từ `AUTH-0 (Chỉ quan sát)` đến `AUTH-5 (Tuyệt đối cấm)`.
  * Khóa cứng công thức giá sàn $P_{floor}$; bắt buộc đọc giá và tồn từ ERP; cấm AI tự tạo giá (`BR-001..003`).
  * Chốt chặn kiểm tra quyền riêng tư (Consent Check) trước khi gửi tin (`BR-004`).
  * Khóa nguyên tử chống trùng lặp giao dịch (Idempotent Execution Key) cho 100% action (`BR-005..006`).
* **Knowledge Base & Skill Registry (Tách rời Agent và Kỹ năng):**
  * Xây dựng cây tri thức doanh nghiệp Second Brain: `/company`, `/customer`, `/product`, `/brand`, `/policy`.
  * Khai báo hợp đồng Skill độc lập: Skill ID, Input/Output, Allowed Agent, Required Authority, Timeout, Audit.
* **Connector Framework (Tầng kết nối ngoại vi):**
  * Xây dựng Mock ERP/POS Adapter chuẩn giao thức REST API (đọc kho, bảng giá, đơn hàng).
  * Xây dựng Mock Messaging Router (LINE, Zalo, Webchat) hỗ trợ Webhook bất đồng bộ.

#### 2. Điều kiện nghiệm thu (Exit Gate P0):
> [!IMPORTANT]
> **Exit Gate P0:** Toàn bộ Canonical Schemas được định nghĩa chặt chẽ. Thử nghiệm giả lập cố tình vi phạm quyền (Adversarial test) chứng minh: **Agent tuyệt đối không thể vượt quyền (Authority boundary), không bị ảo giác giá và không bị mất dấu vết kiểm toán (Audit trace).**

---

### GIAI ĐOẠN P1: THỬ NGHIỆM CHĂM SÓC KHÁCH HÀNG (CUSTOMER CARE PILOT)
*Trọng tâm: Tiếp nhận hội thoại đa kênh, tra cứu đơn hàng ERP thật, phân loại 9 intent và cơ chế chuyển giao người thật.*

#### 1. Hạng mục triển khai chi tiết:
* **Omnichannel Customer Care Agent (CS-01):**
  * Nhận diện chuẩn xác 9 nhóm ý định (`FR-CS-001`): Hỏi sản phẩm, Giá, Tồn kho, Trạng thái đơn, Vận chuyển, Đổi trả, Thanh toán, Khiếu nại, Gặp nhân viên.
  * Tích hợp tra cứu dữ liệu đơn hàng thật từ ERP dựa trên định danh đã xác minh của khách (`FR-CS-002`).
* **Hệ thống Quản lý Vụ việc (Case Management Workflow):**
  * Quản lý vòng đời ticket dịch vụ theo 7 trạng thái chuẩn:  
    $$\textbf{NEW} \longrightarrow \textbf{CLASSIFIED} \longrightarrow \textbf{ASSIGNED} \longrightarrow \textbf{IN\_PROGRESS} \longrightarrow \textbf{WAITING\_CUSTOMER} \longrightarrow \textbf{RESOLVED} \longrightarrow \textbf{CLOSED}$$
* **Cơ chế Chuyển giao Người thật (Single Responder Ownership):**
  * Khi khách yêu cầu gặp người hoặc phát hiện khiếu nại gay gắt: Khóa phiên lập tức trong $< 1.0$ giây, chuyển giao cho nhân viên trực và AI giữ im lặng tuyệt đối.

#### 2. Điều kiện nghiệm thu (Exit Gate P1):
> [!IMPORTANT]
> **Exit Gate P1:** Ít nhất 01 kịch bản hội thoại thực tế được xử lý thành công E2E từ lúc tiếp nhận $\rightarrow$ tra cứu đơn hàng ERP $\rightarrow$ phản hồi khách $\rightarrow$ lưu vết Case Outcome và Evidence đầy đủ.

---

### GIAI ĐOẠN P2: THỬ NGHIỆM BÁN HÀNG TỰ ĐỘNG (SALES PILOT)
*Trọng tâm: Chuyển đổi hội thoại thành doanh thu, kiểm tra giá/tồn thời gian thực, phục hồi giỏ hàng và bắn đơn nháp ERP.*

#### 1. Hạng mục triển khai chi tiết:
* **Lead Qualification Agent (SAL-01):**
  * Tự động xác định khách mới/cũ, phân loại nhu cầu, chấm điểm mức độ sẵn sàng mua kèm căn cứ và bằng chứng (`reason + evidence`).
* **AI Sales Advisor (SAL-02):**
  * Tư vấn tính năng sản phẩm, so sánh giải pháp trực tiếp từ kho ERP thật; tuyệt đối tuân thủ chính sách giá niêm yết.
* **Recommendation Agent (SAL-03):**
  * Gợi ý sản phẩm mua kèm (Cross-sell), nâng cấp (Upsell), hoặc sản phẩm thay thế tương đương khi kho hết hàng (Substitute mapping). Mỗi đề xuất bắt buộc có `confidence` và `expected outcome`.
* **Cart Recovery Agent (SAL-04):**
  * Phát hiện giỏ hàng bỏ quên, kiểm tra điều kiện chặn spam (Suppression rule), gửi thông điệp nhắc nhở cá nhân hóa kèm liên kết khôi phục 1-chạm.
* **Bắn Đơn Hàng Nháp Vào ERP (Idempotent Draft Order Generator):**
  * Tự động trích xuất thông tin chat, gọi API ERP tạo bản ghi Draft Order kèm `idempotency_key` chống trùng đơn tuyệt đối.

#### 2. Điều kiện nghiệm thu (Exit Gate P2):
> [!IMPORTANT]
> **Exit Gate P2:** Chứng minh được chuỗi giá trị thực tế: **Tín hiệu nhu cầu $\rightarrow$ AI tư vấn & gợi ý $\rightarrow$ Đơn hàng nháp được tạo thành công trên ERP $\rightarrow$ Bằng chứng doanh thu (Revenue Evidence) được ghi nhận.**

---

### GIAI ĐOẠN P3: THỬ NGHIỆM MARKETING TỰ ĐỘNG (MARKETING PILOT)
*Trọng tâm: Khép kín chu trình chiến dịch từ Lập kế hoạch $\rightarrow$ Phân khúc $\rightarrow$ Sản xuất nội dung $\rightarrow$ Kiểm duyệt Brand Guardian $\rightarrow$ Đo lường ROI.*

#### 1. Hạng mục triển khai chi tiết:
* **Audience Intelligence Agent (MKT-02):**
  * Phân tích dữ liệu hành vi từ Customer 360 để gom nhóm đối tượng (Cohort): khách mới, khách trung thành, khách có nguy cơ rời bỏ, khách quan tâm danh mục cụ thể.
* **Content Agent & Brand Guardian (MKT-03 & MKT-04):**
  * Sinh nội dung bài đăng, tin nhắn thông báo theo brief và chính sách thương hiệu.
  * Bộ lọc Brand Guardian: Tự động phát hiện từ cấm, cam kết sai lệch, sai giá hoặc khuyến mãi vượt thẩm quyền trước khi gửi duyệt.
* **Quy trình Phê duyệt Chiến dịch (Campaign Approval Workflow - MKT-05):**
  * Vận hành quy trình chuẩn:  
    $$\textbf{Brief} \longrightarrow \textbf{Audience} \longrightarrow \textbf{Content} \longrightarrow \textbf{Review} \longrightarrow \textbf{Approval (AUTH-4)} \longrightarrow \textbf{Publish} \longrightarrow \textbf{Attribution}$$
  * Chiến dịch tiếp thị diện rộng bắt buộc phải có xác nhận phê duyệt của Quản lý trên Command Center mới được phát đi.

#### 2. Điều kiện nghiệm thu (Exit Gate P3):
> [!IMPORTANT]
> **Exit Gate P3:** Chiến dịch Marketing không thể tự ý xuất bản nếu chưa qua phê duyệt (AUTH-4); hệ thống đo lường chính xác doanh thu thực tế và đơn hàng tạo ra từ từng chiến dịch (Marketing Attribution).

---

### GIAI ĐOẠN P4: ĐIỀU PHỐI HỢP NHẤT XUYÊN PHÂN HỆ (CROSS-DOMAIN ORCHESTRATION)
*Trọng tâm: Revenue Orchestrator kết nối liền mạch Marketing ➔ Sales ➔ CSKH ➔ Retention mà không làm đứt gãy ngữ cảnh khách hàng.*

#### 1. Hạng mục triển khai chi tiết:
* **Revenue Orchestrator trung tâm (`FR-ORC-001..002`):**
  * Điều phối luồng xuyên Agent: Khi Marketing thu hút khách $\rightarrow$ chuyển ngữ cảnh sang Sales Agent tư vấn $\rightarrow$ khi chốt đơn chuyển sang CSKH theo dõi bưu kiện $\rightarrow$ kích hoạt Retention Agent chăm sóc định kỳ.
* **Retention & Customer Success Agent (CS-02):**
  * Tự động phát hiện dấu hiệu khách quen giảm tần suất mua sắm, phát hiện chu kỳ nạp SIM (T+27), lịch bảo dưỡng xe điện (30 ngày) để kích hoạt Next-Best-Action phù hợp.

#### 2. Điều kiện nghiệm thu (Exit Gate P4):
> [!IMPORTANT]
> **Exit Gate P4:** Vượt qua bài kiểm thử **TC-E2E-001**: 01 tín hiệu khách hàng đi trọn vẹn chu kỳ từ Marketing $\rightarrow$ Sales $\rightarrow$ Đơn hàng $\rightarrow$ CSKH $\rightarrow$ Bằng chứng doanh thu mà không bị mất Customer Context.

---

### GIAI ĐOẠN P5: TỰ HÀNH CÓ KIỂM SOÁT (CONTROLLED AUTONOMY)
*Trọng tâm: Nâng cấp các hành động an toàn sang tự động thực thi có giới hạn; cố định chốt chặn phê duyệt cho các quyết định tài chính.*

#### 1. Hạng mục triển khai chi tiết:
* **Phân tầng thẩm quyền tự hành (Graduated Autonomy):**
  * *Hành động an toàn (AUTH-3 - Bounded Execute):* Trả lời FAQ, kiểm tra trạng thái đơn, gửi tin nhắc nạp SIM, gợi ý sản phẩm thay thế khi hết hàng được phép tự động thực thi 100%.
  * *Hành động rủi ro cao (AUTH-4 - Approval Required):* Chiến dịch tiếp thị diện rộng, hoàn tiền, đền bù khiếu nại, giảm giá ngoại lệ bắt buộc phải qua cổng phê duyệt người thật.
* **Human Command Center Web Console (`SCR-001..005`):**
  * `SCR-001`: Executive Dashboard (Doanh thu AI, Tỷ lệ chuyển đổi, Sự cố bất thường).
  * `SCR-002`: Agent Operations (Giám sát trạng thái Agent, độ trễ, chi phí token).
  * `SCR-003`: Approval Center (Giao diện 1-chạm Approve / Reject / Modify cho Quản lý).
  * `SCR-004`: Customer 360 Console (Xem dòng thời gian và bằng chứng tương tác của từng khách).
  * `SCR-005`: Conversation Console (Theo dõi chat realtime, can thiệp tiếp quản tức thì).

#### 2. Điều kiện nghiệm thu (Exit Gate P5):
> [!IMPORTANT]
> **Exit Gate P5:** Hệ thống vận hành tự hành ổn định ở các tác vụ thông thường; tỷ lệ can thiệp của con người duy trì ở mức tối ưu; 100% quyết định nhạy cảm tài chính đều có chữ ký phê duyệt và log kiểm toán bất biến.

---

## PHẦN III: MA TRẬN PHÂN BỔ TRÁCH NHIỆM DỰ ÁN (RACI MATRIX)

Phân định trách nhiệm rõ ràng giữa các bộ phận theo đúng Điều 28 của Đề bài SRS:

| Hạng Mục Công Việc | Business / BA | Solution Architect | AI Engineering | Backend / IT | QA / Testing |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Khóa KPI baseline, Connector & Approval Policy** | **R / A** | C | I | C | I |
| **2. Thiết kế Canonical Contracts & Authority Engine** | C | **R / A** | C | C | I |
| **3. Xây dựng Orchestrator & Knowledge/Skill System** | I | C | **R / A** | C | I |
| **4. Xây dựng Connectors, ERP Adapter & Idempotency** | I | C | C | **R / A** | I |
| **5. Xây dựng Human Command Center Console** | C | I | C | **R / A** | I |
| **6. Xây dựng Bộ Kiểm thử Chấp nhận TC-E2E-001..009** | C | C | C | C | **R / A** |
| **7. Nghiệm thu từng Gate (P0 ➔ P5)** | **A** | **R** | R | R | R |

*(Ghi chú: **R** - Responsible/Người thực hiện chính; **A** - Accountable/Người phê duyệt cuối; **C** - Consulted/Người được tham vấn; **I** - Informed/Người nhận thông tin).*

---

## PHẦN IV: BỘ 9 KIỂM THỬ CHẤP NHẬN HỆ THỐNG (SYSTEM ACCEPTANCE SUITE)

Toàn bộ quá trình triển khai sẽ được nghiệm thu tự động thông qua **9 kịch bản kiểm thử bắt buộc (TC-E2E-001 đến TC-E2E-009)**:

| Mã Kiểm Thử | Tên Kịch Bản Kiểm Thử | Hành Động Kích Hoạt | Tiêu Chuẩn Đạt Nghiệm Thu (Pass Criteria) |
| :--- | :--- | :--- | :--- |
| **TC-E2E-001** | Chu trình E2E khép kín | Đưa 1 tín hiệu khách hàng vào hệ thống. | Đi trọn vẹn chuỗi: Signal $\rightarrow$ Context $\rightarrow$ Decision $\rightarrow$ Action $\rightarrow$ Execution $\rightarrow$ Evidence $\rightarrow$ Outcome. |
| **TC-E2E-002** | Chốt chặn phê duyệt Marketing | Marketing Agent phát lệnh gửi chiến dịch. | Bị chặn lại ở trạng thái PENDING_APPROVAL; chỉ gửi tin sau khi có người bấm Duyệt trên Command Center. |
| **TC-E2E-003** | Chống ảo giác giá bán | Khách mặc cả hoặc hỏi giá sản phẩm. | Agent chỉ trích xuất giá từ ERP; nếu nhập giá sai lệch ngoài bảng niêm yết lập tức bị Policy Engine hủy bỏ. |
| **TC-E2E-004** | Cô lập dữ liệu khách hàng | Agent tra cứu đơn hàng và ticket. | Chỉ truy xuất dữ liệu của đúng User ID đã xác minh; không bao giờ để lọt dữ liệu khách A sang khách B. |
| **TC-E2E-005** | Khóa chống trùng giao dịch | Giả lập mạng chập chờn gửi 10 request tạo đơn cùng lúc. | Nhờ `idempotency_key`, ERP chỉ ghi nhận đúng 01 bản ghi đơn hàng nháp duy nhất; 9 request sau trả kết quả cũ. |
| **TC-E2E-006** | Phòng thủ Prompt Injection | Khách gửi prompt cố tình yêu cầu nâng quyền Agent. | Hệ thống lập tức trả lời từ chối (**DENY**), ghi nhận Audit Security Alert; quyền hạn Agent không thay đổi. |
| **TC-E2E-007** | Kiểm soát quyền riêng tư | Khách hàng đã hủy đăng ký nhận tin quảng cáo (No consent). | Mọi chiến dịch tiếp thị đều tự động loại trừ (Suppression) khách hàng này 100%. |
| **TC-E2E-008** | Cơ chế An toàn khi mất mạng | Ngắt kết nối mạng tới ERP hoặc cổng Zalo. | Hệ thống chuyển sang hàng đợi Retry có kiểm soát; tuyệt đối không báo trạng thái thành công giả. |
| **TC-E2E-009** | Khả năng truy vết kiểm toán | Trích xuất 1 đơn hàng đã tạo thành công. | Hệ thống truy ngược được đầy đủ chuỗi: Trigger nào $\rightarrow$ Context gì $\rightarrow$ Decision nào $\rightarrow$ Evidence chứng minh là gì. |

---

## PHẦN V: QUẢN TRỊ RỦI RO & KHÓA CÁC GIẢ ĐỊNH (ASSUMPTIONS MANAGEMENT)

Bảng hành động cụ thể để xử lý 5 giả định được nêu tại Điều 26 của Đề bài SRS:

| Mã Giả Định | Nội Dung Giả Định Cần Khóa | Rủi Ro Nếu Không Khóa | Hành Động Xử Lý Trong Kế Hoạch |
| :---: | :--- | :--- | :--- |
| **ASM-001** | Danh sách Connector Production (API LINE, Zalo, ERP, Web). | Chậm tiến độ tích hợp thực tế. | Xây dựng sẵn **Mock Adapter chuẩn giao thức** trong P0; khi IT bàn giao API Key thật là cắm vào chạy ngay (Plug-and-Play). |
| **ASM-002** | Chỉ số đo lường KPI Baseline thực tế. | Tranh cãi về hiệu quả sau triển khai. | Đo đạc dữ liệu đối chứng trong 14 ngày chạy thử nghiệm (Pilot Phase) trước khi chốt KPI cam kết chính thức. |
| **ASM-003** | Ngưỡng voucher/discount AI được tự cấp. | Thất thoát tài chính do AI phát quà quá tay. | Cài cứng ngưỡng mặc định: Voucher $\le 30$ NTD thuộc AUTH-3 (Tự cấp); Voucher $> 30$ NTD thuộc AUTH-4 (Bắt buộc Quản lý duyệt). |
| **ASM-004** | Loại đổi trả/hoàn tiền cần người duyệt. | Nguy cơ trục lợi chính sách đền bù. | 100% yêu cầu hoàn tiền hoặc bồi thường thiệt hại bắt buộc phải qua AUTH-4 (Quản lý duyệt trên Approval Center). |
| **ASM-005** | Dữ liệu Customer 360 được lưu lâu dài. | Vi phạm luật bảo vệ dữ liệu cá nhân. | Thiết lập chính sách lưu trữ: Chỉ lưu định danh và lịch sử mua; dữ liệu chat hội thoại chi tiết tự động xóa sau 90 ngày. |

---

## PHẦN VI: KẾT LUẬN & ĐỀ NGHỊ PHÊ DUYỆT

Bản Kế hoạch triển khai này bảo đảm:
1. **Bám sát 100% Đề bài SRS `AI-REV-SRS-001`**: Không thiếu bất kỳ khối chức năng, nguyên tắc an toàn hay tiêu chuẩn kiểm thử nào của sếp.
2. **Tuân thủ triệt để Zero-Disruption & An toàn Tài chính**: Doanh nghiệp hoàn toàn làm chủ hệ thống thông qua ma trận phân quyền `AUTH-0..5` và chốt chặn phê duyệt người thật.
3. **Lộ trình phân kỳ khoa học**: Đi từng bước chắc chắn từ Nền tảng P0 $\rightarrow$ Thử nghiệm CSKH P1 $\rightarrow$ Bán hàng P2 $\rightarrow$ Marketing P3 $\rightarrow$ Tự hành P5.

**Kính trình Ban Giám đốc xem xét và phê duyệt Kế hoạch triển khai để đội ngũ kỹ thuật chính thức bước vào thực thi Giai đoạn P0 (Foundation).**
