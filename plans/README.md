# Hệ Thống AI Agent Doanh Thu & CSKH Tự Hành Cấp Enterprise — Kế Hoạch Triển Khai

> **Dự án:** Xây dựng Hệ thống AI Agent Marketing, Sales, CSKH tích hợp đa kênh  
> **Mã hồ sơ:** `AI-REV-SRS-001` · **Phiên bản:** `v1.2-Enterprise`  
> **Chủ thể triển khai:** Chuỗi Siêu thị Bán lẻ Hàng hóa & Dịch vụ Kiều bào tại Đài Loan  
> **System of Record duy nhất:** ERP / POS / Web Ecommerce / Mobile App hiện hữu (Nguyên tắc Zero-Disruption)

---

## 1. Mục Lục Điều Hướng Hệ Thống Kế Hoạch (Plans Navigation)

Hồ sơ kế hoạch kỹ thuật và nghiệp vụ được tổ chức theo chuẩn **Enterprise Modular Documentation**, chia thành 3 phân khu chuyên biệt:

```text
plans/
├── README.md                              # Trang chủ điều hướng và ma trận mã hiệu toàn hệ thống
├── modules/                               # Đặc tả chi tiết 3 Phân hệ Trợ lý AI thực chiến
│   ├── marketing.md                       # Phân hệ Tiếp thị: MKT-01..06, MKT-KEY-01..03, Chiến dịch & Guardian
│   ├── sales.md                           # Phân hệ Bán hàng: SAL-01..05, SAL-KEY-01..04 (Khóa giá sàn P_floor), Quick Cart
│   └── customer-support.md                # Phân hệ CSKH: CS-01..02, CS-KEY-01..03 (Crisis Alert <=1s), CVS Logistics
├── platform/                              # Khung gầm kỹ thuật & Hạ tầng điều phối nền tảng
│   ├── architecture.md                    # Kiến trúc lõi, Zero-Disruption, Orchestrator 11 bước & 5 màn hình Command Center
│   ├── data-and-knowledge.md              # Data Dictionary 6 Domain, Customer 360, Two-Stage RAG & 5 tầng AI Memory
│   ├── workflows-and-handoffs.md          # Sequence Flows (Lead-to-Cash), Thẩm quyền AUTH-0..5, 10 Quy tắc BR-001..010
│   └── api-and-integrations.md            # Hợp đồng Kỹ năng (Skill Contracts), Webhook bưu cục CVS 4 chuỗi, ERP/POS Sync
└── delivery/                              # Kế hoạch bàn giao, kiểm chứng & đo lường hiệu quả
    ├── mvp-and-roadmap.md                 # Lộ trình 6 Gate (P0–P5), 18 bước thi công, DoD 10 tiêu chuẩn & 9 Test Cases E2E
    └── analytics.md                       # Hệ thống KPI 5 nhóm (Mục 20 SRS), Thuật toán P_floor, Unit Economics & FinOps AI
```

* Bản in tổng hợp đầy đủ một tài liệu duy nhất (Master PDF): [KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf](../../KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf).
* Tài liệu Master Markdown nguồn: [KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md](../../KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md).

---

## 2. Mô Hình Phân Tầng 3 Lớp (The 3-Tier Separation Architecture)

Để giải quyết triệt để sự chồng chéo giữa khung gầm kỹ thuật phần mềm chuẩn hóa và nghiệp vụ bán lẻ thực chiến tại Đài Loan, toàn bộ giải pháp được cấu trúc theo 3 tầng độc lập:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TẦNG 3: BẢN ĐỊA HÓA BÁN LẺ & NGHIỆP VỤ THỰC CHIẾN TẠI ĐÀI LOAN        │
│ - Mạng lưới 4 chuỗi bưu cục tiện lợi (7-Eleven, FamilyMart, Hi-Life, OK)│
│ - Nhận hàng trả tiền mặt siêu thị (CVS COD) & Bản đồ chọn bưu cục E-Map│
│ - Ngành hàng Xe máy điện mới 100% & Phụ tùng chính hãng (Ắc quy, sạc)  │
│ - Ngành hàng FMCG thực phẩm quê hương, cước SIM 30 ngày kiều bào      │
│ - Hóa giải tâm lý cảnh giác lừa đảo (詐騙) bằng mã số thuế & LINE tick xanh│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Cấu hình & Kế thừa
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 2: BÀN CÂN KINH TẾ ĐƠN VỊ & MÁY CHỦ KHÓA GIÁ SÀN (P_floor)       │
│ - Tái phân bổ chi phí telesales/sales hoa hồng 5–10% thành Quỹ trợ cấp │
│ - Deterministic Policy Engine (Code cứng ngoài LLM) khóa chặt P_floor │
│ - Tuyệt đối ngăn chặn Prompt Injection và bảo toàn 100% biên lãi ròng L│
│ - Cơ chế giữ chỗ ngân sách nguyên tử (Atomic Budget Hold) & TTL 10 phút│
│ - Định mức chi phí AI (FinOps): 0.5 – 1.0 TWD / phiên tư vấn trọn gói  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Vận hành trên nền tảng
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 1: KHUNG GẦM KỸ THUẬT NỀN TẢNG CHUẨN SRS v0.1 (ENTERPRISE CORE)   │
│ - Revenue Orchestrator 11 bước (SIGNAL ➔ DECISION ➔ EVIDENCE ➔ OUTCOME)│
│ - 13 Internal Sub-Agents chuyên trách (MKT-01..06, SAL-01..05, CS-01..02)│
│ - Ma trận thẩm quyền 6 cấp (AUTH-0..AUTH-5) & 10 Quy tắc nghiệp vụ BR  │
│ - Hồ sơ dữ liệu Customer 360, Two-Stage RAG và 5 tầng AI Memory        │
│ - Bảng điều khiển quản trị 5 màn hình (Human Command Center SCR-001..005)│
│ - Lộ trình 6 Cổng Gate kỹ thuật (P0–P5) & 9 Test Cases chấp nhận E2E   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Bảng Danh Mục Mã Hiệu Toàn Hệ Thống (Master Taxonomy)

| Tiền tố | Nhóm Danh Mục | Phạm Vi & Định Danh Chi Tiết | Tài Liệu Quy Chiếu |
|---|---|---|---|
| **OBJ-001..006** | Mục tiêu hệ thống | 6 Mục tiêu nền tảng: Marketing (001), Sales (002), Care (003), Retention (004), Orchestrator (005), Governance (006) | [plans/README.md](README.md) |
| **MKT-01..06** | Sub-Agents Marketing | 6 Vai trò nội bộ: MKT-01 (Strategist), MKT-02 (Audience), MKT-03 (Content), MKT-04 (Brand Guardian), MKT-05 (Campaign), MKT-06 (Analyst) | [plans/modules/marketing.md](modules/marketing.md) |
| **MKT-KEY-01..03** | Tính năng MKT Mũi nhọn | Exit-Intent Popup (01), Interactive Quiz 30s (02), Member-Get-Member Referral (03) | [plans/modules/marketing.md](modules/marketing.md) |
| **SAL-01..05** | Sub-Agents Sales | 5 Vai trò: SAL-01 (Lead Qual), SAL-02 (Advisor), SAL-03 (Recommendation), SAL-04 (Cart Recovery), SAL-05 (Replenishment) | [plans/modules/sales.md](modules/sales.md) |
| **SAL-KEY-01..04** | Tính năng Sales Mũi nhọn | AI Dynamic Bargain có code cứng khóa $P_{floor}$ (01), Slide-Over Quick Cart (02), Cứu đơn hết hàng (03), Semantic Search (04) | [plans/modules/sales.md](modules/sales.md) |
| **CS-01..02** | Sub-Agents CSKH | 2 Vai trò: CS-01 (Omnichannel Care), CS-02 (Retention / Customer Success) | [plans/modules/customer-support.md](modules/customer-support.md) |
| **CS-KEY-01..03** | Tính năng CSKH Mũi nhọn | Quick Action Chips 0.5s (01), Báo động đỏ Crisis Alert & Human Takeover <= 1.0s (02), Lịch chăm sóc SIM & Xe điện (03) | [plans/modules/customer-support.md](modules/customer-support.md) |
| **AUTH-0..5** | Cấp độ thẩm quyền | 6 Cấp phân quyền hành động AI: Observe (0), Recommend (1), Draft (2), Bounded Execute (3), Human Approve (4), Blocked (5) | [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md) |
| **BR-001..010** | Quy tắc nghiệp vụ | 10 Quy tắc bất biến: Giá từ ERP, Chống giá ảo, Cấm bịa đặt, Quyền riêng tư, Chống trùng lặp, An toàn thanh toán... | [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md) |
| **SCR-001..005** | Command Center | 5 Màn hình quản trị: Executive Dashboard (001), Agent Ops (002), Approval Center (003), Customer 360 (004), Live Console (005) | [plans/platform/architecture.md](platform/architecture.md) |
| **GATE P0..P5** | Phân kỳ triển khai | 6 Cổng nghiệm thu kỹ thuật: Foundation (P0), Care Pilot (P1), Sales Pilot (P2), MKT Pilot (P3), Cross-Domain (P4), Autonomy (P5) | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **TC-E2E-001..009** | Kịch bản kiểm thử | 9 Bộ test E2E chấp nhận nghiệm thu theo chuẩn Given-When-Then bao quát toàn diện chu trình vận hành | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **GLOSSARY** | Từ điển thuật ngữ | Bảng giải nghĩa toàn bộ thuật ngữ Công nghệ AI & Nghiệp vụ Bán lẻ Đài Loan | [plans/glossary.md](glossary.md) |

---

## 4. Ma Trận Truy Vết Yêu Cầu 28 Điều Khoản SRS v0.1 (Requirements Traceability Matrix - RTM)

Bảng đối soát chi tiết chứng minh hệ thống kế hoạch đáp ứng **100% đầy đủ 28 điều khoản** của Đề bài gốc (`AI-REV-SRS-001`):

| Mục SRS | Tiêu Đề Điều Khoản Đề Bài | Mã Yêu Cầu Kỹ Thuật | Tệp Hồ Sơ Đáp Ứng & Phân Hệ Chịu Trách Nhiệm |
|:---:|---|---|---|
| **1** | Thông tin tài liệu & Phiên bản | AI-REV-SRS-001 | [plans/README.md](README.md), [KE_HOACH_TRIEN_KHAI...md](../../KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md) |
| **2** | Tuyên bố vấn đề & 6 Mục tiêu | OBJ-001..OBJ-006 | [plans/README.md](README.md), [plans/delivery/analytics.md](delivery/analytics.md) |
| **3** | Ranh giới phạm vi hệ thống | In-Scope & Out-of-Scope | [plans/modules/sales.md](modules/sales.md), [plans/platform/architecture.md](platform/architecture.md) |
| **4** | 10 Khối chức năng bắt buộc | Architecture Overview | [plans/platform/architecture.md](platform/architecture.md) |
| **5** | Customer Intelligence 360 | FR-C360-001..003 | [plans/platform/data-and-knowledge.md](platform/data-and-knowledge.md) |
| **6** | Marketing AI Agents (6 agents) | FR-MKT-001..006 | [plans/modules/marketing.md](modules/marketing.md) |
| **7** | Sales AI Agents (5 agents) | FR-SAL-001..005 | [plans/modules/sales.md](modules/sales.md) |
| **8** | CSKH & Retention Agents (2 agents)| FR-CS-001..003 | [plans/modules/customer-support.md](modules/customer-support.md) |
| **9** | Revenue Orchestrator 11 bước | FR-ORCH-001..005 | [plans/platform/architecture.md](platform/architecture.md), [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md) |
| **10** | Human Command Center (5 screens) | FR-SCR-001..005 | [plans/platform/architecture.md](platform/architecture.md) |
| **11** | Agent-Skill Architecture | FR-SKL-001..003 | [plans/platform/api-and-integrations.md](platform/api-and-integrations.md) |
| **12** | Knowledge Base & 5-Tier Memory | FR-KNB-001..004 | [plans/platform/data-and-knowledge.md](platform/data-and-knowledge.md) |
| **13** | Data Platform & 6 Domains | FR-DAT-001..003 | [plans/platform/data-and-knowledge.md](platform/data-and-knowledge.md) |
| **14** | Connectors & 4 Chuỗi CVS | FR-CON-001..004 | [plans/platform/api-and-integrations.md](platform/api-and-integrations.md) |
| **15** | Policy, Authority (AUTH-0..5) | FR-POL-001..004 | [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md) |
| **16** | Audit, Telemetry & Observability | FR-AUD-001..003 | [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md), [plans/delivery/analytics.md](delivery/analytics.md) |
| **17** | Evidence, Evaluation & Learning | FR-LRN-001..003 | [plans/platform/architecture.md](platform/architecture.md), [plans/modules/sales.md](modules/sales.md) |
| **18** | Non-Functional Reqs (10 NFRs) | NFR-001..NFR-010 | [plans/platform/api-and-integrations.md](platform/api-and-integrations.md), [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **19** | Test Cases E2E (9 test suites) | TC-E2E-001..009 | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **20** | 5 Nhóm KPIs & Unit Economics | Business/Tech KPIs | [plans/delivery/analytics.md](delivery/analytics.md) |
| **21** | 10 Quy tắc nghiệp vụ bất biến | BR-001..BR-010 | [plans/platform/workflows-and-handoffs.md](platform/workflows-and-handoffs.md) |
| **22** | Deliverables & Hồ sơ bàn giao | DEL-001..DEL-006 | [plans/README.md](README.md), [presentation/](presentation/) |
| **23** | Giả định & Ràng buộc hệ thống | ASM-001..ASM-005 | [plans/platform/architecture.md](platform/architecture.md) |
| **24** | Kế hoạch triển khai Pilot | Pilot Taiwan FMCG/EV | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **25** | Lộ trình 6 Cổng Gate kỹ thuật | Gate P0 đến P5 | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **26** | Tiêu chí nghiệm thu từng Gate | Acceptance Criteria | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **27** | Tiêu chuẩn hoàn thành (DoD) | DoD 10 Tiêu chuẩn | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |
| **28** | Bàn giao kỹ thuật 7 nhóm | 7 Engineering Teams | [plans/delivery/mvp-and-roadmap.md](delivery/mvp-and-roadmap.md) |

