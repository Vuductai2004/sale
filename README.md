# ĐỀ ÁN HỆ THỐNG AI AGENT THƯƠNG MẠI BÁN LẺ & DỊCH VỤ TẠI ĐÀI LOAN
## LỚP TRÍ TUỆ DOANH NGHIỆP NGOẠI VI (AI BUSINESS AGENT LAYER) — TIÊU CHUẨN ZERO-DISRUPTION

> **Hệ sinh thái áp dụng:** Chuỗi siêu thị bán lẻ hàng tiêu dùng & dịch vụ kiều bào (Việt Nam, Indonesia, Philippines, Thái Lan) tại Đài Loan.  
> **Nguyên tắc kỹ thuật:** **Zero-Disruption** — Tích hợp 100% qua REST API & Webhook, không xâm lấn, không làm xáo trộn hệ thống Website, Mobile App, ERP và cổng giao vận 7-Eleven/FamilyMart sẵn có.

---

## 📂 DANH MỤC HỒ SƠ ĐỀ ÁN & TÀI LIỆU TRÌNH DUYỆT

| STT | Tên Hồ Sơ / Tài Liệu | Định Dạng | Nội Dung Trọng Tâm |
| :---: | :--- | :---: | :--- |
| **01** | **Kế Hoạch Triển Khai (AI-REV-SRS-001)** | [Bản Markdown](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md) \| [Bản PDF](KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf) | Kế hoạch triển khai kỹ thuật 6 giai đoạn (P0 ➔ P5), ma trận RACI và 9 kiểm thử chấp nhận TC-E2E-001..009. |
| **02** | **Đề Bài Kỹ Thuật (SRS Chuẩn)** | [Bản Markdown](De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md) | Yêu cầu kỹ thuật chi tiết AI-REV-SRS-001 do Ban Giám đốc phê duyệt. |
| **03** | **Báo Cáo Đề Án Tổng Thể** | [Bản Markdown](BAO_CAO_MO_HINH_AUTONOMOUS_COMMERCE_AI_AGENT_DAI_LOAN.md) \| [Bản PDF](BAO_CAO_MO_HINH_AUTONOMOUS_COMMERCE_AI_AGENT_DAI_LOAN.pdf) | Chiến lược AI Agent 24/7 ngoại vi, kiến trúc 3 Module cắm/rút độc lập (Marketing - Sales - CSKH). |
| **04** | **Danh Mục 20 Tính Năng Đặc Tả** | [Bản Markdown](DANH_SACH_TINH_NANG_AGENTOS_DAI_LOAN.md) \| [Bản PDF](DANH_SACH_TINH_NANG_AGENTOS_DAI_LOAN.pdf) | Đặc tả 20 tính năng theo 3 module, phân định rõ 20% tính năng mũi nhọn cốt lõi (KEY) và ma trận phân kỳ triển khai. |
| **05** | **Chiến Lược Thu Hút Khách Hàng** | [Bản Markdown](CHIEN_LUOC_THU_HUT_KHACH_HANG_3_MODULE.md) \| [Bản PDF](CHIEN_LUOC_THU_HUT_KHACH_HANG_3_MODULE.pdf) | Kế hoạch kéo khách tự nhiên qua phễu hỏi đáp pháp lý (ARC, BHYT) và cơ chế lan tỏa Member-Get-Member (MGM). |
| **06** | **Đề Xuất Ý Tưởng Bổ Trợ (Dự Phòng)** | [Bản Markdown](DE_XUAT_Y_TUONG_BO_TRO_3_MODULE.md) \| [Bản PDF](DE_XUAT_Y_TUONG_BO_TRO_3_MODULE.pdf) | 6 đề xuất sáng tạo mở rộng chuẩn hóa 3 module (Đón sóng ngày lương mùng 10, Cứu đơn hết hàng, Tìm hàng mô tả...). |
| **07** | **Hồ Sơ Đề Án Văn Phòng** | [Bản DOCX](DE_AN_AI_AGENT_DAI_LOAN_BAN_SUA.docx) | Tài liệu Word phục vụ chỉnh sửa nội bộ và in ấn theo chuẩn văn thư. |
| **08** | **Tài Liệu Giải Pháp Customer360** | [Bản PDF](AgentOS_Customer360_Tai_lieu_giai_phap_tong_hop.pdf) | Tài liệu kiến trúc dữ liệu và giải pháp tích hợp kiều bào. |

---

## 🏛️ KIẾN TRÚC 3 MODULE PLUG-AND-PLAY ĐỘC LẬP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             MÔ HÌNH 3 MODULE MICRO-SERVICE CẮM / RÚT ĐỘC LẬP                │
├─────────────────────────────────────────────────────────────────────────────┤
   [WEBSITE DOANH NGHIỆP]                             [MOBILE APP DOANH NGHIỆP]
              │                                                   │
              ├─────────────────────────┬─────────────────────────┤
              ▼                         ▼                         ▼
   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
   │ MODULE 1: MARKETING │   │   MODULE 2: SALES   │   │   MODULE 3: CSKH    │
   ├─────────────────────┤   ├─────────────────────┤   ├─────────────────────┤
   │ • Cổng RAG pháp lý  │   │ • Trực chat 24/7    │   │ • Bám bưu kiện 7d   │
   │ • Member-Get-Member │   │ • Bắn đơn nháp ERP  │   │ • Đếm ngược nạp SIM │
   │ • Content đa ngữ    │   │ • Báo đỉnh tỷ giá   │   │ • Hậu mãi xe điện   │
   │ • Đo ROI chuyển đổi │   │ • Cross-sell 5 ngành│   │ • Human Takeover 1s │
   │ • Xả cận date 7h    │   │ • Khóa giá sàn P_fl │   │ • Báo động đỏ < 2p  │
   └──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
              │                         │                         │
              └─────────────────────────┼─────────────────────────┘
                                        ▼
                         [LỚP KẾT NỐI BẢO MẬT VỚI ERP]
                   (REST API / Webhook Adapter - Single Source of Truth)
```

---

## 🛡️ CÁC CHỐT CHẶN AN TOÀN DOANH NGHIỆP (CORE GOVERNANCE)

1. **Khóa Giá Sàn Tuyệt Đối ($P_{floor}$):** Code cứng công thức bảo vệ biên lợi nhuận, AI không có quyền tự ý hạ giá hay phát mã giảm giá âm vốn.
2. **Khóa Chống Ghi Trùng Đơn (Idempotency Key):** Đảm bảo hệ thống ERP chỉ ghi nhận duy nhất 1 bản ghi đơn hàng nháp dù khách hàng bấm nhiều lần hay mạng chập chờn.
3. **Tiếp Nhận Người Thật Tức Thì (Human Takeover Single Responder):** Khi nhân viên bấm tiếp nhận phiên chat, AI lập tức ngắt lời trong 1.0 giây và giữ im lặng tuyệt đối.
