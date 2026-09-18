# Phân Hệ Smart CSKH & Retention 24/7 (Care & Retention)

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Mô-đun:** Smart Customer Support & Retention  
> **Điều phối trung tâm:** Revenue Orchestrator · **Thẩm quyền:** AUTH-0 đến AUTH-3 (Chuyển người thật AUTH-4)  
> **Kênh hỗ trợ:** Web Chat, Facebook Messenger, LINE OA, Zalo OA

---

## 1. Mục Tiêu & Ranh Giới Nghiệp Vụ (Support Boundaries)

Phân hệ Chăm sóc Khách hàng vận hành tự hành 24/7 với mục tiêu: **Giải quyết sự cố nhanh chóng, tra cứu thông tin chính xác, chủ động trấn an giao vận và kích hoạt chu kỳ chăm sóc sau bán nhằm tối đa hóa vòng đời khách hàng (LTV)** (khớp mục tiêu **OBJ-003** và **OBJ-004** trong SRS v0.1).

### Ranh giới nghiệp vụ:
1. **An toàn thất bại (Fail-Closed NFR-008):** Tuyệt đối không suy đoán tình trạng vận đơn hoặc số dư thanh toán. Mọi dữ liệu tra cứu phải có bằng chứng từ API đối tác bưu cục (CVS) và hóa đơn ERP.
2. **Nguyên tắc ngắt lời khi có xung đột:** Khi khách hàng bực tức, khiếu nại chất lượng hoặc đòi gặp nhân viên, AI phải lập tức **dừng toàn bộ kịch bản bán hàng** để tập trung giải quyết khiếu nại hoặc chuyển giao người thật dưới 1.0 giây.
3. **Tuân thủ quy trình giao nhận bưu cục:** Mọi thông tin hướng dẫn nhận hàng, đổi điểm nhận đều bám sát quy chuẩn của 4 chuỗi bưu cục tiện lợi Đài Loan (7-Eleven, FamilyMart, Hi-Life, OK Mart).

---

## 2. Hệ Thống 2 Sub-Agents CSKH Chuẩn SRS (CS-01 & CS-02)

### 2.1. CS-01 - Omnichannel Customer Care Agent
Tiếp nhận và xử lý tương tác đa kênh 24/7. Nhận diện tối thiểu 10 nhóm Intent chuẩn (**FR-CS-001 - MUST**):
1. **Hỏi thông tin sản phẩm (Product Info):** Công dụng, hướng dẫn sử dụng đã qua kiểm duyệt.
2. **Tra cứu giá & khuyến mãi (Price & Promotions):** Bảng giá niêm yết chính thức từ ERP.
3. **Kiểm tra tồn kho (Stock Availability):** Khả dụng thực tế tại kho vận.
4. **Trạng thái đơn hàng (Order Status):** Xác nhận đơn, mã vận đơn, hành trình bưu kiện.
5. **Giao hàng & vận chuyển (Shipping Tracking):** Điểm nhận hàng bưu cục tiện lợi (CVS).
6. **Đổi / Trả / Bảo hành (Return & Refund):** Quy trình trả hàng, kích hoạt bảo hành phụ tùng xe.
7. **Xử lý sự cố thanh toán (Payment Issue):** Trùng lệnh, lỗi thanh toán thẻ hoặc tiền mặt CVS COD.
8. **Tiếp nhận khiếu nại (Complaint Management):** Bưu phẩm móp méo, giao chậm trễ.
9. **Hướng dẫn kỹ thuật (Technical Support):** Lắp sạc xe điện, nạp thẻ data SIM.
10. **Yêu cầu gặp nhân viên (Human Escalation):** Vượt thẩm quyền hoặc khách yêu cầu người thật.

### 2.2. CS-02 - Retention / Customer Success Agent
Chủ động phát hiện nguy cơ rời bỏ hoặc cơ hội tái tiêu dùng qua quy trình 6 bước chuẩn (**FR-CS-003 - MUST**):
$$\text{[Signal]} \longrightarrow \text{[Hypothesis]} \longrightarrow \text{[Recommended Action]} \longrightarrow \text{[Eligibility Check]} \longrightarrow \text{[Execution / Approval]} \longrightarrow \text{[Outcome]}$$

* **Ranh giới CS-02 và SAL-05:** CS-02 đóng vai trò cảm biến phát hiện tín hiệu mua lại và đẩy sự kiện sang Revenue Orchestrator. CS-02 tuyệt đối không tự ý phát lệnh gửi tin nhắn bán hàng độc lập để ngăn chặn vi phạm gửi trùng lặp (**BR-006**).

---

## 3. Hệ Thống Quản Lý Vụ Việc (Case Management State Machine)

Mọi yêu cầu hỗ trợ hoặc khiếu nại đều được theo dõi dưới dạng Case có cấu trúc, vận hành theo State Machine chuẩn bao gồm đường chuyển tiếp mở lại vụ việc (REOPENED):

```text
[NEW] ──► [CLASSIFIED] ──► [ASSIGNED] ──► [IN_PROGRESS] ──► [WAITING_CUSTOMER] ──► [RESOLVED] ──► [CLOSED]
                                │               ▲                    │                 │             │
                                └───────────────┴────────────────────┘                 │             │
                                                ▲                                      │             │
                                                └─────────────── [REOPENED] ◄──────────┴─────────────┘
                                                      (Khách khiếu nại tiếp / chưa thỏa mãn)
```

---

## 4. Danh Mục Tính Năng Mũi Nhọn Thực Chiến (CS-KEY)

### CS-KEY-01: Quick Action Chips 0.5s (Gợi Ý Câu Hỏi Nhanh Theo Ngữ Cảnh)
* Khi khách mở khung chat tại bất kỳ trang sản phẩm nào, hệ thống tự động bung sẵn **3 nút bấm câu hỏi phổ biến nhất** trong vòng 0.5 giây:
  * Ví dụ tại trang Xe máy điện: `[Bảo hành xe & ắc quy thế nào?]`, `[Phí ship về bưu cục bao nhiêu?]`, `[Có sẵn sạc 4 bình không?]`.
* Khách bấm 1-chạm nhận ngay câu trả lời chuẩn xác mà không cần gõ chữ.

### CS-KEY-02: Báo Động Đỏ Crisis Alert & Human Takeover ≤ 1.0s (Chuyển Giao Người Thật Tức Thì)
* **Kích hoạt tức thời:** Khi phát hiện khách hàng giận dữ, dùng từ ngữ bức xúc, khiếu nại giao sai hàng hoặc chủ động đòi gặp nhân viên:
  * AI **ngắt lời ngay lập tức**, phát thông điệp xoa dịu trung thực: *"Em đã chuyển ngay hội thoại đến quản lý phụ trách, anh/chị đợi em trong giây lát nhé ạ!"*.
  * Gửi cảnh báo khẩn qua Telegram Bot đến nhóm quản trị trong vòng **dưới 2 phút**.
  * Nhân sự mở màn hình **SCR-005 Conversation Console**, bấm nút tiếp quản và giành quyền trò chuyện trong vòng **dưới 1.0 giây**. Toàn bộ lịch sử tóm tắt được bàn giao trọn vẹn, nhân viên không bắt khách phải giải thích lại từ đầu.

### CS-KEY-03: Lịch Chăm Sóc SIM 30 Ngày & Xe Điện 30–90 Ngày
* Tự động đếm ngày từ hóa đơn ERP:
  * **Cước SIM Kiều bào:** Đếm đến ngày thứ 27 kể từ lần nạp trước $\rightarrow$ gửi tin nhắn nhắc nạp data 30 ngày kèm hướng dẫn 1-chạm trước khi SIM bị khóa chiều gọi.
  * **Xe máy điện thông minh mới:** Đếm đến ngày thứ 30 và 90 sau khi nhận xe $\rightarrow$ gửi tin nhắn hỏi thăm tình trạng vận hành, nhắc kiểm tra áp suất lốp, độ mòn má phanh và cách sạc bảo dưỡng ắc quy bền lâu.

---

## 5. Danh Mục Tính Năng Bổ Trợ Mở Rộng

* **Tra cứu vận đơn bưu cục tiện lợi tự động:** Khách gõ số điện thoại hoặc mã đơn hàng $\rightarrow$ AI gọi API hệ thống logistics bưu cục lấy mã vận đơn và hành trình chi tiết (đang xuất kho, đã tới bưu cục chờ nhận).
* **Điều phối & Trấn an bưu kiện khi có bão lũ (Typhoon Day):** Khi chính quyền địa phương phát lệnh nghỉ bão (停班停課) và bưu cục hoãn giao, hệ thống tự động lọc các đơn hàng trên tuyến ảnh hưởng và gửi tin nhắn trấn an khách trước khi khách lo lắng.
* **Hướng dẫn mở hộp 3 bước:** Cung cấp ảnh chụp và hướng dẫn kiểm tra kiện hàng ngay tại quầy bưu cục tiện lợi để đảm bảo quyền lợi đổi trả nếu có móp méo.

---

## 6. Kịch Bản Thực Chiến Mẫu: Báo Động Đỏ & Chuyển Giao Người Thật (CS-KEY-02)

* **Khách hàng:** *"Shop làm ăn kiểu gì thế hả? Bưu kiện bánh pía nhận ở bưu cục về mở ra hộp bị bẹp dúm nát hết bánh rồi! Bực mình quá, gọi người thật ra nói chuyện ngay!"*
* **AI CSKH (Phát hiện Crisis Intent ➔ Dừng kịch bản, kích hoạt Báo động đỏ):**  
  *"Dạ em vô cùng xin lỗi anh vì sự cố bưu phẩm bị chèn ép trong quá trình vận chuyển bưu cục khiến bánh bị hỏng ạ! Em hiểu cảm xúc bực mình của anh lúc này. Em đã ngắt bot và chuyển quyền ưu tiên cao nhất tới Quản lý hỗ trợ khách hàng ngay bây giờ. Anh giữ nguyên hộp bánh giúp em, chuyên viên bên em sẽ vào xử lý bù hàng mới ngay trong 1 phút tới ạ!"*
* **Hệ thống chạy ngầm:**
  * Bắn cảnh báo Telegram khẩn cấp: `[CRISIS ALERT] Khách hàng khiếu nại bưu phẩm dập nát - Đơn hàng #TW-88291 - Mức độ: Khẩn cấp`.
  * Tại màn hình quản trị **SCR-005**, Trưởng ca trực bấm nút `[Tiếp quản hội thoại]` trong **0.6 giây**.
* **Nhân viên hỗ trợ (Human):**  
  *"Chào anh Hùng, em là Linh - Trưởng ca hỗ trợ của shop đây ạ. Em đã xem ngay ảnh sự cố kiện hàng của anh. Bên em sẽ gửi bù ngay 1 hộp Bánh Pía mới tinh miễn phí 100% về bưu cục cho anh chiều nay và làm việc lại với bên vận chuyển. Anh cho em xác nhận lại số điện thoại để em gửi mã vận đơn mới cho anh nhé ạ!"*
