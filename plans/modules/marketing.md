# Phân Hệ Marketing Automation (Signals & Acquisition)

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Mô-đun:** Marketing Automation  
> **Điều phối trung tâm:** Revenue Orchestrator · **Thẩm quyền:** AUTH-1 đến AUTH-4  
> **Kênh tiếp cận:** Web Chat, Facebook, LINE OA, Zalo OA, TikTok Shop

---

## 1. Mục Tiêu & Ranh Giới Nghiệp Vụ (Marketing Boundaries)

Phân hệ Tiếp thị vận hành với mục tiêu: **Chủ động lắng nghe tín hiệu thị trường, nuôi dưỡng nhận diện thương hiệu, tiếp nhận nhu cầu và chuyển hóa traffic thành cơ hội bán hàng (Lead/Opp) có bằng chứng** (khớp mục tiêu **OBJ-001** trong SRS v0.1).

### Ranh giới nghiệp vụ:
1. **Tuân thủ quy định tiếp thị:** Mọi thông điệp xuất bản ra bên ngoài đều phải qua bộ lọc kiểm duyệt **MKT-04 Brand Guardian** để đối soát từ cấm, cam kết sai lệch và chính sách bảo vệ người tiêu dùng.
2. **Quyền riêng tư & Chống spam:** Chỉ gửi tin nhắn chủ động tới khách hàng khi có đồng thuận (Consent) hợp lệ theo Đạo luật Bảo vệ Dữ liệu Cá nhân (Taiwan PDPA) (**BR-004**). Tự động kiểm tra trạng thái Consent và danh sách hạn chế (Suppression List) trước khi gửi tin, tự động ngừng khi khách từ chối.
3. **Chuẩn hóa ngôn từ:** Sử dụng thuật ngữ thương mại chuẩn xác **"Chương trình Giới thiệu người mới (Member-Get-Member Referral)"**, tuyệt đối không dùng cụm từ thiếu chuyên nghiệp.

---

## 2. Hệ Thống 6 Marketing Sub-Agents (MKT-01..06)

| Mã Agent | Tên Agent | Nhiệm vụ cốt lõi & Tiêu chuẩn SRS | Thẩm quyền | Đầu vào chính | Đầu ra chuẩn |
|---|---|---|---|---|---|
| **MKT-01** | Campaign Strategist | **FR-MKT-001 - MUST:** Phân tích tín hiệu thị trường (ngày lễ Tết, mùa vụ, ngày lương mùng 10) để đề xuất chiến lược tiếp thị | AUTH-1 (Recommend) | Lịch mùa vụ, xu hướng tìm kiếm, tồn kho kho vận | Kế hoạch chiến dịch kèm dự báo ngân sách, ROI |
| **MKT-02** | Audience Segmenter | **FR-MKT-002 - MUST:** Phân khúc tập khách hàng dựa trên hành vi thực tế trên Customer 360, gắn thẻ hành vi chuẩn hóa | AUTH-2 (Draft) | Dữ liệu sự kiện Web/App, lịch sử mua hàng ERP | Danh sách phân khúc hợp lệ kèm điều kiện lọc |
| **MKT-03** | Creative & Copywriter | **FR-MKT-003 - MUST:** Sinh nội dung quảng cáo, kịch bản tin nhắn, thông điệp cá nhân hóa đa ngữ điệu theo từng phân khúc | AUTH-2 (Draft) | Đề bài chiến dịch, thông điệp chính, hồ sơ phân khúc | Bản thảo nội dung đa kênh (Web, LINE, Zalo, FB) |
| **MKT-04** | Brand Guardian | **FR-MKT-004 - MUST:** Kiểm duyệt tự động 100% nội dung, đối soát từ cấm, chính sách bảo hành, cam kết giá và an toàn thương hiệu | AUTH-5 (Block) / AUTH-1 (Pass) | Bản thảo nội dung từ MKT-03, từ điển chính sách | Kết quả kiểm duyệt (Pass / Block kèm lý do vi phạm) |
| **MKT-05** | Campaign Dispatcher | Điều phối phát lệnh gửi tin nhắn đa kênh theo lịch trình, áp dụng quy tắc chống trùng lặp và giới hạn tần suất | AUTH-3 (trong ngân sách) / AUTH-4 (ngân sách lớn) | Chiến dịch đã duyệt từ MKT-04, danh sách khách | Lệnh gửi tin kèm Unique Execution ID (**BR-005**) |
| **MKT-06** | Marketing Analyst | Đo lường hiệu quả chiến dịch: tỷ lệ mở, click, chuyển đổi thành Lead/Opp, chi phí trên mỗi đơn hàng (CAC) | AUTH-0 (Observe) | Số liệu tracking sự kiện, đơn hàng ERP đối soát | Báo cáo phân tích hiệu quả định lượng, khuyến nghị |

---

## 3. Danh Mục Tính Năng Mũi Nhọn Thực Chiến (MKT-KEY)

### MKT-KEY-01: Exit-Intent Recovery Popup (Giữ Chân Khách Chuẩn Bị Thoát)
* **Cơ chế kích hoạt:** Thuật toán theo dõi gia tốc chuột di chuyển hướng về nút đóng trình duyệt trên Desktop, hoặc cử chỉ vuốt ngược màn hình liên tục trên Mobile.
* **Hành động:** Kích hoạt popup thông minh với thông điệp trúng tâm lý: *"Khoan đã bạn ơi! Bưu cục tiện lợi gần chỗ bạn đang có suất freeship cho đơn hàng hôm nay, bấm xem ngay danh mục đặc sản mới về nhé!"*.

### MKT-KEY-02: Interactive Quiz 30s (Trắc Nghiệm Khám Phá Nhu Cầu)
* **Cơ chế tương tác:** Widget trắc nghiệm dạng 3 nút bấm trực quan:
  * *Bước 1 - Nhu cầu:* Đặc sản quê hương / Nạp data SIM / Xe máy điện thông minh.
  * *Bước 2 - Ngân sách:* Dưới 500 TWD / 500–1.000 TWD / Trên 1.000 TWD.
  * *Bước 3 - Ưu tiên:* Giao nhanh trong ngày / Bán chạy nhất / Ưu đãi lớn nhất.
* **Kết quả:** AI phân tích và đề xuất đúng **2 sản phẩm tối ưu theo nhu cầu** trong vòng 15 giây, điều hướng thẳng vào giỏ hàng trượt.

### MKT-KEY-03: Member-Get-Member Referral (Giới Thiệu Người Mới Cùng Nhận Ưu Đãi)
* **Cơ chế lan tỏa:** Kiều bào đang sử dụng dịch vụ chia sẻ mã giới thiệu cho bạn bè, người mới sang Đài Loan hoặc du học sinh mới nhập học.
* **Lợi ích hai chiều:** Cả người giới thiệu và người được giới thiệu đều nhận **mã giảm giá 30 TWD** cho đơn hàng nhận tại bưu cục tiện lợi đầu tiên. Hệ thống tự động đối chiếu số điện thoại và địa chỉ bưu cục để chống gian lận tự tạo tài khoản ảo.

---

## 4. Tính Năng Bổ Trợ Mở Rộng

* **Brand Guardian tự động:** Đối soát danh mục từ cấm liên quan đến y tế, thực phẩm chức năng và cam kết sai lệch chính sách trước khi xuất bản chiến dịch.
* **Móc chuyển đổi RAG thủ tục sang đơn hàng:** Tận dụng cổng hỏi đáp thủ tục cư trú (thẻ cư trú ARC, bảo hiểm y tế BHYT Đài Loan) miễn phí để tặng voucher chào mừng 20 TWD chuyển đổi thành đơn hàng tiêu dùng thiết yếu đầu tiên.
