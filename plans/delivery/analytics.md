# Hệ Thống Chỉ Số Đo Lường (KPIs), Thuật Toán Giá Sàn ($P_{floor}$) & Quản Trị FinOps

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Phân hệ:** Analytics, Economics & FinOps  
> **Khung đo lường:** 5 Nhóm chỉ số chuẩn hóa (Mục 20 SRS)  
> **Thuật toán kinh tế:** Deterministic Floor Price Formula & Atomic Budget Hold

---

## 1. Hệ Thống Chỉ Số Đo Lường 5 Nhóm Chuẩn SRS (Mục 20)

Toàn bộ hoạt động của hệ thống AI được định lượng qua 5 nhóm chỉ số hiệu năng cốt lõi:

### 1. Nhóm Chỉ Số Kinh Doanh Doanh Nghiệp (Business Outcome KPIs)
* **AI-Attributed Revenue:** Doanh thu bán hàng phát sinh trực tiếp từ các phiên hội thoại và đề xuất của AI.
* **Return on Investment (ROI):** Tỷ suất hoàn vốn đầu tư dựa trên mức tăng trưởng doanh thu so với chi phí triển khai và vận hành hệ thống.
* **Customer Acquisition Cost (CAC):** Chi phí thu hút một khách hàng mới thông qua các kênh tự động hóa của AI.
* **Average Order Value (AOV):** Giá trị đơn hàng trung bình sau khi áp dụng các đề xuất mua thêm và combo sản phẩm.

### 2. Nhóm Chỉ Số Tiếp Thị (Marketing Performance KPIs)
* **Message Open & Click-Through Rate (CTR):** Tỷ lệ mở tin nhắn và bấm vào liên kết trên các kênh LINE, Zalo.
* **Lead Conversion Rate:** Tỷ lệ người xem trang chuyển đổi thành đầu mối mua hàng tiềm năng (Lead/Opp).
* **Referral Viral Coefficient ($K$-Factor):** Hệ số lan tỏa của chương trình Giới thiệu người mới (Member-Get-Member).

### 3. Nhóm Chỉ Số Bán Hàng (Sales Performance KPIs)
* **Lead-to-Order Conversion Rate:** Tỷ lệ đầu mối được AI tư vấn chuyển đổi thành đơn hàng thành công trên ERP.
* **Cart Recovery Rate:** Tỷ lệ phục hồi giỏ hàng bỏ quên thành công thông qua trợ lý SAL-04.
* **Recommendation Conversion Rate:** Tỷ lệ khách hàng đồng ý mua các sản phẩm gợi ý bán kèm, bán chéo hoặc sản phẩm thay thế.
* **Sales Cycle Duration:** Thời gian trung bình từ lúc khách bắt đầu hỏi đến khi hoàn tất chốt đơn (mục tiêu: dưới 3 phút).

### 4. Nhóm Chỉ Số Chăm Sóc Khách Hàng (Customer Support KPIs)
* **First Contact Resolution (FCR):** Tỷ lệ giải quyết sự cố và trả lời thắc mắc thành công ngay từ câu trả lời đầu tiên (> 85%).
* **First Response Time (FRT):** Thời gian phản hồi ban đầu của AI (đạt chuẩn < 1.0 giây).
* **Human Escalation Rate:** Tỷ lệ các cuộc hội thoại phức tạp phải chuyển giao cho nhân sự xử lý (duy trì < 5%).
* **Customer Satisfaction Score (CSAT):** Điểm đánh giá mức độ hài lòng của khách sau phiên hỗ trợ (mục tiêu > 4.6 / 5.0).

### 5. Nhóm Chỉ Số Chất Lượng & Chi Phí AI (AI Quality & FinOps KPIs)
* **Hallucination Rate:** Tỷ lệ AI trả lời sai thông số kỹ thuật hoặc bịa đặt chính sách (mục tiêu: tuyệt đối < 0.1%).
* **Latency P95 / P99:** Độ trễ phản hồi của hệ thống ở phân vị 95% (< 1.5s) và 99% (< 2.5s).
* **Average Token Cost Per Session:** Chi phí token AI trung bình trên mỗi phiên hội thoại hoàn chỉnh (ngân sách định mức 0.5 – 1.0 TWD).

---

## 2. Bản Chất Kinh Tế Đơn Vị & Thuật Toán Khóa Cứng Giá Sàn ($P_{floor}$)

### 2.1. Bản chất kinh tế của Quỹ trợ cấp động
Trong mô hình bán lẻ truyền thống, chi phí thuê nhân viên trực chat, hoa hồng bán hàng và telesales thường chiếm từ **5% đến 10%** giá trị đơn hàng. 
Hệ thống AI tự hành vận hành 24/7 giúp tiết kiệm phần lớn khoản chi phí nhân sự này. Doanh nghiệp trích lại một phần khoản tiết kiệm đó (khoảng **3% đến 5%**) để chuyển hóa thành **Quỹ trợ cấp chốt đơn động (AI Dynamic Subsidy)**, trao quyền cho AI giảm giá trực tiếp cho khách hàng nhạy cảm về giá mà không làm suy giảm biên lợi nhuận ròng của công ty.

### 2.2. Công thức toán học xác định giá sàn $P_{floor}$
Mọi mức giá $P$ mà AI đưa ra đều phải tuân thủ điều kiện không vượt quá trần giảm giá $D_{cap}$ và bảo đảm mức lãi đóng góp tối thiểu $L$:

$$P = P_{base} - D; \quad \text{với } 0 \le D \le D_{cap}$$

$$\text{Lãi đóng góp} = P \times (1 - r) - C \ge L$$

Từ đó, mức giá sàn tuyệt đối mà máy chủ cho phép bán được xác định bằng công thức:

$$P_{floor} = \max\left(\frac{C + L}{1 - r},\; P_{base} - D_{cap}\right)$$

*Trong đó:*
* $P_{base}$: Giá niêm yết chính thức của sản phẩm trên ERP (chưa thuế và phí vận chuyển).
* $C$: Chi phí biến đổi trên mỗi đơn hàng (giá vốn hàng bán COGS, chi phí vận hành token AI 0.5–1 TWD, chi phí đóng gói, rủi ro hoàn hủy).
* $r$: Tỷ lệ chi phí tính theo phần trăm doanh thu (phí xử lý cổng thanh toán thẻ / ví điện tử).
* $L$: Biên lãi ròng tối thiểu bắt buộc trên mỗi đơn hàng do Ban Giám đốc phê duyệt.
* $D_{cap}$: Hạn mức giảm giá tối đa cho phép trên sản phẩm đó.

### 2.3. Quy trình giữ chỗ ngân sách nguyên tử (Atomic Budget Hold)
1. **Kiểm tra điều kiện:** Khi khách hàng đồng ý mức giá mặc cả $P_{offered} \ge P_{floor}$, hệ thống kiểm tra ngân sách trợ cấp khả dụng.
2. **Khóa giữ chỗ (TTL 10 phút):** Hệ thống thực hiện thao tác khóa giữ chỗ nguyên tử (Atomic Hold) trong cơ sở dữ liệu để bảo lưu mức giá trong đúng 10 phút.
3. **Phát hành Token HMAC:** Tạo báo giá gắn mã chữ ký bảo mật gửi xuống giao diện giỏ hàng trượt.
4. **Cam kết hoặc Hoàn trả:** Nếu khách xác nhận đơn trong 10 phút, ngân sách được ghi nhận là đã sử dụng. Nếu quá 10 phút mà khách không chốt đơn, mã báo giá tự động hủy và ngân sách được hoàn trả về quỹ chung.

---

## 3. Chiến Lược Quản Trị Chi Phí Vận Hành AI (FinOps)

Để đảm bảo hiệu quả kinh tế lâu dài, chi phí gọi API LLM được kiểm soát nghiêm ngặt:
* **Định mức trần:** Tối đa **0.5 – 1.0 TWD / phiên tư vấn hoàn chỉnh** (tương đương ~400 – 800 VNĐ).
* **Bộ nhớ đệm thông minh (Semantic Prompt Caching):** Đối với các câu hỏi FAQ và tra cứu thông số sản phẩm phổ biến, hệ thống sử dụng bộ nhớ đệm để trả lời ngay lập tức mà không cần gọi lại LLM, giảm 70% chi phí token.
* **Tối ưu hóa ngữ cảnh (Context Compression):** Khi cuộc hội thoại kéo dài quá 8 lượt trao đổi, hệ thống tự động tóm tắt các điểm chính (nhu cầu, sản phẩm đã chọn, địa chỉ bưu cục) thành 3 dòng ngắn gọn trước khi đưa vào ngữ cảnh mới.
