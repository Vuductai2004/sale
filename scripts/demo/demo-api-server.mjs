import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_PATH = resolve(__dirname, '../../services/mock-erp/src/demo/novamart.json');

let demoPack = { products: [], customers: [], orders: [], campaigns: [], cases: [] };
try {
  demoPack = JSON.parse(readFileSync(PACK_PATH, 'utf8'));
} catch (err) {
  console.warn('Warning: Could not read novamart.json, using fallback data', err);
}

const PORT = 4000;
const TENANT_ID = '99999999-9999-4999-8999-999999999999';

const DEMO_ACCOUNTS = {
  'admin@novamart.demo': {
    password: 'DemoAdmin@2026',
    audience: 'company',
    name: 'NovaMart Store Admin',
    role: 'company_admin',
  },
  'company.admin@example.test': {
    password: 'company-password-123',
    audience: 'company',
    name: 'Company Admin',
    role: 'company_admin',
  },
  'platform@agentos.demo': {
    password: 'DemoPlatform@2026',
    audience: 'platform',
    name: 'AgentOS Platform Admin',
    role: 'platform_admin',
  },
  'platform.admin@example.test': {
    password: 'platform-password-123',
    audience: 'platform',
    name: 'Platform Admin',
    role: 'platform_admin',
  },
};

const COMPANY_PERMISSIONS = [
  'campaign:draft',
  'conversation:takeover',
  'customer:read',
  'run:read',
  'telemetry:read',
  'approval:read',
  'approval:decide',
];

const PLATFORM_PERMISSIONS = [
  'platform:admin',
  'run:read',
  'run:retry',
  'run:reconcile',
  'telemetry:read',
];

const sessions = new Map();

// In-memory state for interactive demo
let takeoverState = {
  isTakenOver: false,
  operatorId: null,
  leaseExpiresAt: null,
};

let approvals = [
  {
    approval_id: 'appr-demo-001',
    tenant_id: TENANT_ID,
    action_type: 'DISCOUNT_VOUCHER_OVER_CAP',
    agent_id: 'sales-advisor',
    customer_id: 'cust-nm-002',
    customer_name: 'Nguyễn Văn Minh',
    description: 'Yêu cầu phát voucher giảm 15% (350.000 VND) vượt hạn mức ủy quyền 200.000 VND để chốt đơn giỏ hàng laptop Nova Studio 14',
    status: 'PENDING',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    payload: {
      sku_id: 'NM-L01-BLK',
      list_price: 18900000,
      p_floor: 18900000,
      voucher_code: 'RET-350K',
      discount_amount: 350000,
    },
  },
  {
    approval_id: 'appr-demo-002',
    tenant_id: TENANT_ID,
    action_type: 'RETURN_EXCEPTION_OVER_WINDOW',
    agent_id: 'care-support',
    customer_id: 'cust-nm-005',
    customer_name: 'Trần Thị Thu Thảo',
    description: 'Chấp nhận đổi trả sau 16 ngày (quá hạn chính sách 14 ngày) do sự cố bảo hành được xác nhận bởi trung tâm HCM Hub',
    status: 'PENDING',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    payload: {
      order_id: 'ORD-2026-0915-001',
      original_purchase_at: '2026-09-18T10:00:00Z',
      reason: 'Lỗi quạt tản nhiệt trong tuần đầu tiên',
    },
  },
];

let conversationMessages = [
  {
    message_id: 'msg-1',
    conversation_id: 'conv-101',
    sender_type: 'CUSTOMER',
    sender_id: 'cust-nm-002',
    content: 'Chào shop, mình đang tìm mua một chiếc laptop tầm 20 triệu để làm đồ họa Photoshop và dựng video cơ bản.',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    message_id: 'msg-2',
    conversation_id: 'conv-101',
    sender_type: 'AGENT',
    sender_id: 'sales-advisor',
    content: 'Dạ chào anh Minh! Với ngân sách 20 triệu và nhu cầu đồ họa Photoshop, dựng video, em gợi ý mẫu **Nova Studio 14 Creator (i7 / 16GB RAM / RTX 4050 / 512GB SSD)**. Máy đang có sẵn giá niêm yết 18.900.000 VND, còn 8 máy tại kho TP.HCM. Anh có muốn em giữ hàng hoặc xuất báo giá ưu đãi không ạ?',
    created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    message_id: 'msg-3',
    conversation_id: 'conv-101',
    sender_type: 'CUSTOMER',
    sender_id: 'cust-nm-002',
    content: 'Mẫu này có được tặng thêm chuột không dây hay giảm thêm chút đỉnh để mình chốt luôn trong hôm nay được không?',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = url.pathname;

  // Health check
  if (pathname === '/health' || pathname === '/api/health') {
    sendJson(res, 200, { status: 'healthy', version: '1.0.0-demo', timestamp: new Date().toISOString() });
    return;
  }

  // Auth: POST /api/v1/demo/login
  if (req.method === 'POST' && pathname === '/api/v1/demo/login') {
    const body = await parseBody(req);
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const account = DEMO_ACCOUNTS[email];
    if (!account || account.password !== password) {
      sendJson(res, 401, { error: 'AUTHENTICATION_FAILED', message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    const token = `demo-token-${randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const session = {
      access_token: token,
      identity: {
        user_id: `user-${email.split('@')[0]}`,
        email: email,
        display_name: account.name,
      },
      membership: {
        tenant_id: TENANT_ID,
        tenant_name: 'NovaMart Retail Vietnam',
        role: account.role,
        scope: account.audience,
      },
      permissions: account.audience === 'company' ? COMPANY_PERMISSIONS : PLATFORM_PERMISSIONS,
      expires_at: expiresAt,
    };

    sessions.set(token, session);
    sendJson(res, 200, session);
    return;
  }

  // Auth: GET /api/v1/demo/session
  if (req.method === 'GET' && pathname === '/api/v1/demo/session') {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/, '');
    const session = sessions.get(token);
    if (!session) {
      // Allow fallback session for demo ease
      sendJson(res, 200, {
        identity: { user_id: 'user-admin', email: 'admin@novamart.demo', display_name: 'NovaMart Store Admin' },
        membership: { tenant_id: TENANT_ID, tenant_name: 'NovaMart Retail Vietnam', role: 'company_admin', scope: 'company' },
        permissions: COMPANY_PERMISSIONS,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      });
      return;
    }
    sendJson(res, 200, session);
    return;
  }

  // Auth: POST /api/v1/demo/logout
  if (req.method === 'POST' && pathname === '/api/v1/demo/logout') {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/, '');
    sessions.delete(token);
    sendJson(res, 200, { ok: true });
    return;
  }

  // Company Overview: GET /api/v1/company/overview
  if (req.method === 'GET' && pathname === '/api/v1/company/overview') {
    sendJson(res, 200, {
      metrics: {
        runs: 38,
        completed_runs: 35,
        revenue: 148500000,
        active_conversations: 4,
        pending_approvals: approvals.filter((a) => a.status === 'PENDING').length,
      },
      agents: [
        {
          domain: 'sales',
          name: 'Sales Advisor (Tư vấn bán hàng)',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 18,
          conversions_today: 7,
          revenue_attributed: 125400000,
        },
        {
          domain: 'care',
          name: 'Customer Care (Chăm sóc & Giữ chân)',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 12,
          retention_rate: '94%',
          revenue_attributed: 23100000,
        },
        {
          domain: 'marketing',
          name: 'Campaign Manager (Tiếp thị đa kênh)',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 8,
          reach_count: 142,
          revenue_attributed: 0,
        },
      ],
      attention: approvals.filter((a) => a.status === 'PENDING').map((a) => ({
        id: a.approval_id,
        level: 'WARNING',
        title: a.action_type,
        message: a.description,
        created_at: a.created_at,
      })),
      activity: [
        {
          id: 'act-1',
          agent: 'Sales Advisor',
          type: 'Grounded Quote Issued',
          detail: 'Báo giá SKU NM-L01-BLK (18.900.000 VND) khớp giá sàn P_floor',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: 'act-2',
          agent: 'Customer Care',
          type: 'Retention Offer Generated',
          detail: 'Đề xuất voucher RET-120K cho khách hàng có nguy cơ rời bỏ',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: 'act-3',
          agent: 'Marketing Manager',
          type: 'RFM Audience Segmented',
          detail: 'Tạo tệp 100 khách hàng HIBERNATING cho chiến dịch email Zalo',
          timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        },
      ],
    });
    return;
  }

  // Company AI Team: GET /api/v1/company/ai-team
  if (req.method === 'GET' && pathname === '/api/v1/company/ai-team') {
    sendJson(res, 200, {
      agents: [
        {
          domain: 'sales',
          name: 'Sales Advisor',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 18,
          description: 'Tư vấn sản phẩm thông minh, bóc tách ngân sách, kiểm tra giá sàn P_floor và tồn kho ERP.',
        },
        {
          domain: 'care',
          name: 'Customer Care',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 12,
          description: 'Hỗ trợ đơn hàng, xử lý khiếu nại, phát hành ưu đãi giữ chân và bàn giao người thật (Human takeover).',
        },
        {
          domain: 'marketing',
          name: 'Campaign Manager',
          status: 'ACTIVE',
          enabled: true,
          readiness: 'READY',
          runs_today: 8,
          description: 'Phân tích phân khúc khách hàng RFM 360, lập kế hoạch chiến dịch kích hoạt lại khách hàng ngủ đông.',
        },
      ],
    });
    return;
  }

  // Company Attention: GET /api/v1/company/attention
  if (req.method === 'GET' && pathname === '/api/v1/company/attention') {
    sendJson(res, 200, {
      items: approvals.filter((a) => a.status === 'PENDING').map((a) => ({
        id: a.approval_id,
        level: 'WARNING',
        title: a.action_type,
        message: a.description,
        created_at: a.created_at,
      })),
    });
    return;
  }

  // Company Activity: GET /api/v1/company/activity
  if (req.method === 'GET' && pathname === '/api/v1/company/activity') {
    sendJson(res, 200, {
      items: [
        {
          id: 'act-1',
          agent: 'Sales Advisor',
          type: 'Grounded Quote Issued',
          detail: 'Báo giá SKU NM-L01-BLK (18.900.000 VND) khớp giá sàn P_floor',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: 'act-2',
          agent: 'Customer Care',
          type: 'Retention Offer Generated',
          detail: 'Đề xuất voucher RET-120K cho khách hàng có nguy cơ rời bỏ',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ],
      next_cursor: null,
    });
    return;
  }

  // Customers: GET /api/v1/customers
  if (req.method === 'GET' && pathname.startsWith('/api/v1/customers')) {
    const customers = (demoPack.customers || []).map((c) => ({
      customer_id: c.customer_id,
      name: c.name || `Khách hàng ${c.customer_id}`,
      email: c.email || `${c.customer_id.toLowerCase()}@novamart.demo`,
      phone: c.phone || '0901234567',
      rfm_segment: c.rfm_segment || 'LOYAL',
      total_spent: c.lifetime_spend || 25400000,
      orders_count: c.orders_count || 4,
      last_active_at: c.last_order_at || '2026-09-20T10:00:00Z',
      marketing_consent: c.marketing_opt_in ?? true,
    }));
    sendJson(res, 200, { items: customers, total: customers.length });
    return;
  }

  // Conversations: GET /api/v1/conversations
  if (req.method === 'GET' && pathname === '/api/v1/conversations') {
    sendJson(res, 200, {
      items: [
        {
          conversation_id: 'conv-101',
          customer_id: 'cust-nm-002',
          customer_name: 'Nguyễn Văn Minh',
          channel: 'WEB_CHAT',
          active_agent: takeoverState.isTakenOver ? 'human_operator' : 'sales-advisor',
          status: takeoverState.isTakenOver ? 'HUMAN_TAKEOVER' : 'ACTIVE',
          takeover_operator_id: takeoverState.operatorId,
          lease_expires_at: takeoverState.leaseExpiresAt,
          last_message: conversationMessages[conversationMessages.length - 1]?.content || '',
          last_message_at: conversationMessages[conversationMessages.length - 1]?.created_at || new Date().toISOString(),
          unread_count: 0,
        },
      ],
      total: 1,
    });
    return;
  }

  // Conversation messages: GET /api/v1/conversations/:id/messages
  if (req.method === 'GET' && pathname.match(/^\/api\/v1\/conversations\/[^/]+\/messages/)) {
    sendJson(res, 200, { items: conversationMessages });
    return;
  }

  // Conversation summary: GET /api/v1/conversations/:id/summary
  if (req.method === 'GET' && pathname.match(/^\/api\/v1\/conversations\/[^/]+\/summary/)) {
    sendJson(res, 200, {
      conversation_id: 'conv-101',
      summary: 'Khách hàng Nguyễn Văn Minh đang quan tâm laptop làm đồ họa tầm 20 triệu. Sales Advisor đã tư vấn mẫu Nova Studio 14 Creator giá 18.9 triệu. Khách đang đàm phán thêm ưu đãi giảm giá hoặc phụ kiện kèm theo.',
      customer_sentiment: 'POSITIVE',
      purchase_intent: 'HIGH',
      recommended_action: 'Cân nhắc tặng chuột không dây hoặc voucher 150k để chốt đơn ngay',
    });
    return;
  }

  // Conversation Takeover: POST /api/v1/conversations/:id/takeover
  if (req.method === 'POST' && pathname.match(/^\/api\/v1\/conversations\/[^/]+\/takeover$/)) {
    const body = await parseBody(req);
    takeoverState = {
      isTakenOver: true,
      operatorId: body.operator_id || 'operator-demo-1',
      leaseExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
    };
    sendJson(res, 200, {
      conversation_id: 'conv-101',
      status: 'HUMAN_TAKEOVER',
      operator_id: takeoverState.operatorId,
      taken_over_at: new Date().toISOString(),
      lease_expires_at: takeoverState.leaseExpiresAt,
    });
    return;
  }

  // Takeover Heartbeat: POST /api/v1/conversations/:id/takeover/heartbeat
  if (req.method === 'POST' && pathname.match(/^\/api\/v1\/conversations\/[^/]+\/takeover\/heartbeat$/)) {
    takeoverState.leaseExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    sendJson(res, 200, {
      conversation_id: 'conv-101',
      status: 'HUMAN_TAKEOVER',
      operator_id: takeoverState.operatorId,
      lease_expires_at: takeoverState.leaseExpiresAt,
    });
    return;
  }

  // Conversation Resume: POST /api/v1/conversations/:id/resume
  if (req.method === 'POST' && pathname.match(/^\/api\/v1\/conversations\/[^/]+\/resume$/)) {
    takeoverState = { isTakenOver: false, operatorId: null, leaseExpiresAt: null };
    sendJson(res, 200, {
      conversation_id: 'conv-101',
      status: 'ACTIVE',
      resumed_at: new Date().toISOString(),
    });
    return;
  }

  // Approvals: GET /api/v1/approvals
  if (req.method === 'GET' && pathname === '/api/v1/approvals') {
    sendJson(res, 200, { items: approvals });
    return;
  }

  // Approval Decision: POST /api/v1/approvals/:id/decide
  if (req.method === 'POST' && pathname.match(/^\/api\/v1\/approvals\/[^/]+\/decide$/)) {
    const parts = pathname.split('/');
    const approvalId = parts[parts.indexOf('approvals') + 1];
    const body = await parseBody(req);
    const decision = body.decision || 'APPROVED';

    const appr = approvals.find((a) => a.approval_id === approvalId);
    if (appr) {
      appr.status = decision;
      appr.decided_at = new Date().toISOString();
      appr.decided_by = 'admin@novamart.demo';
      appr.review_comment = body.comment || 'Phê duyệt từ giao diện Demo Console';
    }

    sendJson(res, 200, {
      approval_id: approvalId,
      status: decision,
      decided_at: new Date().toISOString(),
    });
    return;
  }

  // Telemetry: GET /api/v1/telemetry/kpi-snapshot
  if (req.method === 'GET' && pathname === '/api/v1/telemetry/kpi-snapshot') {
    sendJson(res, 200, {
      window: '24h',
      metrics: {
        total_runs: 38,
        success_rate: 0.947,
        avg_latency_ms: 412,
        revenue_attributed_vnd: 148500000,
        cost_savings_vnd: 32000000,
        conversions_count: 11,
      },
      chart_data: [
        { time: '08:00', sales_runs: 2, care_runs: 1, mkt_runs: 0 },
        { time: '10:00', sales_runs: 5, care_runs: 3, mkt_runs: 2 },
        { time: '12:00', sales_runs: 4, care_runs: 2, mkt_runs: 1 },
        { time: '14:00', sales_runs: 7, care_runs: 4, mkt_runs: 3 },
        { time: '16:00', sales_runs: 6, care_runs: 2, mkt_runs: 2 },
      ],
    });
    return;
  }

  // Catalog: GET /api/v1/demo/catalog
  if (req.method === 'GET' && pathname === '/api/v1/demo/catalog') {
    const items = (demoPack.products || []).map((p) => ({
      sku_id: p.primary_sku || p.base_sku || p.product_id,
      name: p.name,
      brand: p.brand || 'NovaMart',
      category: p.category || 'laptops',
      use_case: p.use_case || 'general',
      description: p.description || p.name,
      currency: 'VND',
      list_price: p.list_price || 18900000,
      is_active: true,
    }));
    sendJson(res, 200, { items });
    return;
  }

  // Widget Mint: POST /api/v1/demo/widget-session
  if (req.method === 'POST' && pathname === '/api/v1/demo/widget-session') {
    const body = await parseBody(req);
    const persona = body.persona || 'anonymous';
    const sessionId = persona === 'C05' ? 'sess-novamart-c05' : (persona === 'C06' ? 'sess-novamart-c06' : `demo-anon-${randomUUID()}`);
    sendJson(res, 201, {
      session_id: sessionId,
      token: `widget-tok-${randomBytes(24).toString('hex')}`,
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    return;
  }

  // Storefront Stream: POST /api/v1/storefront/stream
  if (req.method === 'POST' && pathname === '/api/v1/storefront/stream') {
    const body = await parseBody(req);
    const message = body.message || '';
    const taskId = `task-${randomUUID()}`;
    const correlationId = `corr-${randomUUID()}`;

    // Record to conversation
    conversationMessages.push({
      message_id: `msg-${Date.now()}`,
      conversation_id: 'conv-101',
      sender_type: 'CUSTOMER',
      sender_id: 'cust-demo',
      content: message,
      created_at: new Date().toISOString(),
    });

    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'transfer-encoding': 'chunked',
      'access-control-allow-origin': '*',
    });

    const receipt = {
      task_id: taskId,
      correlation_id: correlationId,
      status: 'accepted',
    };
    res.write(`${JSON.stringify(receipt)}\n`);

    // Simulated grounded AI answer
    let answer = 'Dạ em chào anh/chị! Em là Sales Advisor từ NovaMart. Em có thể hỗ trợ anh/chị tìm dòng sản phẩm nào ạ?';
    const lower = message.toLowerCase();
    if (lower.includes('laptop') || lower.includes('đồ họa') || lower.includes('20 triệu') || lower.includes('20tr') || lower.includes('15tr')) {
      answer = 'Dạ chào anh! Với ngân sách tầm 20 triệu cho nhu cầu thiết kế đồ họa, em đề xuất chiếc **Nova Studio 14 Creator (i7 / 16GB RAM / RTX 4050 / 512GB SSD)**. Máy có giá niêm yết 18.900.000 VND (đảm bảo cam kết giá sàn P_floor). Hiện tại kho TP.HCM còn 8 máy sẵn sàng giao nhanh trong 2 giờ ạ!';
    } else if (lower.includes('bảo hành') || lower.includes('đổi trả') || lower.includes('lỗi')) {
      answer = 'Dạ về chính sách bảo hành, NovaMart áp dụng 1 đổi 1 trong 14 ngày đầu tiên nếu phát sinh lỗi từ nhà sản xuất. Anh/chị chỉ cần mang sản phẩm qua trung tâm bảo hành hoặc gửi mã đơn hàng để em hỗ trợ tạo phiếu đổi trả ngay nhé!';
    }

    conversationMessages.push({
      message_id: `msg-${Date.now() + 1}`,
      conversation_id: 'conv-101',
      sender_type: 'AGENT',
      sender_id: 'sales-advisor',
      content: answer,
      created_at: new Date().toISOString(),
    });

    setTimeout(() => {
      res.write(`\n${answer}\n`);
      res.end();
    }, 400);
    return;
  }

  // Platform Admin routes
  if (req.method === 'GET' && pathname === '/api/v1/platform/tenants') {
    sendJson(res, 200, {
      items: [
        {
          tenant_id: TENANT_ID,
          display_name: 'NovaMart Retail Vietnam',
          status: 'ACTIVE',
          created_at: '2026-01-01T00:00:00.000Z',
          enabled_modules: ['marketing', 'sales', 'care'],
          agents_count: 3,
        },
      ],
    });
    return;
  }

  if (req.method === 'GET' && pathname.includes('/readiness')) {
    sendJson(res, 200, {
      tenant_id: TENANT_ID,
      capability_count: 3,
      capability_statuses: { marketing: 'READY', sales: 'READY', care: 'READY' },
      connector_count: 2,
      connector_statuses: { 'erp-novamart': 'HEALTHY', 'qdrant-vector': 'HEALTHY' },
      workspace_status: 'READY',
      residency_status: 'READY',
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/platform/usage') {
    sendJson(res, 200, {
      items: [
        {
          tenant_id: TENANT_ID,
          runs_count: 38,
          token_cost_records_count: 142,
          estimated_cost_total: '0.042',
          input_tokens_total: 84200,
          output_tokens_total: 21400,
          cached_tokens_total: 31200,
        },
      ],
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/platform/providers') {
    sendJson(res, 200, {
      items: [
        { provider: 'OpenAI GPT-4o', configured: true, mode: 'ONLINE', status: 'HEALTHY' },
        { provider: 'Local Vector Qdrant', configured: true, mode: 'ONLINE', status: 'HEALTHY' },
        { provider: 'PostgreSQL Vector RLS', configured: true, mode: 'ONLINE', status: 'HEALTHY' },
      ],
    });
    return;
  }

  // Fallback
  sendJson(res, 200, { message: 'AgentOS Demo Backend API', path: pathname });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Demo API Server] Listening on http://0.0.0.0:${PORT}`);
});
