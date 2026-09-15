# TỔNG HỢP NGỮ CẢNH DỰ ÁN & LỊCH SỬ TRAO ĐỔI DÀNH CHO AI AGENT

> **HƯỚNG DẪN DÀNH CHO AI ĐỌC TÀI LIỆU NÀY:**  
> Bạn đang tiếp nhận một dự án chuyển giao kỹ thuật cấp Enterprise. Hãy đọc kỹ toàn bộ tài liệu này để nắm bắt 100% bối cảnh thực tế, ranh giới phạm vi, cấu trúc hệ thống và lịch sử yêu cầu của người dùng trước khi phản hồi.

---

## 1. BỐI CẢNH DỰ ÁN & BÀI TOÁN KINH DOANH THỰC TẾ
- **Chủ thể:** Chuỗi Siêu thị Bán lẻ Hàng hóa & Dịch vụ Tổng hợp phục vụ cộng đồng kiều bào (Việt Nam, Indonesia, Philippines, Thái Lan) tại Đài Loan.
- **Hạ tầng hiện hữu của doanh nghiệp:** Đã có sẵn Website thương mại điện tử, Mobile App bán hàng, hệ thống ERP/POS quản lý kho trung tâm, giá, hóa đơn và cổng kết nối giao nhận bưu cục tiện lợi (**7-Eleven, FamilyMart**).
- **Mục tiêu cốt lõi:** Đóng gói **3 Module Plug-and-Play (Marketing Automation - Sales Copilot 24/7 - Smart CSKH & Retention)** cắm vào Web/App/ERP sẵn có, biến thành một **AI Revenue Workforce** nội bộ vận hành xuyên suốt chu trình:
  $$\mathbf{Signal} \longrightarrow \mathbf{Customer\ 360} \longrightarrow \mathbf{Marketing} \longrightarrow \mathbf{Lead/Opp} \longrightarrow \mathbf{Sales} \longrightarrow \mathbf{Order} \longrightarrow \mathbf{CSKH} \longrightarrow \mathbf{Retention} \longrightarrow \mathbf{Outcome} \longrightarrow \mathbf{Learning}$$
- **Nguyên tắc Zero-Disruption:** ERP/POS/Web/App là **System of Record duy nhất**. Tuyệt đối không đập đi xây lại, không tạo cơ sở dữ liệu giao dịch song song.

---

## 2. RANH GIỚI PHẠM VI BẮT BUỘC (CONSTRAINTS & GUARDRAILS)
Khi xử lý các yêu cầu tiếp theo, AI **TUYỆT ĐỐI TUÂN THỦ** các ranh giới sau:
1. ❌ **KHÔNG gom đơn KTX / xưởng:** 100% bưu kiện giao nhận qua mạng lưới bưu cục tiện ích (7-Eleven, FamilyMart).
2. ❌ **KHÔNG thu cũ đổi mới xe điện:** Chỉ bán xe điện mới 100% và phụ tùng chính hãng (Ắc quy, cục sạc, săm lốp).
3. ❌ **KHÔNG làm ca đêm cục bộ:** AI tự hành vận hành **24/7 toàn thời gian**.
4. ❌ **KHÔNG dùng cụm từ "bạn cùng xưởng":** Chuẩn hóa thành **"Giới thiệu người mới (Member-Get-Member)"**.
5. ❌ **KHÔNG đưa ra các con số ước đoán tùy tiện hay ép mốc tuần/tháng:** Quản trị tiến độ bằng **6 Phân kỳ Gate Kỹ thuật (P0 ➔ P5)** và nghiệm thu theo tiêu chuẩn **Definition of Done (DoD 10 tiêu chí)**.
6. ❌ **KHÔNG dùng Ma trận RACI (A-R-C-I) sáo rỗng:** Bàn giao kỹ thuật theo 7 mũi chuyên môn (BA, Solution Architect, AI Engineering, Backend, Frontend, QA, Pilot).
7. ❌ **KHÔNG lan man, lý thuyết sách vở:** Mọi tài liệu phải chuẩn theo cấu trúc Đề bài gốc của Sếp (`AI-REV-SRS-001`).

---

## 3. CÁC HỒ SƠ QUY CHUẨN ĐANG CÓ TRONG HỆ THỐNG
1. **File Kế hoạch Triển khai Master mới nhất (Khuyên dùng đọc chính):**  
   `KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.md` (và bản in `KE_HOACH_TRIEN_KHAI_HE_THONG_AI_AGENT_SRS_001.pdf`).
   - Gồm 12 phần kỹ thuật hoàn chỉnh: Bối cảnh, Thuật toán P_floor, Sequence Flows, Danh mục tính năng & Hội thoại mẫu, Data Dictionary 6 Domain, Skill Contracts, Thẩm quyền AUTH-0..5 & 10 Business Rules, Lộ trình 6 Gate & 18 bước thi công, Two-Stage RAG & FinOps, Bảo mật phòng vệ, 9 Kịch bản E2E Test Cases, 5 Màn hình Command Center, DoD và Handoff.
2. **File Đề bài gốc của Sếp:**  
   `De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md` (Mã tài liệu: `AI-REV-SRS-001`, gồm 28 điều khoản).
3. **Mã nguồn dự án trên GitHub:**  
   `https://github.com/Vuductai2004/sale` (Nhánh `main`).

---

## 4. TÓM TẮT LỊCH SỬ CÁC LẦN TRAO ĐỔI & YÊU CẦU CỦA USER
1. **Lần 1:** User yêu cầu lập báo cáo và kế hoạch từ đề bài của Sếp (`AI-REV-SRS-001`). Cảnh báo lỗi công thức toán và loại bỏ các ghi chú nhắc việc thừa.
2. **Lần 2:** Khẳng định bối cảnh: Doanh nghiệp đã có sẵn Web/App/ERP riêng tại Đài Loan, không phải bán phần mềm SaaS B2B hay plugin Shopee.
3. **Lần 3:** Khóa chặt 5 ranh giới cấm: Không gom đơn KTX, Không thu cũ xe điện, AI 24/7, Giới thiệu người mới, Không ép tuần/tháng mà dùng Gate P0-P5.
4. **Lần 4:** Bổ sung chi tiết kỹ thuật chuyên sâu: Sequence flows, kịch bản hội thoại mẫu thực tế, Data Dictionary 6 domain, Skill contracts, 18 bước thi công tuần tự, 9 test cases E2E chuẩn Given-When-Then.
5. **Lần 5:** User phát hiện Phần XII có bảng Ma trận RACI bị thừa thãi, lan man ➔ Đã loại bỏ 100% Ma trận RACI, chuẩn hóa Phần XII bám sát Điều 18 (5 màn hình Command Center), Điều 27 (DoD 10 tiêu chuẩn vàng), Điều 28 (Handoff 7 nhóm chuyên môn) của Đề bài Sếp.
6. **Lần 6:** Đã biên dịch toàn bộ ra PDF và đồng bộ lên GitHub nhánh `main`.
