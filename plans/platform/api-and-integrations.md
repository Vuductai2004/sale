# Hợp Đồng Kỹ Năng (Skill Contracts), Cổng Kết Nối & Bảo Mật Hệ Thống

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Phân hệ:** API & Integrations  
> **Kiến trúc thực thi:** Decoupled Agent-Skill Architecture (Mục 11 SRS)  
> **Cổng đối tác:** 4 Chuỗi Bưu Cục Tiện Lợi Đài Loan (7-Eleven, FamilyMart, Hi-Life, OK Mart)

---

## 1. Hệ Thống Kỹ Năng Chuẩn & Hợp Đồng Dữ Liệu (Skill Contracts)

Theo quy định kiến trúc của SRS v0.1, **Agent (lớp nhận thức/hội thoại)** và **Skill (lớp thực thi công việc)** được tách biệt hoàn toàn. Agent không bao giờ trực tiếp can thiệp vào cơ sở dữ liệu mà phải thông qua các Kỹ năng được quản trị tập trung:

### Cấu trúc dữ liệu yêu cầu gọi Kỹ năng (Skill Call Schema):
```json
{
  "skill_id": "string (VD: check-price, verify-pfloor)",
  "run_id": "uuid-v4",
  "caller_agent": "string (VD: SAL-02, CS-01)",
  "customer_id": "string",
  "input_payload": { "parameters": "object" },
  "required_authority": "string (AUTH-0..AUTH-4)",
  "idempotency_key": "string (chống trùng lặp)",
  "timeout_ms": 3000,
  "retry_policy": { "max_retries": 2, "backoff_ms": 500 }
}
```

### Danh mục 9 Kỹ năng cốt lõi toàn hệ thống:

| Mã Kỹ Năng (Skill ID) | Mục Đích Nghiệp Vụ | Agent Được Phép Dùng | Thẩm Quyền | Cổng Hệ Thống Tương Tác |
|---|---|---|---|---|
| `search-product` | Tra cứu danh mục, thông số SKU theo từ khóa hoặc mô tả tự nhiên | SAL-02, SAL-03, CS-01 | AUTH-0 | Vector DB / Catalog Search API |
| `check-stock` | Kiểm tra tồn kho khả dụng theo SKU và kho gần nhất | SAL-02, SAL-03, SAL-04 | AUTH-0 | WMS / ERP Inventory API |
| `check-price` | Tra cứu giá niêm yết $P_{base}$ và chính sách chiết khấu chính thức | SAL-02, SAL-03, SAL-04 | AUTH-0 | ERP Pricing Engine |
| `verify-pfloor` | **Deterministic Policy Engine:** Kiểm tra điều kiện $P_{offered} \ge P_{floor}$ qua code cứng | SAL-02 | AUTH-3 | Core Pricing Defense Engine |
| `retrieve-customer` | Đọc Customer 360: lịch sử mua, giỏ hàng, điểm tín nhiệm, consent | SAL-01, CS-01, CS-02 | AUTH-0 | C360 Ingestion Layer |
| `recommend-product` | Sinh đề xuất đóng gói đủ 7 trường dữ liệu chuẩn SRS | SAL-03 | AUTH-1 | Recommendation Engine |
| `create-cart` | Khởi tạo giỏ hàng hoặc thêm sản phẩm vào giỏ hàng trượt | SAL-02, SAL-04 | AUTH-3 | Ecommerce Core API |
| `create-order` | Tạo đơn hàng nháp hoặc đơn đặt cọc CVS COD chính thức vào ERP | SAL-02 | AUTH-4 | ERP / POS Order API |
| `escalate-human` | Bắn cảnh báo Crisis Alert và chuyển quyền sang màn hình SCR-005 | CS-01, CS-02 | AUTH-4 | Telegram Bot / Console Gateway |

---

## 2. Cổng Kết Nối Logistics Bưu Cục Tiện Lợi (CVS Connectors)

Hệ thống giao vận tại Đài Loan tích hợp chuẩn hóa với **4 chuỗi siêu thị bưu cục tiện lợi (CVS)** bao phủ toàn bộ lãnh thổ:
1. **7-Eleven** (Mạng lưới cửa hàng lớn nhất)
2. **FamilyMart** (Chuỗi cửa hàng phổ biến thứ hai)
3. **Hi-Life** (Chuỗi cửa hàng tiện ích địa phương)
4. **OK Mart** (Chuỗi cửa hàng chuyên sâu các khu vực công nghiệp)

### Cơ chế tích hợp:
* **E-Map API Integration:** Tích hợp API bản đồ số của đối tác thanh toán/vận chuyển (ECPay / NewebPay). Khách hàng bấm chọn vị trí trên bản đồ, hệ thống tự động lưu mã chi nhánh (`cvs_store_code`) và tên bưu cục vào đơn hàng.
* **Store Selection TTL:** Giữ chỗ mã bưu cục trong vòng 10 phút để khách hoàn tất thông tin xác nhận.
* **Webhook lắng nghe trạng thái vận đơn:** Hệ thống tự động nhận tín hiệu Webhook khi hàng đã về tới bưu cục để kích hoạt tin nhắn thông báo khách đến nhận và thanh toán tiền mặt (CVS COD).

---

## 3. Tiêu Chuẩn Bảo Mật & An Toàn Dữ Liệu (NFRs)

* **NFR-006 (Data Isolation & Privacy):** Tuân thủ tuyệt đối Đạo luật Bảo vệ Dữ liệu Cá nhân (Taiwan PDPA). Toàn bộ dữ liệu khách hàng được phân vùng độc lập, mã hóa dữ liệu nhạy cảm (số điện thoại, địa chỉ) ở trạng thái lưu trữ (AES-256) và truyền tải (TLS 1.3).
* **NFR-008 (Fail-Closed Safety):** Khi phát hiện lỗi hệ thống, mất kết nối API hoặc nghi vấn bị tấn công mạng, toàn bộ các cổng xử lý tiền và chốt đơn tự động khóa lại ngay lập tức (Fail-Closed), ngăn ngừa thất thoát tài chính.
* **NFR-002 (Performance Latency):** Phản hồi tra cứu FAQ dưới 1.0 giây, phản hồi gợi ý sản phẩm dưới 1.5 giây, chuyển giao người thật dưới 1.0 giây.
