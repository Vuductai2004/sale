# BÁO CÁO TOÀN DIỆN: KIỂM TOÁN LỖI VÀ ĐỐI CHIẾU MÃ NGUỒN (COMPREHENSIVE BUG AUDIT & RECONCILIATION REPORT)
**Dự án:** AgentOS NovaMart Demo Platform  
**Nhánh làm việc:** `tai` (đối chiếu trực tiếp với `phong/feat/demo-live-3agent` tại commit `3a40819`)  
**Thời gian cập nhật:** 30/09/2026 - 08:35:00 (GMT+7)  
**Tác giả:** Đội ngũ phát triển (Tài & AI Pair Programmer)  
**Trạng thái kiểm thử:** 17/17 Turbo tasks PASS 100% trên nhánh `tai`  

---

## MỤC LỤC
1. [Tổng quan cập nhật từ phía Phong (Commits bd1bf83 -> 3a40819)](#i-tổng-quan-cập-nhật-từ-phía-phong)
2. [Bảng ma trận tổng hợp 25 Bug trên hệ thống (B-01 đến B-25)](#ii-ma-trận-tổng-hợp-25-bug-toàn-hệ-thống)
3. [Phân tích chi tiết từng lỗi & Giải pháp khắc phục](#iii-chi-tiết-từng-lỗi-nguyên-nhân--giải-pháp)
   - [Nhóm A: Lỗi cực kỳ nghiêm trọng (Critical / Blocker)](#nhóm-a-lỗi-cực-kỳ-nghiêm-trọng-critical--blocker)
   - [Nhóm B: Lỗi chức năng & hồi quy cao (High Priority)](#nhóm-b-lỗi-chức-năng--hồi-quy-cao-high-priority)
   - [Nhóm C: Lỗi giao diện, BFF & phân quyền (Medium Priority)](#nhóm-c-lỗi-giao-diện-bff--phân-quyền-medium-priority)
   - [Nhóm D: Lỗi nhỏ & cải thiện môi trường (Low Priority)](#nhóm-d-lỗi-nhỏ--cải-thiện-môi-trường-low-priority)
4. [Lộ trình khuyến nghị triển khai sửa lỗi (Action Plan)](#iv-lộ-trình-khuyến-nghị-triển-khai-sửa-lỗi)

---

## I. TỔNG QUAN CẬP NHẬT TỪ PHÍA PHONG

Tính đến thời điểm hiện tại, remote `phong/feat/demo-live-3agent` (đã được kéo về và theo dõi tại local branch `phong-latest`) đã đẩy thêm **23 commit mới** so với nhánh gốc:
- `bd1bf83`: Tái cấu trúc phân lớp generic demo, thêm migration `0012`, `0013`, tách kịch bản `smoke.mjs` (`--live` và `--offline`), viết lại `turn-classifier.ts`.
- `39999f4`: Bổ sung các bảng chiếu CRM & Company Projection (`company/overview`, `company/attention`, `company/ai-team`, `company/activity`, `company/integrations`).
- `9d4cb93`: `feat(ui-foundation): react primitives, i18n catalog and status vocabulary` - Di chuyển toàn bộ UI Primitives sang package dùng chung, bổ sung i18n Việt/Anh và status view vocabulary.
- `69369a7`: `refactor(consoles): adopt shared primitives and AuthLayout` - Tái cấu trúc console sử dụng primitives và trang sign-in tinh giản.
- `3a40819`: `test(consoles): component test harness` - Bổ sung Testing Library + jsdom test harness cho frontend.

⚠️ **KẾT QUẢ ĐỐI SOÁT:** Mặc dù Phong đã bổ sung rất nhiều tính năng giao diện và cấu trúc foundation mới, quá trình kiểm tra chéo đã phát hiện **25 lỗi thực tế**, trong đó có những lỗi hồi quy phá vỡ toàn bộ kịch bản demo tiếng Việt, gây sập giao diện Storefront khi nhân viên tiếp quản, và race condition làm hỏng kết quả chạy của Worker.

---

## II. MA TRẬN TỔNG HỢP 25 BUG TOÀN HỆ THỐNG

| Mã Bug | Mức độ | Module ảnh hưởng | Tóm tắt lỗi | Trạng thái khuyến nghị |
|:---:|:---:|:---|:---|:---:|
| **B-24** | 🔴 Critical | API / `turn-classifier.ts` | Tiền tệ và ngân sách tiếng Việt (`triệu`, `tr`, `đồng`, `đ`) bị vứt bỏ, sập tư vấn bán hàng | **Phải sửa ngay** |
| **B-20** | 🔴 Critical | Console / `storefront/page.tsx` | Thiếu `task_id` trong receipt `HUMAN_OWNED` làm sập UI chat khi Human Takeover | **Phải sửa ngay** |
| **B-23** | 🔴 Critical | Worker / `worker-polling.ts` | Race condition trong lease heartbeat khiến Task đã hoàn thành bị đánh dấu lỗi | **Phải sửa ngay** |
| **B-13** | 🔴 Critical | Scripts / `smoke.mjs` | `segment_id` dùng UUID làm sập validation `/^inactive_[1-9][0-9]*d$/` trong Smoke Test | **Phải sửa ngay** |
| **B-19** | 🔴 Critical | API / `approvals.ts` | Unbound Governance Setting ném 504 `PROVIDER_TIMEOUT` chặn đứng toàn bộ phê duyệt | **Phải sửa ngay** |
| **B-10** | 🟠 High | Console / `storefront/page.tsx` | Hàm `hasGroundedChatEntry` ẩn toàn bộ câu trả lời của Bot nếu không có citation | **Phải sửa ngay** |
| **B-16** | 🟠 High | API / `turn-classifier.ts` | Map từ khóa "máy tính" -> `"computers"`, trong khi catalog chỉ có `"laptops"` | **Phải sửa ngay** |
| **B-21** | 🟠 High | Database / `company-crm-projections.ts` | `getCustomerProfile` dùng `INNER JOIN` làm khách hàng mới bị lỗi HTTP 404 | **Phải sửa ngay** |
| **B-22** | 🟠 High | Console BFF / `route.ts` & Client | Whitelist proxy của BFF thiếu `/company/*`, chặn 100% màn hình Company mới | **Phải sửa ngay** |
| **B-11** | 🟠 High | Worker / `read-handlers.ts` | Bị revert cơ chế tìm kiếm đa từ khóa ("laptop msi" không ra kết quả) | **Phải sửa ngay** |
| **B-01** | 🟠 High | Worker / `faq-parser.ts` | Câu hỏi rỗng được chấm 1.0 (100%) tin cậy, trả lời sai lệch FAQ chăm sóc khách hàng | **Phải sửa ngay** |
| **B-08** | 🟠 High | API / `turn-classifier.ts` | Bỏ sót ký hiệu `đ` và từ viết tắt `tr` trong biểu thức chính quy số tiền | **Gộp vào B-24** |
| **B-09** | 🟠 High | API / `turn-classifier.ts` | Bắt buộc phải có từ `"cho/dùng cho"` mới nhận diện nhu cầu sử dụng | **Gộp vào B-24** |
| **B-14** | 🟠 High | Worker / `worker-bindings.ts` | Bỏ fallback `CARE_KNOWLEDGE_ROOT`, Marketing mất kết nối tới Second Brain | **Phải sửa ngay** |
| **B-15** | 🟠 High | API / `turn-classifier.ts` | Thiếu danh mục `monitors`, `storage` và use-case `office` trong taxonomy | **Gộp vào B-24** |
| **B-17** | 🟡 Medium | UI / `StatusBadge.tsx` | Không truyền `code` thì icon bị ép thành dấu chấm hỏi `?` (`HelpCircle`) | **Nên sửa** |
| **B-18** | 🟡 Medium | UI / `Tabs.tsx` | `activeTabId` không khớp thì tự chọn tab 0 gây lệch state điều hướng | **Nên sửa** |
| **B-25** | 🟡 Medium | Console Auth / `demo-provider.ts` | Hardcode `DEMO_TENANT_ID` chặn toàn bộ tenant thật đăng nhập | **Nên sửa** |
| **B-12** | 🟡 Medium | Scripts / `seed.mjs` | Chạy lệnh node trực tiếp trên Windows không tự nạp `.env` | *Đã sửa trên `tai`* |
| **B-03** | 🟡 Medium | Worker / `read-handlers.ts` | Thiếu chặn trần `discount_percent <= 100`, nguy cơ sinh giá âm | **Nên sửa** |
| **B-04** | 🟡 Medium | Console / `trace/page.tsx` | Truy cập qua query `?run_id=xxx` không tự động kích hoạt tải trace | **Nên sửa** |
| **B-05** | 🟡 Medium | Console / `operations/page.tsx` | Đổi qua lại giữa các hội thoại làm mất trạng thái lease của operator | **Nên sửa** |
| **B-02** | 🟡 Medium | Worker / `types.ts` & `catalog.ts` | Thiếu trường `specs` trong interface sản phẩm | *Đã sửa trên `tai`* |
| **B-06** | 🟢 Low | Mock ERP / `server.mjs` | Tra cứu khách hàng theo `key` ở chế độ non-demo bị thiếu | Cân nhắc |
| **B-07** | 🟢 Low | API / `demo-widget.ts` | Catalog projection loại bỏ các sản phẩm không có trường `use_case` | Cân nhắc |

---

## III. CHI TIẾT TỪNG LỖI, NGUYÊN NHÂN & GIẢI PHÁP

### NHÓM A: LỖI CỰC KỲ NGHIÊM TRỌNG (CRITICAL / BLOCKER)

#### 1. Bug B-24: Nhận diện tiền tệ và ngân sách tiếng Việt thất bại trong `turn-classifier.ts`
- **File:** [apps/api/src/routes/v1/turn-classifier.ts](file:///d:/New%20folder/apps/api/src/routes/v1/turn-classifier.ts)
- **Đoạn mã lỗi:**
  ```typescript
  function currencyHint(normalized: string): string | undefined {
    if (normalized.includes('$')) return 'USD';
    if (normalized.includes('€')) return 'EUR';
    if (normalized.includes('£')) return 'GBP';
    const match = normalized.match(
      /\b([a-z]{3})\b(?=\s*[0-9])|\b([a-z]{3})\b(?=\s*(?:under|below|for|to)\b)|\b[0-9][0-9.,]*\s*(?:million|m|billion|b|thousand|k|trieu|nghin)?\s*([a-z]{3})\b/i,
    );
    return (match?.[1] ?? match?.[2] ?? match?.[3])?.toUpperCase();
  }
  function budgetHint(normalized: string): SalesBudget | undefined {
    const currency = currencyHint(normalized);
    if (currency === undefined) return undefined;
    // ...
    const multiplier = unit === 'million' || unit === 'm' || unit === 'trieu' ? 1_000_000 : ...;
  }
  ```
- **Nguyên nhân gốc rễ:**
  1. `currencyHint` chỉ chấp nhận mã 3 ký tự `[a-z]{3}`. Từ tiếng Việt như `trieu` (5 ký tự), `dong` (4 ký tự) đều bị bỏ qua.
  2. Khi khách gõ: *"Tư vấn laptop dưới 20 triệu"*, `currencyHint` trả về `undefined`.
  3. Hàm `budgetHint` thấy `currency === undefined` thì **lập tức hủy luôn việc đọc số tiền** và trả về `undefined`.
  4. Đơn vị viết tắt `tr` bị bỏ sót khỏi regex hệ số nhân, khiến *"20tr vnd"* bị nhân với 1 thành `20 VND`.
  5. Trong [read-handlers.ts](file:///d:/New%20folder/apps/worker/src/runtime/sales/skills/read-handlers.ts), worker so khớp `list_price > advisorBudget.amount`. Với ngân sách 20 VND, toàn bộ laptop trong catalog (~18.900.000 VND) đều bị loại bỏ, bot văng lỗi `AUTHORITATIVE_SOURCE_UNAVAILABLE`.
- **Giải pháp khắc phục:**
  - Tự động nhận diện `VND` khi câu có các từ khóa tiếng Việt (`trieu`, `tr`, `nghin`, `k`, `d`, `dong`, `vnd`).
  - Bổ sung `tr` vào regex `(million|m|billion|b|thousand|k|trieu|nghin|tr)`.
  - Mặc định currency là `VND` cho tenant NovaMart nếu khách không chỉ định ngoại tệ khác.

---

#### 2. Bug B-20: Giao diện Storefront sập khi Human Takeover do thiếu `task_id` trong `HUMAN_OWNED`
- **File:** [apps/api/src/routes/v1/care-turn.ts:L316-L337](file:///d:/New%20folder/apps/api/src/routes/v1/care-turn.ts#L316-L337) và [apps/tenant-console/src/app/(app)/demo/storefront/page.tsx:L180-L218](file:///d:/New%20folder/apps/tenant-console/src/app/%28app%29/demo/storefront/page.tsx#L180-L218)
- **Đoạn mã lỗi:**
  - Phía API (`care-turn.ts`):
    ```typescript
    const receipt: TaskAcceptedResponse = {
      status: 'HUMAN_OWNED',
      conversation_id: session.conversation_id,
      correlation_id: resolvedCorrelationId,
    };
    ```
  - Phía Frontend (`storefront/page.tsx`):
    ```typescript
    function parseReceiptLine(line: string): TaskAcceptedResponse | null {
      // ...
      if (typeof record.task_id !== 'string' || record.task_id.length === 0) return null;
      return record as unknown as TaskAcceptedResponse;
    }
    // ...
    if (!receipt) throw new Error('The storefront stream ended without a valid task receipt');
    ```
- **Nguyên nhân gốc rễ:** Khi nhân viên đã bật Human Takeover (`paused_takeover`), tin nhắn khách gửi đến không sinh task xử lý nền cho bot mà chuyển ngay cho con người, nên payload không có trường `task_id`. Nhưng hàm `parseReceiptLine` trên client lại bắt buộc `task_id` phải là string, dẫn đến trả về `null`. Kết thúc luồng stream, client ném ngoại lệ làm sập toàn bộ giao diện chat của khách.
- **Giải pháp khắc phục:** Cập nhật `parseReceiptLine` chấp nhận trạng thái `record.status === 'HUMAN_OWNED'`, hiển thị trạng thái *"Đã chuyển đến chuyên viên tư vấn"* thay vì báo lỗi kết nối.

---

#### 3. Bug B-23: Race condition trong Heartbeat của Worker Poller reject nhầm Task đã chạy xong
- **File:** [apps/worker/src/worker-polling.ts:L65-L85](file:///d:/New%20folder/apps/worker/src/worker-polling.ts#L65-L85)
- **Đoạn mã lỗi:**
  ```typescript
  const heartbeat = async (): Promise<void> => {
    if (settled || controller.signal.aborted) return;
    try {
      const current = await options.workflowRepository.getTask(tenant_id, taskRecord.run_id);
      const parked = current?.state === 'waiting' || current?.state === 'awaiting_human';
      if (
        current === null
        || (current.state !== 'running' && !parked)
        || current.lease_owner !== options.workerId
      ) {
        throw new Error('TASK_LEASE_NOT_HELD: execution lease is no longer owned by this worker');
      }
  ```
- **Nguyên nhân gốc rễ:** Khi `processTask` hoàn tất, nó chuyển trạng thái task trong cơ sở dữ liệu sang `'completed'`. Nếu timer heartbeat kích hoạt trước khi promise của `processTask` resolve hoàn toàn, heartbeat thấy `current.state === 'completed'` (khác `'running'`), liền ném lỗi `TASK_LEASE_NOT_HELD`, gọi `controller.abort()` và reject `leaseLost`. `Promise.race([taskPromise, leaseLost])` bắt phải ngoại lệ này và ghi nhận task thất bại dù thực tế đã chạy thành công!
- **Giải pháp khắc phục:** Nếu `current?.state === 'completed' || current?.state === 'failed'`, heartbeat chỉ cần gọi `stopHeartbeat()` và thoát êm.

---

#### 4. Bug B-13: `segment_id` dùng UUID làm sập validation trong Smoke Test
- **File:** [scripts/demo/smoke.mjs:L226](file:///d:/New%20folder/scripts/demo/smoke.mjs#L226) vs [apps/worker/src/runtime/marketing/factory.ts:L178-L185](file:///d:/New%20folder/apps/worker/src/runtime/marketing/factory.ts#L178-L185)
- **Đoạn mã lỗi:**
  - `smoke.mjs`:
    ```javascript
    segment_id: stableUuid('segment', 'inactive90'),
    ```
  - `factory.ts`:
    ```typescript
    if (typeof segment_id !== 'string' || !/^inactive_[1-9][0-9]*d$/.test(segment_id)) {
      throw new OrchestratorError('VALIDATION_FAILED', 'campaign.requested segment_id must be a server-normalized inactive_Nd segment');
    }
    ```
- **Nguyên nhân gốc rễ:** `smoke.mjs` truyền UUID 36 ký tự (ví dụ `3e70cfeb-...`), trong khi worker `factory.ts` dùng biểu thức chính quy bắt buộc phải có dạng `inactive_90d`. Kịch bản chạy `node scripts/demo/smoke.mjs --live` sẽ bị từ chối ngay lập tức tại bước Marketing.
- **Giải pháp khắc phục:** Sửa `smoke.mjs` truyền `segment_id: 'inactive_90d'`.

---

#### 5. Bug B-19: Unbound Governance Setting ném lỗi 504 chặn đứng toàn bộ phê duyệt
- **File:** [apps/api/src/routes/v1/approvals.ts:L188-L214](file:///d:/New%20folder/apps/api/src/routes/v1/approvals.ts#L188-L214)
- **Đoạn mã lỗi:**
  ```typescript
  if (deps.governance === undefined) {
    throw new Error('GOVERNANCE_SETTINGS_UNBOUND');
  }
  // Trong catch:
  return fail('PROVIDER_TIMEOUT', 'governance settings could not be read');
  ```
- **Nguyên nhân gốc rễ:** `governance` được định nghĩa là port tùy chọn (`readonly governance?: GovernancePort`). Khi chạy ở môi trường test hoặc tenant chưa cấu hình chính sách quản trị, mã nguồn ném lỗi và biến thành mã lỗi HTTP 504 `PROVIDER_TIMEOUT`, làm tê liệt tính năng duyệt chiến dịch.
- **Giải pháp khắc phục:** Khi `deps.governance === undefined`, fallback về mặc định an toàn: `require_distinct_approver = false`.

---

### NHÓM B: LỖI CHỨC NĂNG & HỒI QUY CAO (HIGH PRIORITY)

#### 6. Bug B-10: Giao diện Storefront tự động giấu câu trả lời của Bot nếu không có trích dẫn nguồn
- **File:** [apps/tenant-console/src/app/(app)/demo/storefront/page.tsx](file:///d:/New%20folder/apps/tenant-console/src/app/%28app%29/demo/storefront/page.tsx)
- **Nguyên nhân:** Khi bot trả lời câu chào hỏi, câu hỏi làm rõ (clarification prompt) hoặc hướng dẫn chung, bot chỉ trả lời `text` mà không kèm mảng `sources`. Hàm `hasGroundedChatEntry` trả về `false` và UI giấu luôn câu trả lời của bot, hiển thị thông báo xám: *"Unavailable: the task completed without a grounded answer and citation"*.
- **Giải pháp khắc phục:** Cho phép hiển thị nội dung `entry.text` nếu là tin nhắn đối thoại thông thường hoặc câu hỏi làm rõ nhu cầu.

#### 7. Bug B-16: Category Taxonomy map "máy tính" -> "computers" trong khi catalog chỉ có "laptops"
- **File:** [apps/api/src/routes/v1/turn-classifier.ts](file:///d:/New%20folder/apps/api/src/routes/v1/turn-classifier.ts)
- **Nguyên nhân:** Bảng taxonomy của Phong gán regex `may tinh` thành danh mục `'computers'`. Trong khi đó, toàn bộ sản phẩm máy tính của NovaMart trong [novamart.json](file:///d:/New%20folder/services/mock-erp/src/demo/novamart.json) đều được phân loại là `'laptops'`. Khi khách gõ *"Tư vấn máy tính văn phòng"*, bộ lọc của Sales worker sẽ tìm danh mục `computers` và loại bỏ 100% sản phẩm.
- **Giải pháp khắc phục:** Map các từ khóa máy tính/laptop về danh mục hợp lệ trong catalog: `'laptops'`.

#### 8. Bug B-21: `getCustomerProfile` trả về 404 cho khách hàng hợp lệ do `INNER JOIN`
- **File:** [packages/database/src/repositories/company-crm-projections.ts:L289-L292](file:///d:/New%20folder/packages/database/src/repositories/company-crm-projections.ts#L289-L292)
- **Nguyên nhân:** Câu lệnh SQL truy vấn: `FROM agentos.customer_360_profiles p JOIN agentos.customers c ON ...`. Nếu khách hàng có trong `customers` nhưng chưa có hàng tổng hợp trong bảng `customer_360_profiles`, truy vấn trả về rỗng và API trả về `404 Not Found`.
- **Giải pháp khắc phục:** Chuyển sang `FROM agentos.customers c LEFT JOIN agentos.customer_360_profiles p ON p.tenant_id = c.tenant_id AND p.customer_id = c.id WHERE c.tenant_id = $1 AND c.id = $2`.

#### 9. Bug B-22: Các endpoint Company Projection bị thiếu trong Whitelist Proxy của Tenant Console BFF
- **File:** [apps/tenant-console/src/app/api/v1/[...path]/route.ts](file:///d:/New%20folder/apps/tenant-console/src/app/api/v1/%5B...path%5D/route.ts) & [tenant-console-client.ts](file:///d:/New%20folder/apps/tenant-console/src/lib/tenant-console-client.ts)
- **Nguyên nhân:** Phong đã xây dựng các route backend `/company/overview`, `/company/attention`, `/company/ai-team`, `/company/activity`, `/company/integrations`, nhưng trong file proxy `route.ts` của BFF, hàm `isAllowedPath` không bổ sung regex `company/*`. Mọi request từ trình duyệt đều bị chặn với mã lỗi 404.
- **Giải pháp khắc phục:** Thêm `^company\/(?:overview|attention|ai-team|activity|integrations|settings\/governance)$` vào `isAllowedPath()` và bổ sung các hàm tương ứng trong `tenantConsoleClient`.

#### 10. Bug B-11: Revert mất tính năng tìm kiếm đa từ khóa trong `read-handlers.ts`
- **File:** [apps/worker/src/runtime/sales/skills/read-handlers.ts](file:///d:/New%20folder/apps/worker/src/runtime/sales/skills/read-handlers.ts)
- **Nguyên nhân:** Commit của Phong dùng `searchable.includes(query)`. Khi tìm kiếm `"laptop msi"`, chuỗi con không khớp liên tục với `"MSI Modern 14 Laptop"`, làm rớt sản phẩm.
- **Giải pháp khắc phục:** Khôi phục cơ chế token hóa: `terms.every(term => searchable.includes(term))`.

#### 11. Bug B-01: Lỗi tính điểm FAQ chấm 100% tin cậy cho câu hỏi rỗng
- **File:** [apps/worker/src/runtime/care/skills/faq-parser.ts:L67-L71](file:///d:/New%20folder/apps/worker/src/runtime/care/skills/faq-parser.ts#L67-L71) & [faq-handler.ts:L52-L60](file:///d:/New%20folder/apps/worker/src/runtime/care/skills/faq-handler.ts#L52-L60)
- **Nguyên nhân:** Khi chuỗi tìm kiếm rỗng `""`, `string.includes("")` luôn trả về `true` cho mọi câu FAQ trong kho, khiến bot chăm sóc khách hàng đưa ra câu trả lời sai.
- **Giải pháp khắc phục:** Kiểm tra `queryText.trim().length === 0` thì trả về điểm 0. Chuyển chữ thường (`toLowerCase()`) trước khi so khớp.

#### 12. Bug B-14: Worker Marketing mất đường dẫn Second Brain do bỏ fallback `CARE_KNOWLEDGE_ROOT`
- **File:** [apps/worker/src/worker-bindings.ts:L452-L460](file:///d:/New%20folder/apps/worker/src/worker-bindings.ts#L452-L460)
- **Nguyên nhân:** Code chỉ đọc `env.KNOWLEDGE_ROOT`. Nếu biến này chưa được cấu hình trong `.env`, đường dẫn tri thức của Marketing bị `undefined`.
- **Giải pháp khắc phục:** Giữ fallback: `env.KNOWLEDGE_ROOT ?? env.CARE_KNOWLEDGE_ROOT`.

---

### NHÓM C: LỖI GIAO DIỆN, BFF & PHÂN QUYỀN (MEDIUM PRIORITY)

#### 13. Bug B-17: Tất cả StatusBadge không truyền `code` bị render sai icon thành HelpCircle (`?`)
- **File:** [packages/ui-foundation/src/react/StatusBadge.tsx](file:///d:/New%20folder/packages/ui-foundation/src/react/StatusBadge.tsx) & [status-view.ts](file:///d:/New%20folder/packages/ui-foundation/src/status-view.ts)
- **Nguyên nhân:** Khi gọi `<StatusBadge label="Integrated" tone="success" />`, `code` không được truyền, component fallback về `{ icon: 'HelpCircle' }`. Dẫn đến trên giao diện xuất hiện hàng loạt icon dấu hỏi cạnh các trạng thái thành công ("Integrated", "Active").
- **Giải pháp khắc phục:** Nếu không có `code`, tự động map icon mặc định theo `tone`: `success -> CheckCircle2`, `danger -> XCircle`, `warning -> AlertTriangle`, `info -> Clock`.

#### 14. Bug B-18: `Tabs.tsx` fallback sai khi `activeTabId` không tồn tại
- **File:** [packages/ui-foundation/src/react/Tabs.tsx](file:///d:/New%20folder/packages/ui-foundation/src/react/Tabs.tsx)
- **Nguyên nhân:** Khi `activeTabId` truyền vào một id không tồn tại trong danh sách tabs, hàm `findIndex` trả về `-1`, `Math.max(0, -1)` thành `0`. Component tự động chọn tab đầu tiên và render panel 0, gây bất đồng bộ giữa URL query và UI tab.
- **Giải pháp khắc phục:** Kiểm tra `findIndex >= 0`, nếu không tìm thấy thì giữ `undefined` hoặc chỉ fallback khi không ở chế độ controlled.

#### 15. Bug B-25: Hardcode `DEMO_TENANT_ID` chặn mọi tenant khác đăng nhập
- **File:** [apps/tenant-console/src/lib/auth/demo-provider.ts:L114](file:///d:/New%20folder/apps/tenant-console/src/lib/auth/demo-provider.ts#L114)
- **Nguyên nhân:** Hàm `parseAuthSession` kiểm tra cứng `tenantId !== DEMO_TENANT_ID`. Bất kỳ tenant thực tế nào ngoài demo khi đăng nhập đều bị BFF từ chối và quăng lỗi `502 DEMO_UNAVAILABLE`.
- **Giải pháp khắc phục:** Cho phép nhận `tenantId` hợp lệ từ session token mà không bị gán cứng vào UUID của demo tenant.

#### 16. Bug B-03: Thiếu chặn trần phần trăm giảm giá `<= 100%`
- **File:** [apps/worker/src/runtime/sales/skills/read-handlers.ts:L608](file:///d:/New%20folder/apps/worker/src/runtime/sales/skills/read-handlers.ts#L608)
- **Nguyên nhân:** Chỉ kiểm tra `requested_discount_percent > 0` mà không kiểm tra `<= 100`. Nếu người dùng yêu cầu giảm 150%, giá sẽ ra số âm.
- **Giải pháp khắc phục:** Thêm điều kiện `input.requested_discount_percent <= 100`.

#### 17. Bug B-04: Màn hình Trace Console không tự tải khi có URL `?run_id=xxx`
- **File:** [apps/tenant-console/src/app/demo/trace/page.tsx](file:///d:/New%20folder/apps/tenant-console/src/app/demo/trace/page.tsx)
- **Nguyên nhân:** Có nhận param `run_id` trên thanh địa chỉ nhưng thiếu `useEffect` tự động gọi API `loadTrace()` khi mở trang.
- **Giải pháp khắc phục:** Thêm hook `useEffect` kích hoạt tải vết thực thi khi có `run_id`.

#### 18. Bug B-05: Màn hình Operations Console làm mất trạng thái lease khi chọn lại hội thoại
- **File:** [apps/tenant-console/src/app/demo/operations/page.tsx](file:///d:/New%20folder/apps/tenant-console/src/app/demo/operations/page.tsx)
- **Nguyên nhân:** Gọi `setLease(null)` mỗi khi chuyển đổi giữa các hội thoại đang tiếp quản (`paused_takeover`), làm mất quyền can thiệp của operator.

---

### NHÓM D: LỖI NHỎ & CẢI THIỆN MÔI TRƯỜNG (LOW PRIORITY)

#### 19. Bug B-06: Tra cứu khách hàng theo `key` ở chế độ non-demo trong Mock ERP
- **File:** [services/mock-erp/src/server.mjs](file:///d:/New%20folder/services/mock-erp/src/server.mjs)
- **Khắc phục:** Bổ sung tìm kiếm linh hoạt theo cả `customer_id`, `email`, và `key`.

#### 20. Bug B-07: Catalog projection loại bỏ sản phẩm không có trường `use_case`
- **File:** [apps/api/src/routes/v1/demo-widget.ts](file:///d:/New%20folder/apps/api/src/routes/v1/demo-widget.ts)
- **Khắc phục:** Fallback `use_case: item.use_case ?? 'general'`.

---

## IV. LỘ TRÌNH KHUYẾN NGHỊ TRIỂN KHAI SỬA LỖI

### Giai đoạn 1: Vá ngay các lỗi Block kịch bản Demo trực tiếp (Trong ngày hôm nay)
1. **Sửa Bug B-24 & B-16:** Viết lại bộ regex nhận diện tiền tệ, ngân sách và phân loại danh mục trong `turn-classifier.ts` để thông suốt kịch bản tư vấn bằng tiếng Việt tự nhiên.
2. **Sửa Bug B-20:** Cập nhật `storefront/page.tsx` và `care-turn.ts` xử lý êm receipt `HUMAN_OWNED` khi con người tiếp quản hội thoại.
3. **Sửa Bug B-23:** Khắc phục race condition heartbeat trong `worker-polling.ts` ngăn chặn hủy nhầm task đã chạy xong.
4. **Sửa Bug B-13:** Chuẩn hóa `segment_id` trong `smoke.mjs` thành `'inactive_90d'`.
5. **Sửa Bug B-19:** Fallback an toàn cho governance port trong `approvals.ts`.

### Giai đoạn 2: Tối ưu hiển thị và liên kết BFF (Sau giai đoạn 1)
1. **Sửa Bug B-22:** Bổ sung route proxy `/company/*` vào BFF của Tenant Console.
2. **Sửa Bug B-21:** Đổi `INNER JOIN` thành `LEFT JOIN` trong truy vấn `getCustomerProfile`.
3. **Sửa Bug B-10 & B-17:** Hiển thị tin nhắn đối thoại thông thường trên Storefront và map icon phù hợp theo tone màu của `StatusBadge`.

---
*Báo cáo được lưu trữ và cập nhật trực tiếp tại: `docs/demo/BUG_AUDIT_REPORT.md`.*
