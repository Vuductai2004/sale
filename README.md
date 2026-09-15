# HỆ THỐNG AI AGENT DOANH THU & TƯƠNG TÁC KHÁCH HÀNG (AI-REV-SRS-001)
## MARKETING — SALES — CHĂM SÓC KHÁCH HÀNG (CUSTOMER SUCCESS)
### LỚP TRÍ TUỆ DOANH NGHIỆP TỰ HÀNH (AI REVENUE WORKFORCE) — TIÊU CHUẨN ZERO-DISRUPTION

> **Mã đặc tả căn cứ:** `AI-REV-SRS-001` (Phiên bản 0.1, ngày 15/09/2026).  
> **Mục tiêu cốt lõi:** Xây dựng hệ thống **AI Agent Doanh thu & Tương tác khách hàng hợp nhất**, vận hành xuyên suốt chuỗi giá trị:  
> $$\textbf{Signal} \longrightarrow \textbf{Customer 360} \longrightarrow \textbf{Marketing} \longrightarrow \textbf{Sales} \longrightarrow \textbf{Care} \longrightarrow \textbf{Retention} \longrightarrow \textbf{Outcome} \longrightarrow \textbf{Learning}$$  
> **Nguyên tắc kỹ thuật sống còn:** **Zero-Disruption & Fail-Closed** — ERP/POS/Web/App tiếp tục là **System of Record**. Mọi quyền thực thi của AI đều có giới hạn theo `AUTH-0..5`, sinh `audit trace` và vượt qua 9 kiểm thử chấp nhận `TC-E2E-001..009`.

---

## 📂 DANH MỤC HỒ SƠ ĐANG THỰC THI (ACTIVE SPECIFICATIONS)

| STT | Tên Hồ Sơ / Tài Liệu | Định Dạng | Nội Dung Trọng Tâm |
| :---: | :--- | :---: | :--- |
| **01** | **Kế Hoạch Triển Khai Master (SRS-001)** | [Bản Markdown](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md) \| [Bản PDF](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf) | Lộ trình kỹ thuật 6 phân kỳ theo Gate (P0 ➔ P5), 18 bước thực thi, ma trận RACI, 9 bài test TC-E2E-001..009 và Definition of Done (DoD). |
| **02** | **Đề Bài Kỹ Thuật (SRS Baseline)** | [Bản Markdown](De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md) | Bản đặc tả yêu cầu nghiệp vụ và kỹ thuật AI-REV-SRS-001 do Ban Giám đốc ban hành. |
| **03** | **Đề Án Chuỗi Siêu Thị Đài Loan (Enterprise SRS)** | [Bản Markdown](DE_AN_AI_AGENT_CHUOI_BAN_LE_DAI_LOAN_ENTERPRISE_SRS.md) \| [Bản PDF](DE_AN_AI_AGENT_CHUOI_BAN_LE_DAI_LOAN_ENTERPRISE_SRS.pdf) | Bản áp dụng trọn vẹn khung SRS minh bạch cho 5 ngành hàng kiều bào Đài Loan (AUTH-0..5, Zero-Disruption, Fail-Closed, 9 bài test). |

---

## 🗄️ THƯ MỤC LƯU TRỮ HỒ SƠ CŨ (HISTORICAL ARCHIVE)

Toàn bộ các tài liệu nghiên cứu, báo cáo đề án chuỗi siêu thị và danh mục tính năng ban đầu đã được đóng gói an toàn vào thư mục:  
👉 [`Archive_Tai_Lieu_Cu/`](Archive_Tai_Lieu_Cu/)

*Các hồ sơ đã lưu trữ trong thư mục Archive:*
* `BAO_CAO_MO_HINH_AUTONOMOUS_COMMERCE_AI_AGENT_DAI_LOAN.md` & `.pdf`
* `DANH_SACH_TINH_NANG_AGENTOS_DAI_LOAN.md` & `.pdf`
* `CHIEN_LUOC_THU_HUT_KHACH_HANG_3_MODULE.md` & `.pdf`
* `DE_XUAT_Y_TUONG_BO_TRO_3_MODULE.md` & `.pdf`
* `DE_AN_AI_AGENT_DAI_LOAN_BAN_SUA.docx`
* `AgentOS_Customer360_Tai_lieu_giai_phap_tong_hop.pdf`
* Các báo cáo đánh giá và đề án nghiên cứu ban đầu khác.

---

## 🏛️ KIẾN TRÚC ĐIỀU PHỐI DOANH THU (REVENUE ORCHESTRATION)

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

## 🛡️ CÁC CHỐT CHẶN BẢO MẬT & QUẢN TRỊ BẮT BUỘC (GOVERNANCE)

1. **Phân Tầng Thẩm Quyền (Authority Model):** Từ `AUTH-0 (Observe)` $\rightarrow$ `AUTH-3 (Bounded Execute)` $\rightarrow$ `AUTH-4 (Approval Required)` $\rightarrow$ `AUTH-5 (Prohibited)`.
2. **Khóa Giá & Tồn Kho (Price & Stock Guard):** Giá và tồn kho bắt buộc gọi API chính thống từ ERP; cấm tuyệt đối AI tự suy diễn hay hạ giá âm vốn.
3. **Phân Tách Dữ Liệu Rạch Ròi:** FACT (đã xác minh) vs HYPOTHESIS (giả thuyết AI). Giả thuyết AI không bao giờ được ghi đè thành Fact của khách hàng.
4. **Khóa Chống Ghi Trùng (Idempotency Key):** Mọi hành động tạo đơn hay gửi tin đều có `execution_id` duy nhất, retry mạng không tạo trùng lặp giao dịch.
5. **Cơ Chế An Toàn Đóng (Fail-Closed):** Mất kết nối dữ liệu hoặc thiếu sự đồng thuận (Consent) của khách hàng, hệ thống tự động từ chối an toàn.
