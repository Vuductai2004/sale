# Bảng Tra Cứu Thuật Ngữ Hệ Thống (Master Glossary)

> **Thuộc hồ sơ:** `AI-REV-SRS-001` · **Phân hệ:** System Documentation  
> **Phạm vi giải nghĩa:** Thuật ngữ Công nghệ AI & Nghiệp vụ Bán lẻ Bản địa hóa Đài Loan

---

## 1. Nhóm Thuật Ngữ Công Nghệ AI & Kỹ Thuật Phần Mềm (AI & Software Engineering)

| Thuật ngữ | Tên tiếng Anh / Viết tắt | Định nghĩa & Ý nghĩa nghiệp vụ trong hệ thống |
|---|---|---|
| **Bộ điều phối doanh thu** | **Revenue Orchestrator** | Bộ não điều phối tập trung 11 bước, kiểm soát toàn bộ luồng thông tin từ Tín hiệu $\rightarrow$ Quyết định $\rightarrow$ Bằng chứng $\rightarrow$ Kết quả, đảm bảo AI không tự biên tự diễn. |
| **Không gây xáo trộn** | **Zero-Disruption** | Nguyên tắc thiết kế cắm-rút (Plug-and-Play); coi hệ thống ERP/POS hiện hữu là System of Record duy nhất, tuyệt đối không đập đi xây lại hay tạo cơ sở dữ liệu song song. |
| **Máy chủ khóa cứng giá sàn** | **Deterministic Policy Engine** | Lớp code logic cứng bên ngoài LLM kiểm tra điều kiện $P_{offered} \ge P_{floor}$. Ngăn chặn triệt để Prompt Injection và triệt tiêu nguy cơ bán lỗ dưới giá sàn. |
| **Giá sàn toán học** | **$P_{floor}$ (Floor Price)** | Mức giá thấp nhất mà máy chủ cho phép bán ra, được tính toán dựa trên giá vốn (COGS), chi phí biến đổi, phí cổng thanh toán và biên lãi ròng tối thiểu $L$. |
| **Khóa giữ chỗ nguyên tử** | **Atomic Budget Hold** | Thao tác khóa giữ chỗ mức giá ưu đãi và tồn kho trong cơ sở dữ liệu với thời hạn TTL 10 phút, ngăn chặn tình trạng nhiều phiên cùng khai thác vượt ngân sách. |
| **Khóa chống trùng lặp** | **Idempotency Key** | Chuỗi định danh thực thi duy nhất (`execution_id`) gắn cho mỗi giao dịch; khi mạng lag hoặc thử lại (retry), hệ thống không bao giờ tạo 2 đơn hàng trùng nhau (**BR-006**). |
| **Tìm kiếm tri thức 2 giai đoạn** | **Two-Stage RAG** | Pipeline tìm kiếm tri thức gồm: Giai đoạn 1 (Hybrid Retrieval: BM25 + Dense Vector Search) $\rightarrow$ Giai đoạn 2 (Cross-Encoder Reranker lọc điểm tin cậy $\ge 0.82$). |
| **An toàn thất bại** | **Fail-Closed** | Nguyên tắc an toàn hệ thống (**NFR-008**): Khi mất kết nối API hoặc thiếu dữ liệu xác thực, hệ thống tự động từ chối chốt đơn và chuyển hàng đợi người thật xử lý. |
| **Tiếp quản khẩn cấp** | **Human Takeover** | Cơ chế cho phép nhân viên hỗ trợ ngắt quyền bot và giành quyền tương tác trực tiếp với khách hàng trong vòng $\le 1.0\text{ giây}$ khi có sự cố hoặc khiếu nại. |
| **Ma trận thẩm quyền** | **Authority Matrix (AUTH-0..5)** | Khung phân quyền 6 cấp độ quy định ranh giới những việc AI được tự làm (AUTH-3), việc phải trình người duyệt (AUTH-4) và việc bị cấm tuyệt đối (AUTH-5). |
| **Bộ nhớ 5 tầng AI** | **5-Tier AI Memory** | Kiến trúc bộ nhớ gồm: Working Memory (phiên hiện tại), Short-Term (24h), Long-Term (Customer 360), Episodic (lịch sử tình huống) và Semantic (tri thức đóng băng). |
| **Quản trị chi phí AI** | **FinOps AI** | Khung quản trị định mức chi phí gọi LLM: duy trì chi phí token trung bình từ $0.5 - 1.0\text{ TWD}$ trên mỗi phiên tư vấn hoàn chỉnh. |

---

## 2. Nhóm Thuật Ngữ Nghiệp Vụ Bán Lẻ & Kiều Bào Tại Đài Loan (Taiwan Domain Playbooks)

| Thuật ngữ | Ký hiệu / Chữ Hán | Định nghĩa & Ý nghĩa nghiệp vụ trong hệ thống |
|---|---|---|
| **Chuỗi bưu cục tiện lợi** | **CVS (超商)** | Hệ thống 4 chuỗi cửa hàng tiện lợi lớn nhất Đài Loan: 7-Eleven, FamilyMart, Hi-Life và OK Mart, đóng vai trò điểm nhận hàng bưu phẩm chính. |
| **Nhận hàng trả tiền mặt siêu thị** | **CVS COD (超商取貨付款)** | Hình thức thanh toán phổ biến nhất (>60% giao dịch B2C tại Đài Loan): hàng gửi về bưu cục, khách đến kiểm tra và thanh toán tiền mặt tại quầy. |
| **Bản đồ bưu cục điện tử** | **E-Map API (電子地圖門市)** | Cổng kết nối bản đồ số của đối tác vận chuyển (ECPay/NewebPay), cho phép khách hàng chọn đúng mã chi nhánh bưu cục gần xưởng hoặc nơi cư trú. |
| **Phạt bùng hàng siêu thị** | **未取貨 Penalty** | Quy định xử lý khi khách không nhận hàng sau 7 ngày: hệ thống ghi cờ cảnh báo, hạ Trust Score, khóa quyền thanh toán COD và tước quyền trợ cấp giá 90–180 ngày. |
| **Ngày nghỉ bão lũ** | **Typhoon Day (停班停課)** | Lệnh tạm dừng làm việc và học tập do chính quyền Đài Loan ban bố khi có bão lớn; hệ thống tự động lắng nghe Webhook hoãn giao để gửi tin trấn an khách. |
| **Thẻ cư trú kiều bào** | **ARC (居留證)** | Thẻ chứng minh nhân dân dành cho người nước ngoài sinh sống tại Đài Loan; AI tận dụng cổng hỏi đáp thủ tục ARC để tặng voucher chào mừng mua sắm. |
| **Bảo hiểm y tế Đài Loan** | **NHI / BHYT (全民健保)** | Hệ thống bảo hiểm y tế toàn dân của Đài Loan; nội dung trong cổng hỏi đáp kiều bào hỗ trợ tra cứu thông tin quyền lợi khám chữa bệnh. |
| **Giới thiệu người mới** | **Member-Get-Member (MGM)** | Chương trình tiếp thị lan tỏa: kiều bào giới thiệu bạn bè cùng nhận mã giảm giá 30 TWD cho đơn hàng bưu cục đầu tiên. |
| **Luật bảo vệ dữ liệu cá nhân** | **Taiwan PDPA (個資法)** | Đạo luật bảo vệ dữ liệu người tiêu dùng của Đài Loan; bắt buộc hệ thống phải xin đồng thuận (Consent) minh bạch trước khi thu thập SĐT hoặc gửi tin tiếp thị. |
| **Hóa giải nghi ngờ lừa đảo** | **Anti-Fraud (防詐騙)** | Biện pháp bảo chứng uy tín thương hiệu chính hãng: hiển thị Mã số thuế doanh nghiệp (統一編號) và tài khoản LINE Official Account tick xanh/xám trong chat. |
