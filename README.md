# HỆ THỐNG AI AGENT DOANH THU & TƯƠNG TÁC KHÁCH HÀNG (AI-REV-SRS-001)
## MARKETING — SALES — CHĂM SÓC KHÁCH HÀNG (CUSTOMER SUCCESS)
### LỚP TRÍ TUỆ DOANH NGHIỆP TỰ HÀNH (AI REVENUE WORKFORCE) — TIÊU CHUẨN ZERO-DISRUPTION

> **Mã đặc tả căn cứ:** `AI-REV-SRS-001` (Phiên bản 0.1, ngày 15/09/2026).  
> **Chủ thể triển khai:** Chuỗi Siêu thị Bán lẻ Hàng hóa & Dịch vụ Kiều bào tại Đài Loan.  
> **Mục tiêu cốt lõi:** Xây dựng hệ thống **AI Agent Doanh thu & Tương tác khách hàng hợp nhất**, vận hành tự hành 24/7 xuyên suốt chuỗi giá trị:  
> $$\textbf{Signal} \longrightarrow \textbf{Customer 360} \longrightarrow \textbf{Marketing} \longrightarrow \textbf{Sales} \longrightarrow \textbf{Care} \longrightarrow \textbf{Retention} \longrightarrow \textbf{Outcome} \longrightarrow \textbf{Learning}$$  
> **Nguyên tắc kỹ thuật sống còn:** **Zero-Disruption & Fail-Closed** — ERP/POS/Web/App tiếp tục là **System of Record duy nhất**. Mọi quyền thực thi của AI đều có giới hạn theo `AUTH-0..5`, bảo vệ giá sàn bằng code cứng ngoài LLM, sinh `audit trace` và vượt qua 9 kiểm thử chấp nhận `TC-E2E-001..009`.

---

## 📂 HỆ THỐNG HỒ SƠ QUY CHUẨN ĐANG THỰC THI (ACTIVE SPECIFICATIONS)

Hồ sơ dự án được cung cấp dưới 2 hình thức: **Bản in tổng hợp duy nhất (Master Document)** dành cho Ban Giám đốc phê duyệt và **Hệ thống kế hoạch mô-đun (Modular Plans)** dành cho các nhóm kỹ sư triển khai:

### 1. Hồ Sơ Báo Cáo Cấp Lãnh Đạo & Toàn Văn Đặc Tả (Executive & Full Spec)
* 📊 **Bản Slide Thuyết Trình Điều Hành (Executive Deck):** [BAO_CAO_THUYET_TRINH_AI_AGENT_ENTERPRISE.pdf](BAO_CAO_THUYET_TRINH_AI_AGENT_ENTERPRISE.pdf) *(Bản in màu 6 trang khổ A4 thiết kế chuyên nghiệp dành cho báo cáo Sếp/Hội đồng)*.
* 📄 **Bản Đặc Tả Kế Hoạch Triển Khai Master:** [KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf) *(Bản in tài liệu kỹ thuật đầy đủ 12 phần)*.
* 📝 **Bản Markdown nguồn:** [KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md).
* 📋 **Đề bài kỹ thuật gốc của Sếp:** [De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md](De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md).

### 2. Hệ Thống Kế Hoạch Mô-Đun Kỹ Thuật (Modular Engineering Plans)
Mục lục chi tiết tại 👉 **[plans/README.md](plans/README.md)**:

```text
plans/
├── README.md                              # Điều hướng tổng thể, kiến trúc 3 tầng & RTM 28 mục SRS
├── glossary.md                            # Bảng tra cứu toàn bộ thuật ngữ Công nghệ AI & Bán lẻ Đài Loan
├── modules/                               # 3 Phân hệ Trợ lý AI thực chiến
│   ├── marketing.md                       # MKT-01..06, MKT-KEY-01..03, Brand Guardian, Quiz 30s
│   ├── sales.md                           # SAL-01..05, SAL-KEY-01..04 (Khóa giá sàn P_floor bằng code cứng)
│   └── customer-support.md                # CS-01..02, CS-KEY-01..03 (Crisis Alert <=1s), Logistics 4 chuỗi CVS
├── platform/                              # Khung gầm kỹ thuật & Điều phối trung tâm
│   ├── architecture.md                    # Kiến trúc lõi, Orchestrator 11 bước, 5 màn hình Command Center, Rủi ro RSK
│   ├── data-and-knowledge.md              # Data Dictionary 6 Domain, Customer 360, Two-Stage RAG, 5 tầng Memory
│   ├── workflows-and-handoffs.md          # Sequence Flows, Thẩm quyền AUTH-0..5, 10 Quy tắc BR-001..010
│   └── api-and-integrations.md            # Skill Contracts, Connectors 4 chuỗi CVS, ERP/WMS Sync, Bảo mật NFR
└── delivery/                              # Bàn giao, kiểm chứng & đo lường
    ├── mvp-and-roadmap.md                 # Lộ trình 6 Gate (P0–P5), 18 bước thi công, DoD 10 tiêu chuẩn, 9 Test E2E
    └── analytics.md                       # 5 Nhóm KPIs, Công thức giá sàn P_floor, Unit Economics & FinOps AI
```

---

## 🏛️ KIẾN TRÚC ĐIỀU PHỐI DOANH THU (REVENUE ORCHESTRATION)

```text
                  CUSTOMER / MARKET (Web / App / LINE OA / Zalo)
                                        │
                             ┌──────────▼──────────┐
                             │ Data & Signal       │
                             │ Ingestion Layer     │
                             └──────────┬──────────┘
                                        │
                             ┌──────────▼──────────┐
                             │ Customer 360        │
                             │ + Timeline Events   │
                             └──────────┬──────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
   Marketing AI                     Sales AI                          CS AI
   (MKT-01..06)                   (SAL-01..05)                     (CS-01..02)
        │                               │                               │
        └───────────────────────────────┼───────────────────────────────┘
                                        ▼
                             ┌─────────────────────┐
                             │ Revenue Orchestrator│
                             │ 11 Bước Điều Phối   │
                             └──────────┬──────────┘
                                        ▼
                             ┌─────────────────────┐
                             │ Policy & Auth Gate  │
                             │ AUTH-0..5 & BR Rules│
                             └──────────┬──────────┘
                                        ▼
                             ┌─────────────────────┐
                             │ Deterministic Engine│
                             │ Khóa Cứng P_floor   │
                             └──────────┬──────────┘
                                        ▼
                             ┌─────────────────────┐
                             │ Skill Execution     │
                             └──────────┬──────────┘
                                        ▼
                  ERP / POS / WMS / 4 Chuỗi Bưu Cục CVS
                                        │
                                        ▼
                             Evidence → Outcome
                                        │
                                        ▼
                             Learning AI Memory
```

---

## 🛡️ CÁC CHỐT CHẶN BẢO MẬT & QUẢN TRỊ BẮT BUỘC (GOVERNANCE)

1. **Phân Tầng Thẩm Quyền (Authority Model):** Từ `AUTH-0 (Observe)` $\rightarrow$ `AUTH-3 (Bounded Execute)` $\rightarrow$ `AUTH-4 (Approval Required)` $\rightarrow$ `AUTH-5 (Prohibited)`.
2. **Khóa Giá & Tồn Kho (Price & Stock Guard):** Giá và tồn kho bắt buộc đọc từ ERP. Lớp code logic cứng ngoài LLM khóa chặt giá sàn $P_{floor}$, triệt tiêu 100% rủi ro Prompt Injection.
3. **Phân Tách Dữ Liệu Rạch Ròi:** FACT (đã xác minh) vs HYPOTHESIS (giả thuyết AI). Giả thuyết AI không bao giờ được ghi đè thành Fact của khách hàng.
4. **Khóa Chống Ghi Trùng (Idempotency Key):** Mọi hành động tạo đơn hay gửi tin đều có `execution_id` duy nhất, chống trùng lặp giao dịch.
5. **Cơ Chế An Toàn Đóng (Fail-Closed):** Mất kết nối dữ liệu hoặc thiếu sự đồng thuận (Consent) của khách hàng, hệ thống tự động từ chối an toàn.
