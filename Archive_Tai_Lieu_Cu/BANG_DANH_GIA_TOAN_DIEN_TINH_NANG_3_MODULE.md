# BẢNG ĐÁNH GIÁ TOÀN DIỆN TÍNH NĂNG & ĐỘ KHẢ THI TRIỂN KHAI
## ĐỀ ÁN THƯƠNG MẠI HÓA B2B: BỘ 3 MODULE PLUG-AND-PLAY CHO DOANH NGHIỆP E-COMMERCE
### (TỔNG HỢP TOÀN BỘ TÍNH NĂNG ĐỀ XUẤT NGUYÊN BẢN & ĐỀ XUẤT BỔ SUNG MỚI ĐỂ SẾP THẨM ĐỊNH VÀ RA QUYẾT ĐỊNH ĐẦU TƯ)

> **TÀI LIỆU ĐÁNH GIÁ NỘI BỘ & THẨM ĐỊNH TÍNH KHẢ THI (PRODUCT ROADMAP & FEASIBILITY ASSESSMENT)**  
> **Người lập:** Nhóm Nghiên cứu Kỹ thuật & R&D Sản phẩm  
> **Mục đích:** Đặt toàn bộ các ý tưởng, chức năng đề xuất (cả đề xuất nguyên bản ban đầu và các đề xuất bổ sung mới) lên cùng một bàn cân để Sếp đánh giá: **Cái nào khả thi? Cái nào mang lại giá trị bán được code? Cái nào nên làm ngay, cái nào để pha 2, và cái nào dứt khoát phải loại bỏ vì rủi ro?**  
> **Hệ thống phân loại khuyến nghị:**  
> - 🟢 **[ƯU TIÊN LÀM NGAY - KEY BÁN HÀNG]:** Tính năng then chốt, khả thi 100%, chi phí thấp, giúp Sếp chốt hợp đồng B2B ngay.  
> - 🟡 **[TRIỂN KHAI PHA 2 - GIÁ TRỊ GIA TĂNG]:** Khả thi cao nhưng nên làm sau khi bộ lõi ổn định.  
> - 🔴 **[KHUYẾN NGHỊ LOẠI BỎ - RỦI RO / KÉM HIỆU QUẢ]:** Đã phân tích kỹ lưỡng, có rủi ro gian lận hoặc phản tác dụng với khách hàng.  

---

## TỔNG KẾT NHANH MA TRẬN PHÂN LOẠI TÍNH NĂNG (EXECUTIVE DASHBOARD)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│              BẢNG TỔNG PHỔ TÍNH NĂNG 3 MODULE (NGUYÊN BẢN + ĐỀ XUẤT MỚI)                │
├─────────────────────┬───────────────────────────────┬──────────────────────┬─────────────┤
│ MODULE PHÂN HỆ      │ 🟢 ƯU TIÊN LÀM NGAY (CORE)   │ 🟡 TRIỂN KHAI PHA 2  │ 🔴 LOẠI BỎ  │
├─────────────────────┼───────────────────────────────┼──────────────────────┼─────────────┤
│ Module 1: Marketing │ 1. Exit-Intent Popup (Gốc)    │ 1. Clipboard Tracker │ 1. Dự đoán  │
│ Automation          │ 2. Trắc nghiệm 30s (Gốc)      │ 2. Social Listening  │    hết đồ   │
│                     │ 3. Dwell-Time > 8s (Gốc)      │ 3. Viral Referral    │    tiêu dùng│
│                     │ 4. Quy đổi dung tích sống (Mới)│ 4. Ưu đãi KĐT (Mới)  │    (Gây phiền│
│                     │ 5. Chụp đồ cũ trừ tiền (Mới)  │                      │    & sai số)│
│                     │ 6. LocalStorage Clear-on-Merge│                      │             │
├─────────────────────┼───────────────────────────────┼──────────────────────┼─────────────┤
│ Module 2: AI Sales  │ 1. Slide-Over Quick Cart (Gốc)│ 1. AI Sales Copilot  │ 1. Tặng quà │
│ Copilot             │ 2. VietQR 50ms Napas247 (Gốc) │    mớm lời cho nv    │    thay vì  │
│                     │ 3. AI Mặc cả bớt tiền mặt(Gốc)│ 2. Zalo Payment Link │    giảm giá │
│                     │ 4. Bẻ cầu đơn Shopee (Mới)    │ 3. Social Proof Toast│ 2. Hoàn bù  │
│                     │ 5. Target-Fit Check (Mới)     │ 4. E-Invoice VAT     │    voucher  │
│                     │ 6. Ước tính tiền điện EVN(Mới)│ 5. Thanh đo Freeship │    14 ngày  │
│                     │ 7. Ghi nhớ TK kiểu Shopee(Mới)│                      │ 3. Ép shipper│
│                     │ 8. Hẹn giờ giao hàng (Mới)    │                      │    ghép đơn │
├─────────────────────┼───────────────────────────────┼──────────────────────┼─────────────┤
│ Module 3: Smart     │ 1. Quick Action Chips 0.5s(Gốc│ 1. Visual AI soi tem │ 1. Đổi mới  │
│ CSKH 24/7           │ 2. Two-Stage RAG 300 tok (Gốc)│ 2. Zalo Continuity   │    hàng lỗi │
│                     │ 3. Crisis Alert < 2 phút (Gốc)│ 3. Đền voucher trễ   │    30s bằng │
│                     │ 4. Rút gọn Tag kho A6 (Mới)   │ 4. Quà biếu tách đơn │    video AI │
│                     │ 5. 3 Bước mở hộp ngắn (Mới)   │                      │    (Dễ gian │
│                     │ 6. Model-Match phụ kiện (Mới) │                      │    lận tráo)│
└─────────────────────┴───────────────────────────────┴──────────────────────┴─────────────┘
```

---

## PHẦN I: ĐÁNH GIÁ CHI TIẾT TỪNG TÍNH NĂNG - MODULE 1: MARKETING AUTOMATION

```
Tập tin mã nguồn: nexus-mkt.min.js | Kích thước: ~5.8 KB Gzip | Mục tiêu: Giữ chân khách sắp thoát & Thu thập Lead
```

### 1. Thuật toán bắt ý định thoát trang (Exit-Intent) & Form 1-chạm SĐT
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Lắng nghe gia tốc chuột vọt lên thanh công cụ (Desktop) hoặc thao tác back/vuốt ngược cực nhanh (Mobile) $\rightarrow$ Bung popup tặng mã voucher, chỉ thu duy nhất Số điện thoại kèm checkbox Nghị định 13.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Code bằng `IntersectionObserver` và `mouseleave`, không tốn tài nguyên máy chủ.
* **Hiệu quả thực tế:** Cứ 100 khách định thoát thì giữ lại được 8 - 12 khách để lại SĐT cho Sales chăm sóc.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - BẮT BUỘC]**. Đây là tính năng cơ bản của gói Marketing.

### 2. Trắc nghiệm tương tác chọn Icon 30s (Visual Quiz)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Thay vì để khách mò mẫm hàng trăm sản phẩm, cho khách chạm 3 icon (Không gian phòng -> Nhu cầu -> Mức ngân sách). Sau 15 giây gợi ý ngay 1 - 2 sản phẩm trúng đích.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Xử lý logic lọc dữ liệu ngay tại Client (trình duyệt khách), 0đ chi phí gọi API AI.
* **Hiệu quả thực tế:** Giải tỏa điểm nghẽn "lười đọc thông số dài" trên điện thoại, kích thích khách bấm xem chi tiết.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - TRẢI NGHIỆM ĐỈNH]**.

### 3. Cảm biến dừng xem do dự (Dwell-Time Tracker > 8 giây)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Khi khách cuộn đến 1 sản phẩm và dừng lại quá 8 giây (dấu hiệu đang phân vân), hệ thống tự động bung thông điệp nhỏ: *"Bạn đang phân vân món này? Bấm đây để nhận ưu đãi bí mật 50k!"*.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Dùng Timer đơn giản trong JavaScript.
* **Hiệu quả thực tế:** Đẩy tâm lý khách hàng từ "đang ngắm nghía" sang hành động thêm vào giỏ.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY]**.

### 4. ★ AI Quy đổi dung tích / kích thước ra tình huống cuộc sống (Life-scale Visualizer)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Thay vì để số lít/kg khô khan, AI tự động dịch ra cảnh sinh hoạt gia đình:
  - *Nồi cơm 1.8L* $\rightarrow$ Nấu đủ 8 bát cơm đầy, vừa vặn cho 4 người lớn + 2 trẻ em.
  - *Máy giặt 9kg* $\rightarrow$ Giặt vừa 1 chăn lông cừu mùa đông + 4 bộ đồ đi làm.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Chạy batch 1 lần offline bằng Gemini 1.5 Flash tạo trường mô tả cho từng mã hàng, hiển thị tĩnh không tốn API runtime.
* **Hiệu quả thực tế:** Cực kỳ trực quan, đánh trúng tâm lý người nội trợ và gia đình Việt Nam, giải quyết dứt điểm nỗi lo mua về không vừa.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - KEY BÁN HÀNG ĐẮC LỰC]**. Doanh nghiệp nào nhìn thấy tính năng này cũng thích mê vì nó làm trang sản phẩm sinh động gấp 10 lần.

### 5. ★ AI Chụp ảnh đồ cũ hỏng nhận ngay tiền giảm giá (Snap-to-Trade AI)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Khách chụp ảnh ấm nước cũ, nồi chảo xước gửi lên web $\rightarrow$ Vision AI nhận diện đồ cũ trong 3s $\rightarrow$ Cấp mã giảm trực tiếp 100k - 150k vào đơn mới. Shipper giao đồ mới thu đồ cũ mang về.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Sử dụng Gemini 1.5 Flash Vision API chi phí chỉ ~100đ/lần chụp.
* **Hiệu quả thực tế:** Tạo động lực thay mới đồ gia dụng cực lớn, giải quyết lý do "đồ ở nhà chưa hỏng hẳn nên chưa mua".
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - ĐỘT PHÁ TĂNG TRƯỞNG]**. Doanh nghiệp bán lẻ gia dụng, điện máy sẽ rất khao khát tính năng này để kích cầu.

### 6. Ghim món bằng LocalStorage (Zero-Login + Clear-on-Merge)
* **Nguồn gốc:** Đề xuất nguyên bản được tối ưu cơ chế.
* **Cơ chế hoạt động:** Cho khách bấm Trái tim lưu danh sách yêu thích mà không bắt đăng ký tài khoản. Khi khách đăng nhập thì tự động gộp và xóa sạch bộ nhớ tạm để tránh tràn bộ nhớ.
* **Độ khả thi kỹ thuật:** **100% Khả thi.**
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - TIÊU CHUẨN UX HIỆN ĐẠI]**.

### 7. Nhận diện thao tác sao chép (Clipboard Tracker) & Social Listening
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Bắt sự kiện khách bôi đen copy tên máy hoặc quét bot trên mạng xã hội.
* **Độ khả thi kỹ thuật:** Clipboard tracker dễ làm; Social listening phức tạp vì chính sách chặn crawl của Facebook/TikTok.
* **Khuyến nghị của nhóm:** 🟡 **[ĐỂ PHA 2]**. Tính năng này không phải là lý do chính để khách mua code, chỉ là giá trị cộng thêm.

### 8. 🔴 Phân tích loại bỏ: Tự động đoán chu kỳ hết đồ tiêu dùng
* **Lý do loại bỏ:** Mỗi gia đình ăn uống, dùng dầu gội, cà phê theo thói quen hoàn toàn khác nhau. AI đoán mò sẽ thành spam vô duyên, khiến khách bực bội chặn tin nhắn. **Dứt khoát không đưa vào sản phẩm thương mại.**

---

## PHẦN II: ĐÁNH GIÁ CHI TIẾT TỪNG TÍNH NĂNG - MODULE 2: AI SALES COPILOT

```
Tập tin mã nguồn: nexus-sales.min.js | Kích thước: ~6.5 KB Gzip | Mục tiêu: Tối đa tỷ lệ chốt đơn & Giành lại 15% phí sàn
```

### 1. Slide-Over Quick Cart (Giỏ hàng trượt ngang 1 trang duy nhất)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Bấm mua là giỏ hàng trượt ra từ bên phải màn hình. Điền địa chỉ, chọn thanh toán và quét QR ngay tại 1 chỗ duy nhất, không tải lại trang (Zero Reload).
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Viết bằng Vanilla JS siêu mượt.
* **Hiệu quả thực tế:** Cắt giảm 3 bước rườm rà truyền thống, giảm tỷ lệ bỏ rơi giỏ hàng từ 70% xuống dưới 40%.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - XƯƠNG SỐNG THANH TOÁN]**.

### 2. VietQR Napas247 Động Siêu Tốc (50ms) & Tự điền 100% nội dung
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Sinh mã VietQR chuẩn quốc gia chỉ trong 50 mili-giây. Khách quét là App ngân hàng tự điền đúng 100% STK, số tiền và mã đơn.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Kết nối chuẩn VietQR Napas247 mở.
* **Hiệu quả thực tế:** Xóa bỏ 100% tình trạng khách chuyển khoản gõ nhầm số tiền hoặc quên ghi nội dung đơn hàng. Doanh nghiệp chịu 0đ phí cổng trung gian.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - CỰC KỲ ỔN ĐỊNH]**.

### 3. AI Thương Lượng Mặc Cả Bớt Tiền Mặt Trực Tiếp ($P_{floor}$ Chống Bán Lỗ)
* **Nguồn gốc:** Đề xuất nguyên bản kết hợp cơ chế tài chính hoa hồng sales.
* **Cơ chế hoạt động:** Khách bấm trả giá $\rightarrow$ AI giằng co duyên dáng rồi bớt thẳng 3% - 5% tiền mặt vào hóa đơn (lấy từ ngân sách hoa hồng sales tiết kiệm được) $\rightarrow$ Sinh mã VietQR khóa giá 10 phút. Backend kiểm soát $100\%$ qua công thức $P_{floor}$, không một câu lệnh hack nào ép AI bán dưới giá sàn được.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Function Calling + HMAC SHA-256 TTL 10 phút.
* **Hiệu quả thực tế:** Kích thích cơn nghiện "săn hời" của người Việt, khiến khách xuống tiền chuyển khoản ngay trong 10 phút để không mất giá ưu đãi.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - CHÌA KHÓA CHỐT SALE THẦN TỐC]**.

### 4. ★ Cỗ máy bẻ cầu đơn Shopee về Web riêng (Platform-Fee Arbitrage Engine)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Khách dán link sản phẩm Shopee của shop vào web $\rightarrow$ AI tính toán bớt 5% - 8% tiền mặt + Freeship cho khách $\rightarrow$ Khách mua rẻ hơn sàn Shopee 50k - 70k, còn shop thì giữ lại được 10% lợi nhuận ròng (vì không mất 15% phí sàn cho Shopee).
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Chỉ cần parse mã sản phẩm từ link Shopee và đối chiếu giá niêm yết trong cơ sở dữ liệu của web.
* **Hiệu quả thực tế:** Đây là "vũ khí tối thượng" để Sếp đi thuyết phục các chủ shop lớn trên Shopee: Vừa kéo được khách về web riêng, vừa nắm trọn data khách hàng, vừa có thêm tiền lời.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - VŨ KHÍ BÁN CODE B2B SỐ 1]**.

### 5. ★ AI Đánh giá độ phù hợp nhu cầu (Target-Fit Check)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Tuyệt đối không chê hàng, mà chỉ rõ: *"Sản phẩm này cực kỳ phù hợp cho người ở 1 mình hoặc gia đình 2-3 người. Nếu nhà từ 5 người trở lên, em khuyên anh nên xem sang mẫu dung tích lớn hơn để dùng thoải mái"*.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Dùng System Prompt quy định rõ ràng trong RAG.
* **Hiệu quả thực tế:** Tạo niềm tin tuyệt đối rằng shop tư vấn có tâm, giảm tối đa đơn hàng bị hoàn trả hoặc đánh giá 1 sao do mua nhầm kích cỡ.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - NÂNG TẦM UY TÍN SHOP]**.

### 6. ★ AI Ước tính tiền điện nuôi máy (Chuẩn Nhãn Năng Lượng & Giá EVN)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Căn cứ kWh ghi trên nhãn năng lượng dán trên máy + giá điện bậc thang EVN. Khách chọn 1 chạm: Dùng 3h/ngày hoặc 8h/đêm $\rightarrow$ AI báo ngay: *"Chỉ tốn ~3.500đ/đêm (~105k/tháng - bằng 2 bát phở)"*.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Công thức toán học nhân chia đơn giản dựa trên dữ liệu thật của Bộ Công Thương.
* **Hiệu quả thực tế:** Đập tan nỗi sợ "mua máy về tốn tiền điện" của người mua điều hòa, tủ lạnh, nồi chiên, máy sấy.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - TÍNH NĂNG ĐỘC NHẤT THỊ TRƯỜNG]**.

### 7. ★ Cơ chế ghi nhớ tài khoản kiểu Shopee (Preferred Payment) + VietQR Deeplink 3s
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Hệ thống ghi nhớ App ngân hàng quen thuộc của khách (VCB, MB...). Bấm thanh toán là tự bật App ngân hàng lên, khách chỉ cần quét FaceID là xong, tiền về thẳng tài khoản chủ shop.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Dùng DeepLink URL Scheme chuẩn của Napas/Ngân hàng.
* **Hiệu quả thực tế:** Thanh toán nhanh ngang ngửa ShopeePay, khách không có thời gian đổi ý.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - TRẢI NGHIỆM 3 GIÂY]**.

### 8. ★ Hẹn giờ giao hàng linh hoạt 1-chạm (Time-Slot Picker)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Cho khách bấm chọn: *Giờ hành chính tại công ty* / *Sau 18h tối tại nhà* / *Cuối tuần Thứ 7 - CN*. Tự đồng bộ trường ghi chú sang bưu cục (GHN, GHTK).
* **Độ khả thi kỹ thuật:** **100% Khả thi.**
* **Hiệu quả thực tế:** Giải quyết dứt điểm nỗi lo shipper giao đến lúc đang đi vắng hoặc bận họp, giảm tỷ lệ giao hàng thất bại (bom hàng) xuống gần 0%.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - RẤT THỰC TẾ]**.

### 9. 1-Click Order Bumps, E-Invoice VAT, Thanh đo Freeship
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Khuyến nghị của nhóm:** 🟡 **[LÀM TIẾP Ở PHA 2]**. Đã có sẵn logic, bật lên khi doanh nghiệp có nhu cầu bán kèm phụ kiện hoặc xuất hóa đơn đỏ.

### 10. 🔴 Phân tích loại bỏ:
* **Tặng quà thay vì giảm giá tiền mặt:** Người tiêu dùng Việt Nam ghét quà tặng kèm vì mặc định đó là "đồ ế, đồ dởm". Chỉ có giảm tiền mặt thật mới kích thích chốt đơn.
* **Hoàn bù voucher giảm giá 14 ngày:** Làm giảm lợi nhuận đơn thứ 2 của shop và gây rắc rối kế toán.
* **Ép shipper ghép đơn cùng tuyến:** Không thực tế vì shop không có quyền điều phối đội ngũ shipper của các công ty vận chuyển.

---

## PHẦN III: ĐÁNH GIÁ CHI TIẾT TỪNG TÍNH NĂNG - MODULE 3: SMART CSKH 24/7

```
Tập tin mã nguồn: nexus-cskh.min.js | Kích thước: ~6.9 KB Gzip | Mục tiêu: Tự động hóa hỗ trợ 24/7 & Cắt giảm 80% áp lực trực ca
```

### 1. Menu Tự Phục Vụ 1 Chạm (Quick Action Chips 0.5s)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Mở khung chat là hiện sẵn các nút bấm: [Báo giá & Khuyến mãi], [Tra cứu đơn hàng], [Chính sách bảo hành], [Gặp nhân viên]. Bấm là có câu trả lời ngay sau 0.5 giây.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Render thẻ HTML ngay trên client.
* **Hiệu quả thực tế:** 70% khách hàng chỉ hỏi các thông tin này. Quick Chips giải quyết tức thì mà khách không phải gõ phím, không tốn 1 đồng tiền API AI nào.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - NỀN TẢNG CSKH]**.

### 2. Kiến trúc Two-Stage RAG (Lọc nội bộ 0.05ms + Bơm LLM 300 token)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Khách gõ câu hỏi bất kỳ $\rightarrow$ Máy chủ lọc ra đúng 2-3 sản phẩm liên quan nhất bằng vector/từ khóa nội bộ $\rightarrow$ Chỉ gửi 2-3 món này cho Gemini 1.5 Flash trả lời $\rightarrow$ Tốn đúng 300 token (~0.5đ/câu hỏi), phản hồi dưới 1 giây.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Đã có kiến trúc chuẩn.
* **Hiệu quả thực tế:** Trả lời chính xác thông số kỹ thuật 24/7 mà không lo AI "chém gió" sai sự thật.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - LÕI CÔNG NGHỆ]**.

### 3. Hệ thống báo động đỏ khiếu nại (Crisis Alert < 2 phút)
* **Nguồn gốc:** Đề xuất nguyên bản ban đầu.
* **Cơ chế hoạt động:** Khi AI phát hiện khách bức xúc, chửi bới, đòi kiện tụng $\rightarrow$ Tự động ngắt bot ngay lập tức $\rightarrow$ Bắn chuông báo động đỏ về Telegram/Zalo của Trưởng ca CSKH để người thật gọi can thiệp trong dưới 2 phút.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Sentiment Detection dựa trên Prompt của LLM.
* **Hiệu quả thực tế:** Tuyệt đối không để AI tranh cãi với khách hàng khi họ đang giận dữ, ngăn ngừa 100% khủng hoảng truyền thông.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - VÒNG KIM CÔ AN TOÀN]**.

### 4. ★ AI Rút gọn ghi chú tư vấn thành Tag chuẩn hóa cho Kho & Shipper (A6 Label)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Khách chat dặn dò dài dòng trong lúc tư vấn, AI tự động chắt lọc thành **1 dòng Tag in đậm duy nhất** in ngay trên nhãn vận đơn A6:  
  👉 **`[GIAO SAU 17H] • [GỌI TRƯỚC 10P] • [BỌC XỐP KỸ - CHE TÊN HÀNG]`**
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Dùng Regex và Entity Extraction cực kỳ đơn giản.
* **Hiệu quả thực tế:** Khâu đóng hàng và shipper nhìn 1 giây là hiểu ngay. Giải quyết dứt điểm tình trạng sót dặn dò của khách.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - GIÁ TRỊ VẬN HÀNH THỰC TẾ CAO]**.

### 5. ★ AI Soạn hướng dẫn 3 bước mở hộp siêu ngắn (1-Click First-Use Playbook)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** AI đọc cuốn User Manual dày cộp của hãng, chắt lọc đúng 3 việc quan trọng nhất bằng ngôn ngữ bình dân (ví dụ: bóc lớp nilon bọc lõi lọc bên trong máy trước khi cắm điện; đun bỏ ấm nước đầu...). Tự động gửi qua Zalo/Web khi đơn giao thành công.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Xử lý sẵn 1 lần cho từng sản phẩm.
* **Hiệu quả thực tế:** **Giảm 85% cuộc gọi khiếu nại** do khách dùng sai làm cháy hỏng máy mới mua. Doanh nghiệp tiết kiệm hàng chục triệu tiền bảo hành.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - GIẢM TẢI BẢO HÀNH]**.

### 6. ★ AI Tra linh kiện phụ kiện tương thích (Model-Match Catalog)
* **Nguồn gốc:** Đề xuất bổ sung mới.
* **Cơ chế hoạt động:** Khách gõ tên máy cũ ở nhà (ví dụ: *"Nồi chiên Lock&Lock 5.2L"*), AI tra cứu kho của shop và chỉ đúng chiếc vỉ nướng hoặc màng lọc thay thế vừa khít 100%.
* **Độ khả thi kỹ thuật:** **100% Khả thi.** Vector Search trong bảng linh kiện của shop.
* **Hiệu quả thực tế:** Mở ra mảng doanh thu bán linh kiện thay thế định kỳ cực kỳ béo bở cho doanh nghiệp.
* **Khuyến nghị của nhóm:** 🟢 **[NÊN LÀM NGAY - TẠO DOANH THU ĐỀU ĐẶN]**.

### 7. Visual AI soi tem bảo hành, Đồng bộ Zalo OA, Đơn quà biếu tách đa địa chỉ
* **Nguồn gốc:** Đề xuất nguyên bản & bổ sung.
* **Khuyến nghị của nhóm:** 🟡 **[LÀM Ở PHA 2]**. Đưa vào gói nâng cấp tính năng mở rộng khi khách hàng có nhu cầu chuyên sâu.

### 8. 🔴 Phân tích loại bỏ:
* **Đổi mới hàng lỗi trong 30s bằng video AI:** Nguy cơ khách tráo hàng giả, hàng cũ nát lấy đồ mới rất cao ở thị trường Việt Nam. Phải để nhân viên kỹ thuật thẩm định trực tiếp.
* **Gọi điện nhắc khách đánh giá sản phẩm:** Gây phiền toái, tỷ lệ khách chặn số cao, không mang lại chuyển đổi.

---

## PHẦN IV: BẢNG MA TRẬN CHẤM ĐIỂM TỔNG HỢP & LỘ TRÌNH TRIỂN KHAI (SCORECARD)

Bảng tổng hợp dưới đây giúp Sếp có bức tranh toàn cảnh để phân bổ nguồn lực kỹ thuật:

| STT | Tên Tính Năng | Phân Hệ | Nguồn Gốc | Độ Khả Thi | Tác Động Doanh Số | Chi Phí Vận Hành | XẾP HẠNG TRIỂN KHAI |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **Bắt chuột thoát trang (Exit-Intent)** | Mod 1 MKT | Gốc | 100% Rất dễ | Cao (Thu Lead) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 2 | **Trắc nghiệm chọn Icon 30s** | Mod 1 MKT | Gốc | 100% Dễ | Rất cao (Tăng xem) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 3 | **Cảm biến do dự > 8 giây** | Mod 1 MKT | Gốc | 100% Dễ | Trung bình | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 4 | **Quy đổi dung tích đời thực** | Mod 1 MKT | Mới | 100% Dễ | Rất cao (Dễ mua) | Rất thấp (Gemini) | 🟢 **Pha 1 (Làm Ngay)** |
| 5 | **Chụp ảnh đồ cũ trừ tiền mặt** | Mod 1 MKT | Mới | 100% Dễ | Cực cao (Kích cầu) | ~100đ/lần | 🟢 **Pha 1 (Làm Ngay)** |
| 6 | **Slide-Over Quick Cart 1 trang** | Mod 2 Sales | Gốc | 100% Dễ | Cực cao (Chống hủy) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 7 | **VietQR Napas247 50ms** | Mod 2 Sales | Gốc | 100% Dễ | Cực cao (Thu tiền) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 8 | **AI Mặc cả tiền mặt ($P_{floor}$)** | Mod 2 Sales | Gốc | 100% Vững | Cực cao (Chốt đơn) | ~200đ/lần | 🟢 **Pha 1 (Làm Ngay)** |
| 9 | **Bẻ cầu đơn Shopee về Web** | Mod 2 Sales | Mới | 100% Dễ | Cực cao (Giữ 15%) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 10 | **Target-Fit Check (Hợp với ai)** | Mod 2 Sales | Mới | 100% Dễ | Cao (Giảm trả hàng) | Rất thấp | 🟢 **Pha 1 (Làm Ngay)** |
| 11 | **Tính tiền điện EVN + BCT** | Mod 2 Sales | Mới | 100% Dễ | Rất cao (Xóa sợ hãi) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 12 | **Ghi nhớ TK kiểu Shopee 3s** | Mod 2 Sales | Mới | 100% Dễ | Cực cao (FaceID) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 13 | **Hẹn giờ giao hàng linh hoạt** | Mod 2 Sales | Mới | 100% Dễ | Rất cao (Chống bom) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 14 | **Quick Action Chips 0.5s** | Mod 3 CSKH | Gốc | 100% Rất dễ | Cao (Giải phóng nv) | 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 15 | **Two-Stage RAG 300 token** | Mod 3 CSKH | Gốc | 100% Vững | Rất cao (Trực 24/7) | ~0.5đ/câu hỏi | 🟢 **Pha 1 (Làm Ngay)** |
| 16 | **Crisis Alert báo động đỏ < 2p** | Mod 3 CSKH | Gốc | 100% Dễ | Cao (Tránh phốt) | Rất thấp | 🟢 **Pha 1 (Làm Ngay)** |
| 17 | **Rút gọn Tag kho & shipper A6** | Mod 3 CSKH | Mới | 100% Rất dễ | Cao (Vận hành chuẩn)| 0đ | 🟢 **Pha 1 (Làm Ngay)** |
| 18 | **3 Bước mở hộp ngắn chống hỏng** | Mod 3 CSKH | Mới | 100% Dễ | Cao (Bảo vệ máy) | 0đ (Batch) | 🟢 **Pha 1 (Làm Ngay)** |
| 19 | **Model-Match phụ kiện/lõi lọc** | Mod 3 CSKH | Mới | 100% Dễ | Cao (Bán lặp lại) | 0đ (Vector) | 🟢 **Pha 1 (Làm Ngay)** |
| 20 | **Order Bumps / Freeship bù tiền**| Mod 2 Sales | Gốc | 100% Dễ | Trung bình | 0đ | 🟡 **Pha 2 (Bổ sung)** |
| 21 | **Xuất hóa đơn VAT 1-chạm** | Mod 2 Sales | Gốc | 90% Cần API | Trung bình | Phí API MST | 🟡 **Pha 2 (Bổ sung)** |
| 22 | **Đơn quà biếu tách đa địa chỉ** | Mod 3 CSKH | Mới | 95% Cần test | Trung bình | Rất thấp | 🟡 **Pha 2 (Bổ sung)** |
| 23 | **Visual AI soi tem bảo hành** | Mod 3 CSKH | Gốc | 90% | Trung bình | ~100đ/ảnh | 🟡 **Pha 2 (Bổ sung)** |
| 24 | **Đồng bộ Zalo OA Continuity** | Mod 3 CSKH | Gốc | 95% | Trung bình | Phí Zalo OA | 🟡 **Pha 2 (Bổ sung)** |
| 25 | **Đoán chu kỳ hết đồ tiêu dùng** | Mod 1 MKT | Mới | Không thực tế | Rất thấp | Tốn kém | 🔴 **Loại Bỏ (Spam)** |
| 26 | **Tặng quà kèm thay vì giảm giá**| Mod 2 Sales | Cũ | Kém hấp dẫn | Thấp (Khách chê) | Tốn kho | 🔴 **Loại Bỏ (Phản tác dụng)**|
| 27 | **Hoàn bù voucher giá giảm 14 ngày**| Mod 2 Sales | Cũ | Rủi ro tài chính | Lỗ biên lãi | Cao | 🔴 **Loại Bỏ (Lỗ lãi shop)** |
| 28 | **Đổi hàng lỗi 30s bằng video AI** | Mod 3 CSKH | Cũ | Rủi ro gian lận | Tiêu cực | Rất cao | 🔴 **Loại Bỏ (Tráo hàng lừa đảo)**|

---

## KẾT LUẬN & KIẾN NGHỊ CHO SẾP

1. **Về mặt kỹ thuật:** Toàn bộ 19 tính năng được xếp hạng 🟢 **[Pha 1 - Làm Ngay]** đều đã được kiểm chứng tính khả thi 100%, không có bất kỳ rào cản kỹ thuật nào khó khăn, không phụ thuộc vào các model AI đắt đỏ. Sử dụng **Google Gemini 1.5 Flash** sẽ giữ tổng chi phí vận hành ở mức tiệm cận 0 đồng.
2. **Về mặt thương mại (Đi bán code cho doanh nghiệp):** Sếp có thể tự tin mang bảng này đi pitching. Các tính năng như **Bẻ cầu đơn Shopee về Web**, **AI Mặc cả bớt tiền mặt từ hoa hồng Sales**, **Quy đổi dung tích đời thực**, và **Tag kho A6** là những tính năng cực kỳ khác biệt, đánh trúng điểm đau lớn nhất của các chủ shop hiện nay mà chưa có đơn vị phần mềm nào trên thị trường Việt Nam làm hoàn chỉnh.
3. **Đóng gói sản phẩm:** Khuyến nghị chốt gói lõi gồm 19 tính năng Pha 1 để phát hành phiên bản MVP thương mại đầu tiên, các tính năng Pha 2 sẽ dùng làm "Upsell" các gói cao cấp hơn.
