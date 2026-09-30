'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DemoBadge } from '../../../components/ui/Primitives';
type Persona = 'anonymous' | 'C05' | 'C06';
const PERSONAS = ['anonymous', 'C05', 'C06'] as const;
type ViewState = 'loading' | 'ready' | 'empty' | 'unauthenticated' | 'permission_denied' | 'error';
type TaskStatus = 'accepted' | 'queued' | 'running' | 'waiting' | 'pending' | 'pending_approval' | 'awaiting_human' | 'completed' | 'failed' | 'stopped' | 'unavailable';

type CatalogItem = {
  readonly sku_id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly use_case: string;
  readonly description: string;
  readonly currency: string;
  readonly list_price: number;
  readonly is_active: boolean;
};

type WidgetSession = {
  readonly access_token: string;
  readonly expires_at: string;
  readonly session_id: string;
};

type TaskReceipt = {
  readonly task_id?: string;
  readonly conversation_id?: string;
  readonly status?: string;
  readonly task_version?: number;
  readonly correlation_id?: string;
};

type TaskState = TaskReceipt & {
  readonly answer?: string;
  readonly sources?: readonly unknown[];
  readonly actions?: readonly unknown[];
  readonly evidence_reference?: unknown;
};

type ChatEntry =
  | { readonly id: string; readonly role: 'user'; readonly text: string }
  | {
      readonly id: string;
      readonly role: 'assistant';
      readonly status: TaskStatus;
      readonly taskId?: string;
      readonly text?: string;
      readonly sources?: readonly unknown[];
      readonly actions?: readonly unknown[];
      readonly evidenceReference?: unknown;
      readonly error?: string;
    };

type SessionResponse = {
  readonly identity?: { readonly user_id?: string; readonly email?: string; readonly display_name?: string };
  readonly membership?: { readonly tenant_id?: string; readonly scope?: string };
  readonly permissions?: readonly string[];
};

const TERMINAL_STATUSES: Partial<Record<TaskStatus, true>> = {
  completed: true,
  awaiting_human: true,
  stopped: true,
  failed: true,
  unavailable: true,
};
const POLL_DELAYS_MS = [1000, 2000, 4000, 8000];
const MAX_POLL_MS = 90_000;
const MAX_RECEIPT_BYTES = 32 * 1024;
const SIGN_IN_HREF = '/sign-in?next=%2Fdemo%2Fstorefront';

function configuredApiV1Url(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/+$/, '');
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = 'agentos_tenant_csrf=';
  const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!cookie) return undefined;
  const value = cookie.slice(prefix.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const value = payload as Record<string, unknown>;
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    if (value.error && typeof value.error === 'object' && !Array.isArray(value.error)) {
      const nested = value.error as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    }
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function currency(value: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString()} ${code}`;
  }
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Unrenderable value';
  }
}

function sourceLabel(source: unknown): string {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    for (const key of ['title', 'name', 'source_file', 'evidence_id', 'id', 'reference']) {
      if (typeof record[key] === 'string' && record[key].trim()) return record[key];
    }
  }
  return displayValue(source);
}

function statusLabel(status: TaskStatus | string | undefined): string {
  switch (status) {
    case 'accepted': return 'Accepted';
    case 'queued': return 'Queued';
    case 'running': return 'Running';
    case 'waiting': return 'Waiting';
    case 'pending': return 'Pending';
    case 'pending_approval':
    case 'awaiting_approval': return 'Pending approval';
    case 'awaiting_human':
    case 'paused_takeover': return 'Awaiting a human agent';
    case 'completed': return 'Completed';
    case 'stopped': return 'Stopped';
    case 'failed': return 'Failed';
    case 'unavailable': return 'Unavailable';
    default: return 'Unavailable';
  }
}

function parseReceiptLine(line: string): TaskReceipt | null {
  const candidate = line.trim().replace(/^data:\s?/, '').trim();
  if (!candidate || candidate === '[DONE]' || !candidate.startsWith('{')) return null;
  try {
    const value: unknown = JSON.parse(candidate);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.task_id !== 'string') return null;
    return {
      task_id: record.task_id,
      ...(typeof record.conversation_id === 'string' ? { conversation_id: record.conversation_id } : {}),
      ...(typeof record.status === 'string' ? { status: record.status } : {}),
      ...(typeof record.task_version === 'number' ? { task_version: record.task_version } : {}),
      ...(typeof record.correlation_id === 'string' ? { correlation_id: record.correlation_id } : {}),
    };
  } catch {
    return null;
  }
}

async function readReceipt(response: Response): Promise<TaskReceipt> {
  if (!response.body) throw new Error('The storefront stream did not return a receipt.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytes = 0;

  const inspect = (flush: boolean): TaskReceipt | null => {
    const lines = buffer.split(/\r?\n/);
    if (!flush) buffer = lines.pop() ?? '';
    else buffer = '';
    for (const line of lines) {
      const receipt = parseReceiptLine(line);
      if (receipt) return receipt;
    }
    return flush ? parseReceiptLine(buffer) : null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RECEIPT_BYTES) throw new Error('The storefront receipt exceeded the safe size limit.');
    buffer += decoder.decode(value, { stream: true });
    const receipt = inspect(false);
    if (receipt) {
      void reader.cancel();
      return receipt;
    }
  }
  buffer += decoder.decode();
  const receipt = inspect(true);
  if (!receipt) throw new Error('The storefront stream ended without a valid task receipt.');
  return receipt;
}

function normalizeTaskStatus(value: unknown): TaskStatus | null {
  if (typeof value !== 'string') return null;
  switch (value.toLowerCase()) {
    case 'accepted': return 'accepted';
    case 'queued': return 'queued';
    case 'running': return 'running';
    case 'waiting': return 'waiting';
    case 'pending': return 'pending';
    case 'pending_approval':
    case 'awaiting_approval': return 'pending_approval';
    case 'awaiting_human':
    case 'paused_takeover': return 'awaiting_human';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    case 'stopped': return 'stopped';
    case 'unavailable': return 'unavailable';
    default: return null;
  }
}


function normalizeTaskState(value: unknown): TaskState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The task status response was invalid.');
  const record = value as Record<string, unknown>;
  if (typeof record.task_id !== 'string') throw new Error('The task status response did not identify the task.');
  return {
    task_id: record.task_id,
    ...(typeof record.task_version === 'number' ? { task_version: record.task_version } : {}),
    ...(typeof record.status === 'string' ? { status: record.status } : {}),
    ...(typeof record.answer === 'string' ? { answer: record.answer } : {}),
    ...(Array.isArray(record.sources) ? { sources: record.sources } : {}),
    ...(Array.isArray(record.actions) ? { actions: record.actions } : {}),
    ...(record.evidence_reference !== undefined ? { evidence_reference: record.evidence_reference } : {}),
    ...(typeof record.correlation_id === 'string' ? { correlation_id: record.correlation_id } : {}),
  };
}

function safeStatusFromReceipt(receipt: TaskReceipt): TaskStatus {
  if (typeof receipt.status !== 'string') return 'unavailable';
  return normalizeTaskStatus(receipt.status) ?? 'unavailable';
}

function safeStatusFromTask(task: TaskState): TaskStatus {
  if (typeof task.status !== 'string') return 'unavailable';
  const normalized = normalizeTaskStatus(task.status);
  return normalized === 'accepted' ? 'queued' : normalized ?? 'unavailable';
}

function hasGroundedAnswer(task: TaskState): boolean {
  const hasSources = Array.isArray(task.sources) && task.sources.some((source) => sourceLabel(source).trim().length > 0);
  const hasEvidenceReference = typeof task.evidence_reference === 'string' && task.evidence_reference.trim().length > 0;
  return typeof task.answer === 'string' && task.answer.trim().length > 0 && (hasSources || hasEvidenceReference);
}

function hasGroundedChatEntry(entry: ChatEntry): boolean {
  if (entry.role !== 'assistant' || entry.status !== 'completed' || typeof entry.text !== 'string' || entry.text.trim().length === 0) return false;
  const hasSources = Array.isArray(entry.sources) && entry.sources.some((source) => sourceLabel(source).trim().length > 0);
  const hasEvidenceReference = typeof entry.evidenceReference === 'string' && entry.evidenceReference.trim().length > 0;
  return hasSources || hasEvidenceReference;
}

export default function StorefrontDemoPage() {
  const [sessionState, setSessionState] = useState<ViewState>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [catalogState, setCatalogState] = useState<ViewState>('loading');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<readonly CatalogItem[]>([]);
  const [persona, setPersona] = useState<Persona>('anonymous');
  const [widgetSession, setWidgetSession] = useState<WidgetSession | null>(null);
  const [widgetState, setWidgetState] = useState<'idle' | 'minting' | 'ready' | 'error'>('idle');
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [entries, setEntries] = useState<readonly ChatEntry[]>([]);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const apiUrl = configuredApiV1Url();

  const loadSessionAndCatalog = useCallback(async () => {
    setSessionState('loading');
    setSessionError(null);
    setCatalogState('loading');
    setCatalogError(null);

    let sessionResponse: Response;
    try {
      sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    } catch {
      setSessionState('error');
      setSessionError('The demo session service is unavailable.');
      setCatalogState('error');
      setCatalogError('The catalog could not be loaded.');
      return;
    }

    if (sessionResponse.status === 401) {
      setSessionState('unauthenticated');
      setCatalogState('empty');
      setCatalog([]);
      return;
    }
    const sessionPayload = await readJson(sessionResponse) as SessionResponse | undefined;
    if (!sessionResponse.ok) {
      setSessionState(sessionResponse.status === 403 ? 'permission_denied' : 'error');
      setSessionError(errorMessage(sessionPayload, 'The demo session could not be verified.'));
      setCatalogState('error');
      return;
    }
    setSessionState('ready');

    try {
      const catalogResponse = await fetch('/api/v1/demo/catalog', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const payload = await readJson(catalogResponse);
      if (catalogResponse.status === 401) {
        setSessionState('unauthenticated');
        setCatalogState('empty');
        return;
      }
      if (catalogResponse.status === 403) {
        setCatalogState('permission_denied');
        setCatalogError(errorMessage(payload, 'Your operator session cannot view the demo catalog.'));
        return;
      }
      if (!catalogResponse.ok) throw new Error(errorMessage(payload, 'The demo catalog is unavailable.'));
      const items = payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray((payload as Record<string, unknown>).items)
        ? (payload as { items: unknown[] }).items
            .filter((item): item is CatalogItem => {
              if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
              const value = item as Record<string, unknown>;
              return typeof value.sku_id === 'string' && typeof value.name === 'string' && typeof value.brand === 'string'
                && typeof value.category === 'string' && typeof value.use_case === 'string' && typeof value.description === 'string'
                && typeof value.currency === 'string' && typeof value.list_price === 'number' && value.is_active === true;
            })
        : [];
      setCatalog(items);
      setCatalogState(items.length > 0 ? 'ready' : 'empty');
      if (items.length === 0) setCatalogError(null);
    } catch (error) {
      setCatalogState('error');
      setCatalogError(error instanceof Error ? error.message : 'The demo catalog is unavailable.');
    }
  }, []);

  useEffect(() => {
    void loadSessionAndCatalog();
  }, [loadSessionAndCatalog]);

  const filteredCatalog = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((item) => [item.name, item.brand, item.category, item.use_case, item.description, item.sku_id].some((value) => value.toLowerCase().includes(query)));
  }, [catalog, filter]);

  const mintWidgetSession = useCallback(async (selectedPersona: Persona) => {
    if (sessionState !== 'ready') return;
    setWidgetState('minting');
    setWidgetError(null);
    setSendError(null);
    try {
      const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
      const csrf = csrfToken();
      if (csrf) headers.set('x-csrf-token', csrf);
      const response = await fetch('/api/v1/demo/widget-session', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ persona: selectedPersona }),
      });
      const payload = await readJson(response);
      if (response.status === 401) {
        setSessionState('unauthenticated');
        setWidgetSession(null);
        setWidgetState('error');
        setWidgetError('Sign in as a tenant operator to launch the widget.');
        return;
      }
      if (response.status === 403) {
        setWidgetState('error');
        setWidgetError(errorMessage(payload, 'Your operator session cannot launch the widget.'));
        return;
      }
      if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(errorMessage(payload, 'The widget session could not be created.'));
      }
      const value = payload as Record<string, unknown>;
      if (typeof value.access_token !== 'string' || typeof value.expires_at !== 'string' || typeof value.session_id !== 'string') {
        throw new Error('The widget session response was incomplete.');
      }
      setWidgetSession({ access_token: value.access_token, expires_at: value.expires_at, session_id: value.session_id });
      setWidgetState('ready');
      setEntries([]);
      setActiveTaskId(null);
      inputRef.current?.focus();
    } catch (error) {
      setWidgetState('error');
      setWidgetError(error instanceof Error ? error.message : 'The widget session could not be created.');
    }
  }, [sessionState]);

  const pollTask = useCallback(async (taskId: string, assistantId: string, token: string) => {
    if (!apiUrl) throw new Error('The storefront API URL is not configured.');
    const startedAt = Date.now();
    let attempt = 0;
    while (Date.now() - startedAt < MAX_POLL_MS) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, POLL_DELAYS_MS[Math.min(attempt - 1, POLL_DELAYS_MS.length - 1)]));
      }
      const response = await fetch(`${apiUrl}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, Origin: window.location.origin },
        cache: 'no-store',
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(errorMessage(payload, `Task status could not be read (${response.status}).`));
      const task = normalizeTaskState(payload);
      const status = safeStatusFromTask(task);
      const grounded = status === 'completed' && hasGroundedAnswer(task);
      const displayStatus: TaskStatus = status === 'completed' && !grounded ? 'unavailable' : status;
      setEntries((current) => current.map((entry) => {
        if (entry.id !== assistantId || entry.role !== 'assistant') return entry;
        return {
          ...entry,
          status: displayStatus,
          taskId,
          ...(grounded && task.answer !== undefined && task.sources !== undefined
            ? { text: task.answer, sources: task.sources }
            : {}),
          ...(task.actions === undefined ? {} : { actions: task.actions }),
          ...(task.evidence_reference === undefined ? {} : { evidenceReference: task.evidence_reference }),
          ...(status === 'failed' ? { error: task.answer || 'The agent could not complete this request.' } : {}),
        };
      }));
      if (TERMINAL_STATUSES[status]) {
        setActiveTaskId(null);
        return;
      }
      attempt += 1;
    }
    throw new Error('The request is still pending after 90 seconds. Check the conversation console for its current state.');
  }, [apiUrl]);

  const sendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !widgetSession || !apiUrl || activeTaskId) return;
    setMessage('');
    setSendError(null);
    const userId = randomId('user');
    const assistantId = randomId('assistant');
    setEntries((current) => [...current, { id: userId, role: 'user', text }, { id: assistantId, role: 'assistant', status: 'pending' }]);
    setActiveTaskId('pending');

    try {
      const response = await fetch(`${apiUrl}/storefront/stream`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${widgetSession.access_token}`,
          Origin: window.location.origin,
        },
        body: JSON.stringify({ message: text, idempotency_key: randomId('turn'), module: 'auto' }),
      });
      if (!response.ok) {
        const payload = await readJson(response);
        throw new Error(errorMessage(payload, response.status === 401 || response.status === 403 ? 'The widget session is not permitted to send this message.' : 'The message could not be accepted.'));
      }
      const receipt = await readReceipt(response);
      const taskId = receipt.task_id;
      if (!taskId) throw new Error('The storefront receipt did not include a task.');
      setActiveTaskId(taskId);
      const receiptStatus = safeStatusFromReceipt(receipt);
      setEntries((current) => current.map((entry) => entry.id === assistantId && entry.role === 'assistant' ? { ...entry, taskId, status: receiptStatus === 'completed' ? 'unavailable' : receiptStatus } : entry));
      await pollTask(taskId, assistantId, widgetSession.access_token);
    } catch (error) {
      const textError = error instanceof Error ? error.message : 'The message could not be completed.';
      setSendError(textError);
      setEntries((current) => current.map((entry) => entry.id === assistantId ? { ...entry, status: 'failed', error: textError } : entry));
      setActiveTaskId(null);
    }
  }, [activeTaskId, apiUrl, message, pollTask, widgetSession]);

  const changePersona = (next: Persona) => {
    setPersona(next);
    if (next !== persona) {
      setWidgetSession(null);
      setWidgetState('idle');
      setWidgetError(null);
      setEntries([]);
      setActiveTaskId(null);
    }
  };

  const sessionReady = sessionState === 'ready';

  return (
    <div className="min-h-full px-4 py-6 text-slate-100 sm:px-6 lg:px-8" aria-labelledby="storefront-title">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand">Demo Storefront</p>
            <div className="mt-2 flex flex-wrap items-center gap-3"><h1 id="storefront-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Shop with an evidenced assistant</h1><DemoBadge /></div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Browse the tenant-scoped catalog, then ask about products, returns, or an order. Replies appear only after the gateway task reaches a recorded state.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="rounded-full border border-line bg-surface-low px-3 py-1.5 font-mono">VND / vi-VN</span>
            <Link href="/" className="ui-button ui-button--quiet">Back to console</Link>
          </div>
        </header>

        {sessionState === 'loading' && <StatePanel title="Checking authenticated session" detail="The storefront requires an authenticated session before it can load demo data." loading />}
        {sessionState === 'unauthenticated' && (
          <StatePanel title="Sign in to open the demo storefront" detail="Catalog and widget-session minting are operator-gated. The browser will receive only a scoped widget credential after launch." action={<Link className="inline-flex rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" href={SIGN_IN_HREF}>Sign in</Link>} />
        )}
        {sessionState === 'permission_denied' && <StatePanel title="Permission denied" detail={sessionError ?? 'This operator does not have access to the demo storefront.'} action={<Link className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" href={SIGN_IN_HREF}>Use another operator</Link>} error />}
        {sessionState === 'error' && <StatePanel title="Session unavailable" detail={sessionError ?? 'The demo session could not be checked.'} action={<button type="button" onClick={() => void loadSessionAndCatalog()} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Try again</button>} error />}

        {sessionReady && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <section aria-labelledby="catalog-heading" className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="catalog-heading" className="text-lg font-semibold text-slate-100">Catalog</h2>
                    {catalogState === 'ready' && <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300">LIVE SOURCE</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Active items returned by the tenant’s authoritative demo catalog.</p>
                </div>
                <label className="block sm:w-64">
                  <span className="sr-only">Search catalog</span>
                  <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search products" className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
                </label>
              </div>

              {catalogState === 'loading' && <div className="grid gap-3 py-6 sm:grid-cols-2" aria-busy="true">{[1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse rounded-lg border border-slate-800 bg-slate-950/60" />)}</div>}
              {catalogState === 'permission_denied' && <StatePanel title="Catalog permission denied" detail={catalogError ?? 'The current operator cannot read the safe catalog projection.'} compact error />}
              {catalogState === 'error' && <StatePanel title="Catalog unavailable" detail={catalogError ?? 'No catalog data was returned.'} compact error action={<button type="button" onClick={() => void loadSessionAndCatalog()} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Retry</button>} />}
              {catalogState === 'empty' && <StatePanel title="No active products" detail="The authoritative catalog returned no active items. No placeholder products are shown." compact />}
              {catalogState === 'ready' && filteredCatalog.length === 0 && <StatePanel title="No matching products" detail="Try a different search term." compact />}
              {catalogState === 'ready' && filteredCatalog.length > 0 && (
                <div className="grid gap-3 py-5 sm:grid-cols-2">
                  {filteredCatalog.map((item) => (
                    <article key={item.sku_id} className="flex min-h-40 flex-col rounded-lg border border-slate-800 bg-slate-950/70 p-4 transition-colors hover:border-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">{item.brand} · {item.sku_id}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-400">{item.category}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{item.description}</p>
                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <div><p className="font-mono text-sm font-semibold text-sky-300">{currency(item.list_price, item.currency)}</p><p className="mt-1 text-[10px] text-slate-600">Authoritative list price</p></div>
                        <button type="button" onClick={() => { setMessage(`Tell me about ${item.name}.`); inputRef.current?.focus(); }} className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Ask assistant</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="chat-heading" className="flex min-h-[560px] min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 id="chat-heading" className="text-lg font-semibold text-slate-100">Storefront assistant</h2><p className="mt-1 text-xs text-slate-500">One scoped session for product advice and Care questions.</p></div>
                  <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${widgetState === 'ready' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-500'}`}>{widgetState === 'ready' ? 'WIDGET READY' : 'NOT CONNECTED'}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Simulated shopper persona">
                  {PERSONAS.map((value) => <button key={value} type="button" onClick={() => changePersona(value)} aria-pressed={persona === value} className={`rounded-md border px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${persona === value ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'}`}><span className="block font-medium">{value === 'anonymous' ? 'Anonymous shopper' : `Verified ${value}`}</span><span className="mt-1 block text-[10px] text-slate-500">{value === 'anonymous' ? 'Public questions only' : value === 'C05' ? 'Owned order lookup' : 'Cross-customer denial test'}</span></button>)}
                </div>
                {widgetState !== 'ready' && <button type="button" onClick={() => void mintWidgetSession(persona)} disabled={widgetState === 'minting'} className="mt-3 w-full rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{widgetState === 'minting' ? 'Opening scoped widget…' : 'Open chat session'}</button>}
                {widgetError && <p role="alert" className="mt-3 rounded-md border border-rose-900/70 bg-rose-950/30 px-3 py-2 text-xs leading-5 text-rose-300">{widgetError}</p>}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite" aria-label="Conversation transcript">
                {entries.length === 0 && <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><div className="mb-3 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-mono text-[10px] text-slate-500">SESSION-BOUND CHAT</div><p className="text-sm font-medium text-slate-300">Ask about a product, return policy, or order status.</p><p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Try: “I need a laptop under 20 million VND for graphic design.” or “What is your return policy?”</p></div>}
                {entries.map((entry) => entry.role === 'user' ? (
                  <div key={entry.id} className="ml-8 rounded-lg rounded-br-sm bg-sky-500/15 px-3 py-2.5 text-sm leading-6 text-sky-100">
                    <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-sky-400">You</p>
                    {entry.text}
                  </div>
                ) : (
                  <div key={entry.id} className="mr-4 rounded-lg rounded-bl-sm border border-slate-800 bg-slate-950/80 px-3 py-3">
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">Storefront assistant</p>
                    {entry.status === 'accepted' && <p className="text-xs text-slate-400" role="status">{statusLabel(entry.status)}. {entry.taskId ? `Task ${entry.taskId} is waiting for execution…` : 'Waiting for a task receipt…'}</p>}
                    {entry.status === 'queued' && <p className="text-xs text-slate-400" role="status">{statusLabel(entry.status)}. Waiting for worker execution…</p>}
                    {entry.status === 'running' && <p className="text-xs text-slate-400" role="status">{statusLabel(entry.status)}. The task is being processed…</p>}
                    {entry.status === 'waiting' && <p className="text-xs text-slate-400" role="status">{statusLabel(entry.status)} for the next task event…</p>}
                    {entry.status === 'pending' && <p className="text-xs text-slate-400" role="status">{statusLabel(entry.status)}; the durable status is still being read…</p>}
                    {entry.status === 'pending_approval' && <p className="text-xs leading-5 text-amber-300" role="status">{statusLabel(entry.status)}. No automated action will be shown.</p>}
                    {entry.status === 'awaiting_human' && <p className="text-xs leading-5 text-amber-300" role="status">{statusLabel(entry.status)}. No automated answer was added.</p>}
                    {entry.status === 'stopped' && <p className="text-xs leading-5 text-slate-400">{statusLabel(entry.status)} before returning an answer.</p>}
                    {entry.status === 'failed' && <p role="alert" className="text-xs leading-5 text-rose-300">{entry.error ?? `${statusLabel(entry.status)} before returning an answer.`}</p>}
                    {entry.status === 'unavailable' && <p className="text-xs leading-5 text-slate-400" role="status">{statusLabel(entry.status)}: the durable task response did not include a grounded answer and citation.</p>}
                    {hasGroundedChatEntry(entry) && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{entry.text}</p>}
                    {entry.status === 'completed' && !hasGroundedChatEntry(entry) && <p className="text-xs leading-5 text-slate-400" role="status">Unavailable: the task completed without a grounded answer and citation. No reply was invented.</p>}
                    {hasGroundedChatEntry(entry) && entry.sources && entry.sources.length > 0 && <div className="mt-3 border-t border-slate-800 pt-3"><p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Sources</p><ul className="mt-2 space-y-1 text-xs text-slate-400">{entry.sources.map((source, index) => <li key={`${entry.id}-source-${index}`} className="break-words">{sourceLabel(source)}</li>)}</ul></div>}
                    {hasGroundedChatEntry(entry) && entry.actions && entry.actions.length > 0 && <div className="mt-3 border-t border-slate-800 pt-3"><p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Actions</p><ul className="mt-2 space-y-1 text-xs text-slate-400">{entry.actions.map((action, index) => <li key={`${entry.id}-action-${index}`} className="whitespace-pre-wrap break-words">{displayValue(action)}</li>)}</ul></div>}
                    {hasGroundedChatEntry(entry) && entry.evidenceReference !== undefined && <p className="mt-3 border-t border-slate-800 pt-3 font-mono text-[10px] text-slate-600">Evidence reference: {displayValue(entry.evidenceReference)}</p>}
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="border-t border-slate-800 pt-4">
                {sendError && <p role="alert" className="mb-3 text-xs leading-5 text-rose-300">{sendError}</p>}
                <label htmlFor="storefront-message" className="sr-only">Message storefront assistant</label>
                <div className="flex items-end gap-2"><textarea ref={inputRef} id="storefront-message" value={message} onChange={(event) => setMessage(event.target.value)} disabled={widgetState !== 'ready' || Boolean(activeTaskId)} rows={2} maxLength={2000} placeholder={widgetState === 'ready' ? 'Ask about products, orders, or support…' : 'Open a scoped chat session first'} className="min-w-0 flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-5 text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60" /><button type="submit" disabled={widgetState !== 'ready' || !message.trim() || Boolean(activeTaskId)} className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Send</button></div>
                <p className="mt-2 text-[10px] text-slate-600">Enter sends. Answers and citations are read from the task status; this UI never creates a fallback reply.</p>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function StatePanel({ title, detail, action, loading = false, error = false, compact = false }: { readonly title: string; readonly detail: string; readonly action?: React.ReactNode; readonly loading?: boolean; readonly error?: boolean; readonly compact?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`${compact ? 'my-5' : 'my-2'} rounded-lg border px-4 py-5 ${error ? 'border-rose-900/70 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'}`}><div className="flex items-start gap-3"><div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${loading ? 'animate-pulse bg-sky-400' : error ? 'bg-rose-400' : 'bg-slate-600'}`} aria-hidden="true" /><div><h2 className={`text-sm font-medium ${error ? 'text-rose-200' : 'text-slate-200'}`}>{title}</h2><p className={`mt-1 text-xs leading-5 ${error ? 'text-rose-300/80' : 'text-slate-500'}`}>{detail}</p>{action && <div className="mt-3">{action}</div>}</div></div></div>;
}
