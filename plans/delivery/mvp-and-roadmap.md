# Lộ Trình 6 Gate Kỹ Thuật, Kế Hoạch 18 Bước, DoD 10 Tiêu Chuẩn & 9 Test E2E

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Phân hệ:** Delivery & Quality Assurance  
> **Lộ trình:** 6 Cổng Gate kỹ thuật (P0–P5) · **Tiến độ thi công:** 18 Bước chuẩn hóa  
> **Nghiệm thu:** DoD 10 Tiêu chuẩn vàng & 9 Bộ Test E2E (TC-E2E-001..009)  
> **Bàn giao kỹ thuật:** Quy trình 7 Nhóm chuyên môn (Tuyệt đối không dùng RACI sáo rỗng)

---

## 1. Lộ Trình Triển Khai 6 Phân Kỳ Gate Kỹ Thuật (P0–P5)

Dự án quản trị tiến độ bằng **6 Cổng Gate kỹ thuật** với tiêu chí nghiệm thu khắt khe, không dùng các mốc thời gian ước đoán tùy tiện:

```text
[GATE P0] ──► [GATE P1] ──► [GATE P2] ──► [GATE P3] ──► [GATE P4] ──► [GATE P5]
Foundation    Care Pilot    Sales Pilot   MKT Pilot     Cross-Domain  Autonomy
```

* **Cổng P0 - Foundation Readiness (Nền tảng & Hạ tầng):** Hoàn thành kết nối API đọc/ghi với ERP/POS/WMS hiện hữu; tích hợp bảo mật Customer 360; dựng Vector DB và Knowledge Base 5 ngành hàng; hoàn thiện cổng phân quyền AUTH-0..5.
* **Cổng P1 - Customer Care Pilot (Thử nghiệm CSKH):** Kích hoạt phân hệ CSKH tự hành 24/7 (CS-01, CS-02); kiểm chứng Quick Action Chips 0.5s; kiểm thử chuyển giao khẩn cấp Human Takeover <= 1.0s và tra cứu vận đơn 4 chuỗi bưu cục CVS.
* **Cổng P2 - Sales Copilot Pilot (Thử nghiệm Bán hàng):** Kích hoạt phân hệ Bán hàng (SAL-01..05); kiểm chứng giỏ hàng trượt Slide-Over; nghiệm thu lớp code cứng **Deterministic Policy Engine** khóa giá sàn $P_{floor}$; kiểm thử cứu đơn hết hàng.
* **Cổng P3 - Marketing Automation Pilot (Thử nghiệm Tiếp thị):** Kích hoạt phân hệ Tiếp thị (MKT-01..06); chạy thử nghiệm Exit-Intent Popup, Interactive Quiz và chiến dịch Giới thiệu người mới (Member-Get-Member).
* **Cổng P4 - Cross-Domain Orchestration (Hợp nhất Đa miền):** Kích hoạt trọn vẹn Revenue Orchestrator 11 bước; liên kết dữ liệu xuyên suốt từ Tín hiệu Tiếp thị $\rightarrow$ Tư vấn Bán hàng $\rightarrow$ Chốt đơn $\rightarrow$ Chăm sóc sau bán.
* **Cổng P5 - Controlled Autonomous Operations (Vận hành Tự hành):** Đạt trạng thái tự hành toàn diện 24/7 có giám sát; tối ưu hóa chi phí token FinOps đạt chuẩn định mức 0.5–1.0 TWD/phiên; chuyển giao vận hành cho đội ngũ nội bộ.

---

## 2. Kế Hoạch Thi Công Chi Tiết 18 Bước Chuẩn Hóa

1. **Bước 1:** Khảo sát và thẩm định hiện trạng API của ERP, POS, WMS và các kênh mạng xã hội hiện hữu.
2. **Bước 2:** Thiết lập môi trường hạ tầng bảo mật, mạng riêng ảo và cụm cơ sở dữ liệu đối soát.
3. **Bước 3:** Chuẩn hóa và làm sạch dữ liệu danh mục sản phẩm, bảng giá và tài liệu tri thức nội bộ.
4. **Bước 4:** Xây dựng tầng tích hợp dữ liệu Customer 360 Ingestion Layer và bảng băm bảo mật định danh.
5. **Bước 5:** Triển khai hạ tầng Two-Stage RAG (BM25 + Dense Vector Search + Cross-Encoder Reranker).
6. **Bước 6:** Cấu hình và đóng băng Knowledge Base 5 ngành hàng, nạp từ điển từ cấm cho Brand Guardian.
7. **Bước 7:** Lập trình lõi điều phối Revenue Orchestrator 11 bước và cổng kiểm tra thẩm quyền AUTH-0..5.
8. **Bước 8:** Lập trình và kiểm thử lớp code cứng **Deterministic Policy Engine** khóa giá sàn $P_{floor}$.
9. **Bước 9:** Xây dựng hệ thống 9 Kỹ năng chuẩn (Skill Contracts) gắn Idempotency Key chống trùng lặp.
10. **Bước 10:** Phát triển giao diện Web Chat Widget (<20KB) và tích hợp các kênh LINE OA, Facebook, Zalo.
11. **Bước 11:** Tích hợp API bản đồ E-Map và cổng kết nối giao vận của 4 chuỗi bưu cục tiện lợi (CVS).
12. **Bước 12:** Xây dựng hệ thống 5 màn hình quản trị Human Command Center (SCR-001..SCR-005).
13. **Bước 13:** Cài đặt cơ chế cảnh báo đỏ Crisis Alert và chuyển giao người thật dưới 1.0 giây.
14. **Bước 14:** Chạy kiểm thử tự động toàn bộ 9 Kịch bản E2E Test Cases (TC-E2E-001..009) trên Staging.
15. **Bước 15:** Triển khai thử nghiệm Pilot nhóm sản phẩm FMCG và kiểm chứng luồng chốt đơn bưu cục CVS COD.
16. **Bước 16:** Triển khai thử nghiệm Pilot nhóm Xe máy điện thông minh và kiểm chứng luồng đặt lịch lái thử O2O.
17. **Bước 17:** Tối ưu hóa chi phí token AI (FinOps), kiểm soát bộ nhớ đệm Cache và tinh chỉnh độ trễ.
18. **Bước 18:** Nghiệm thu toàn diện theo DoD 10 tiêu chuẩn vàng và bàn giao kỹ thuật cho 7 nhóm chuyên môn.

---

## 3. Tiêu Chuẩn Nghiệm Thu DoD 10 Tiêu Chuẩn Vàng (Definition of Done)

Một tính năng hoặc phân hệ chỉ được nghiệm thu khi đạt đồng thời 10 tiêu chuẩn:
1. **Khớp hợp đồng:** Tuân thủ 100% Schema và dữ liệu bắt buộc (Reason + Evidence + Confidence).
2. **ERP Single Source of Truth:** Không có cơ sở dữ liệu giá/tồn kho chạy song song; 100% đọc từ ERP/POS.
3. **Bảo vệ giá sàn kịch khung:** Lớp code cứng ngoài LLM chặn đứng 100% các cuộc tấn công giá thấp hơn $P_{floor}$.
4. **Bảo vệ dữ liệu PDPA:** Mã hóa dữ liệu nhạy cảm, có cơ chế kiểm tra Consent và Suppression trước khi gửi tin.
5. **Hiệu năng độ trễ:** Tra cứu FAQ < 1.0s, gợi ý sản phẩm < 1.5s, chuyển giao người thật < 1.0s.
6. **An toàn thất bại (Fail-Closed):** Tự động ngắt các luồng chốt đơn khi mất kết nối hoặc dữ liệu thiếu minh bạch.
7. **Bao phủ kiểm thử:** Vượt qua 100% các ca kiểm thử chấp nhận E2E (TC-E2E-001..009).
8. **Định mức chi phí FinOps:** Chi phí token AI trung bình không vượt quá 1.0 TWD / phiên tư vấn thành công.
9. **Dấu vết kiểm toán (Audit Trail):** Ghi đầy đủ log cho mọi quyết định, lượt gọi kỹ năng và phê duyệt.
10. **Tài liệu bàn giao đầy đủ:** Có tài liệu vận hành và hướng dẫn xử lý sự cố cho đội ngũ chuyên môn.

---

## 4. Quy Trình Chuyển Giao 7 Mũi Chuyên Môn (Không Dùng RACI)

Bám sát quy chuẩn Mục 28 của SRS v0.1, chuyển giao kỹ thuật được phân bổ trực tiếp cho 7 nhóm chuyên trách:

1. **Business Analyst (BA):** Bàn giao tài liệu đặc tả nghiệp vụ, kịch bản hội thoại mẫu và ma trận quy tắc BR.
2. **Solution Architect (SA):** Bàn giao sơ đồ kiến trúc tổng thể, mô hình dữ liệu 6 Domain và cơ chế Orchestrator.
3. **AI Engineering:** Bàn giao bộ Prompt kiểm duyệt, pipeline Two-Stage RAG và các mô hình học tăng cường.
4. **Backend Engineering:** Bàn giao mã nguồn API Gateway, Deterministic Policy Engine, Skill Contracts và kết nối ERP.
5. **Frontend Engineering:** Bàn giao bộ mã nhúng Web Chat Widget, Slide-Over Cart và 5 màn hình Command Center.
6. **QA & Test Automation:** Bàn giao bộ test tự động 9 kịch bản E2E, scripts đo tải và checklist nghiệm thu DoD.
7. **Pilot Deployment Team:** Bàn giao kịch bản triển khai thực địa, tài liệu đào tạo nhân viên và quy trình tiếp quản.

---

## 5. Bộ 9 Kịch Bản Kiểm Thử Chấp Nhận E2E (TC-E2E-001..TC-E2E-009)

* **TC-E2E-001 (Lead to Opportunity):** Khách mới vào Web, xem 2 trang hàng $\rightarrow$ AI nhận diện nhu cầu, gợi ý sản phẩm và lấy consent hợp lệ.
* **TC-E2E-002 (Recommendation with Full Evidence):** Đề xuất từ SAL-03 bắt buộc xuất đủ 7 trường dữ liệu chuẩn; nếu thiếu bằng chứng $\rightarrow$ chặn không hiển thị.
* **TC-E2E-003 (Price Floor & Injection Defense):** Kẻ tấn công cố tình inject prompt đòi mua giá rẻ $\rightarrow$ Deterministic Policy Engine chặn đứng, từ chối mức giá dưới $P_{floor}$.
* **TC-E2E-004 (CVS COD Order Creation):** Khách chọn bưu cục qua E-Map $\rightarrow$ AI tạo đơn thành công trên ERP, giữ chỗ tồn kho nguyên tử.
* **TC-E2E-005 (Crisis Alert & Fast Takeover):** Khách bày tỏ bức xúc gay gắt $\rightarrow$ Bot dừng lại, bắn cảnh báo Telegram < 2 phút, nhân viên tiếp quản trên SCR-005 < 1.0s.
* **TC-E2E-006 (Out-of-Stock Rescue):** Khách hỏi sản phẩm hết hàng $\rightarrow$ AI tra cứu nhóm thay thế trên ERP và đề xuất giải pháp tương đương trong 0.5s.
* **TC-E2E-007 (MGM Referral Validation):** Khách nhập mã giới thiệu bạn bè $\rightarrow$ hệ thống đối soát chống trùng lặp số điện thoại, cấp voucher 30 TWD cho đơn bưu cục đầu tiên.
* **TC-E2E-008 (Fail-Closed on ERP Disconnect):** Mất kết nối API với ERP $\rightarrow$ AI ngắt lời tư vấn giá, thông báo bảo trì và chuyển hàng đợi người thật.
* **TC-E2E-009 (FinOps Token Budget Guard):** Đo lường phiên chat kéo dài $\rightarrow$ hệ thống tóm tắt ngữ cảnh (Summarization), bảo đảm chi phí token dưới 1.0 TWD.
