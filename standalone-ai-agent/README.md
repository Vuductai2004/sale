# Standalone AI Agent Engine

Gói mã nguồn độc lập của **Bộ 3 AI Agent Thương Mại Điện Tử (Marketing, Sales, Customer Care)** được bóc tách hoàn toàn khỏi các tầng giao diện (Next.js Web Console) và Cổng API (Fastify), cho phép nhúng trực tiếp vào bất kỳ hệ thống Node.js/TypeScript nào khác.

---

## 📁 Cấu Trúc Thư Mục

```text
standalone-ai-agent/
├── package.json               # Cấu hình độc lập (chỉ cần node, pg, ioredis, zod)
├── tsconfig.json              # Path aliases nội bộ
├── src/
│   ├── index.ts               # SDK Entrypoint xuất khẩu toàn bộ Agents & Core
│   ├── demo.ts                # Kịch bản chạy thử nghiệm độc lập 3 Agent
│   ├── agents/                # Bộ não 3 Agent (chuyển từ worker/src/runtime)
│   │   ├── care/              # Customer Care Agent (FAQ, Tra cứu đơn, Leo thang)
│   │   ├── sales/             # Sales Agent (Tư vấn, Báo giá, Check tồn kho, Giỏ hàng)
│   │   ├── marketing/         # Marketing Agent (Phân tích nhu cầu, Soạn chiến dịch)
│   │   └── shared/            # Giao thức bàn giao chéo (Cross-Domain Handoff)
│   ├── core/                  # Động cơ lõi điều phối & An toàn (core-engine)
│   │   ├── orchestrator/      # RevenueOrchestrator (Vòng đời 11 bước xác định)
│   │   ├── policy/            # PolicyEnforcementPoint (Kiểm soát quyền AUTH-0..AUTH-5)
│   │   ├── durability/        # EffectGuard (Chống trùng tác vụ trừ tiền/tạo đơn)
│   │   └── workflow/          # MemoryWorkflowEngine & Task FSM
│   ├── skills/                # Danh mục kỹ năng nguyên tử & Schema JSON
│   ├── knowledge/             # Second Brain (Tri thức FAQ & Quy chế)
│   ├── adapters/              # Cổng kết nối ERP/Shopify/Kênh chat
│   └── database/              # Kiểu dữ liệu & In-memory Repositories
└── mock-erp/                  # Giả lập ERP/POS cho môi trường phát triển
```

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### 1. Cài đặt dependencies
```bash
cd standalone-ai-agent
pnpm install
# hoặc: npm install
```

### 2. Chạy Demo kiểm tra 3 Agent
```bash
pnpm demo
# hoặc: npx tsx src/demo.ts
```

---

## 🔌 Cách Nhúng Vào Dự Án Khác

Trong ứng dụng của bạn (ví dụ Express, NestJS, Bot Telegram/Zalo, v.v.):

```typescript
import { 
  createCareFactory, 
  createSalesFactory, 
  createMarketingFactory,
  RevenueOrchestrator,
  PolicyEnforcementPoint
} from 'standalone-ai-agent';

// 1. Khởi tạo Sales Agent Harness hoặc Orchestrator
const salesHarness = createSalesOfflineHarness();

// 2. Gọi kỹ năng kiểm tra tồn kho
const stock = await salesHarness.services.check_stock({
  tenant_id: 'your-tenant-uuid',
  sku: 'PROD-123'
});

console.log('Stock available:', stock);
```

---

## 🛡️ Các Cơ Chế An Toàn Đi Kèm
1. **PEP (Policy Enforcement Point)**: Chặn đứng mọi hành vi giảm giá dưới giá sàn hoặc hành động nhạy cảm khi chưa có người duyệt (`AUTH-4`).
2. **EffectGuard**: Đảm bảo một hành động sinh hiệu ứng phụ (trừ tiền, gửi email/SMS) không bao giờ bị thực thi 2 lần dù mạng retry nhiều lần.
3. **Fail-Closed**: Khi thiếu dữ liệu tin cậy từ ERP/chính sách, Agent từ chối an toàn thay vì tự bịa (hallucination).
