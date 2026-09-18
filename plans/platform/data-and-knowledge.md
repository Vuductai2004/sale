# Thiết Kế Dữ Liệu 6 Domain, Customer 360 & Kiến Trúc Two-Stage RAG

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Phân hệ:** Data Architecture & Knowledge Base  
> **Kiến trúc tìm kiếm:** Two-Stage RAG (Sparse + Dense Retrieval ➔ Cross-Encoder Reranker)  
> **Mô hình bộ nhớ:** 5 Tầng AI Memory (Working ➔ Semantic)

---

## 1. Thiết Kế Dữ Liệu 6 Domain Chuẩn Doanh Nghiệp (Data Dictionary)

Hệ thống chuẩn hóa mô hình dữ liệu qua 6 Domain cốt lõi, đồng bộ thời gian thực với System of Record (ERP/POS/WMS):

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ DOMAIN 1:       │       │ DOMAIN 2:       │       │ DOMAIN 3:       │
│ CUSTOMER 360    │◄─────►│ ORDER & CART    │◄─────►│ PRODUCT CATALOG │
│ Hồ sơ khách hàng│       │ Đơn hàng & Giỏ  │       │ Danh mục sản phẩm│
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ DOMAIN 4:       │       │ DOMAIN 5:       │       │ DOMAIN 6:       │
│ INVENTORY (WMS) │       │ INTERACTION     │       │ KNOWLEDGE BASE  │
│ Tồn kho khả dụng│       │ Lịch sử hội thoại│       │ Tri thức 5 ngành│
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Chi tiết 6 Domain:
1. **Domain 1 - Customer 360:** `customer_id`, `phone_hash`, họ tên, ngôn ngữ ưu tiên (Việt, Indonesia, Trung), điểm tín nhiệm (`trust_score`), trạng thái đồng thuận tiếp thị (`consent_flags`), phân khúc RFM, lịch sử nhận hàng bưu cục quen thuộc.
2. **Domain 2 - Product Catalog:** `sku`, `product_name`, danh mục, biến thể, giá niêm yết ($P_{base}$), giá sàn ($P_{floor}$), thông số kỹ thuật đã kiểm duyệt, liên kết nhóm hàng thay thế (`nhom_hang_thay_the`).
3. **Domain 3 - Inventory & WMS:** `sku`, `warehouse_id`, tồn kho thực tế, tồn kho an toàn, số lượng giữ chỗ nguyên tử (`atomic_reserved`), trạng thái sẵn sàng xuất kho.
4. **Domain 4 - Order & Cart:** `order_id`, `customer_id`, danh sách SKU, tổng tiền, mức giảm giá, mã bưu cục nhận hàng (`cvs_store_code`), phương thức thanh toán (CVS COD / LINE Pay), trạng thái vận đơn.
5. **Domain 5 - Interaction & Timeline:** `session_id`, `channel` (Web/LINE/Zalo), sự kiện hành vi (`view_item`, `add_cart`, `abandon_cart`), lịch sử tin nhắn, bằng chứng đối soát (`evidence_refs`).
6. **Domain 6 - Knowledge Base:** Tài liệu chính sách, cẩm nang hỏi đáp FAQ, hướng dẫn bảo hành xe điện, quy chuẩn giao nhận bưu cục 4 chuỗi.

---

## 2. Kiến Trúc Two-Stage RAG & Vector Database

Để đảm bảo câu trả lời của AI luôn chính xác tuyệt đối, không bao giờ bịa đặt thông số kỹ thuật (**BR-003**), hệ thống áp dụng quy trình tìm kiếm tri thức 2 giai đoạn:

```text
[Câu hỏi khách hàng]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: TÌM KIẾM KẾT HỢP (HYBRID RETRIEVAL)       │
│ - Sparse Search: BM25 (tìm chính xác từ khóa, mã SKU)  │
│ - Dense Search: Vector Embedding (tìm ngữ nghĩa, mô tả)│
└──────────────────────────┬─────────────────────────────┘
                           │ Thu được Top 30 kết quả ứng viên
┌──────────────────────────▼─────────────────────────────┐
│ GIAI ĐOẠN 2: TÁI XẾP HẠNG CHUYÊN SÂU (RERANKING)       │
│ - Cross-Encoder Reranker chấm điểm tương thích ngữ cảnh│
│ - Lọc bỏ kết quả có điểm tin cậy (Score) < 0.82        │
└──────────────────────────┬─────────────────────────────┘
                           │ Chọn lọc Top 3 đoạn trích dẫn tối ưu
┌──────────────────────────▼─────────────────────────────┐
│ TỔNG HỢP CÂU TRẢ LỜI CÓ BẰNG CHỨNG (GROUNDED GENERATION)│
│ LLM trả lời kèm dẫn chứng chính sách cụ thể            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Hệ Thống 5 Tầng Bộ Nhớ AI (Second Brain Architecture)

1. **Working Memory (Bộ nhớ tác vụ tức thời):** Lưu giữ ngữ cảnh câu hỏi hiện tại, giỏ hàng tạm thời và mức giá đang mặc cả trong phiên tương tác.
2. **Short-Term Session Memory (Bộ nhớ phiên 24h):** Lưu lại diễn biến hội thoại trong vòng 24 giờ để khách quay lại không phải bắt đầu lại từ đầu.
3. **Long-Term Profile Memory (Bộ nhớ hồ sơ Customer 360):** Lưu trữ thuộc tính bền vững: sở thích ẩm thực, mẫu xe đang sở hữu, địa chỉ bưu cục quen thuộc gần nơi làm việc.
4. **Episodic Interaction Memory (Bộ nhớ tình huống thực tế):** Lưu lại các tình huống khiếu nại cũ, lịch sử bùng hàng hoặc lý do khách từ chối mua trước đây để tinh chỉnh cách tiếp cận.
5. **Semantic Knowledge Memory (Bộ nhớ tri thức chuẩn hóa):** Toàn bộ chính sách kinh doanh, bảng giá niêm yết, định mức bảo hành được đóng băng bất biến trong Knowledge Base.

---

## 4. Cấu Trúc Thư Mục Knowledge Base 5 Ngành Hàng

```text
knowledge-base/
├── 01-fmcg/                               # Nhu yếu phẩm & đặc sản quê hương (bánh pía, mì gói, gia vị)
├── 02-mobility/                           # Xe máy điện thông minh mới 100% & phụ tùng (ắc quy, sạc, săm)
├── 03-telecom/                            # Cước data SIM kiều bào 30 ngày, hướng dẫn kích hoạt nạp thẻ
├── 04-cvs-logistics/                      # Quy chuẩn nhận hàng 4 chuỗi bưu cục (7-Eleven, FamilyMart, Hi-Life, OK)
└── 05-company-policy/                     # Chính sách đổi trả, bảo hành chính hãng, giải quyết khiếu nại
```
