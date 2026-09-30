'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Customer360Timeline } from '../../../components/customer/Customer360Timeline';

type DemoRole = 'tenant_operator' | 'marketing_approver';
type Session = { readonly role: DemoRole; readonly operator_id?: string };
type Conversation = {
  readonly conversation_id: string;
  readonly customer_id: string | null;
  readonly channel: string;
  readonly active_agent: string;
  readonly state: string;
  readonly takeover_operator_id: string | null;
  readonly last_message_at: string;
};
type Message = {
  readonly message_id: string;
  readonly sender_type: string;
  readonly sender_id: string;
  readonly content: string;
  readonly created_at: string;
};
type Lease = { readonly lease_expires_at: string; readonly operator_id: string };

type ApiResult = Record<string, unknown>;
function normalizeSession(payload: ApiResult): Session | null {
  const role = payload.role;
  if (role !== 'tenant_operator' && role !== 'marketing_approver') return null;
  const operatorId = payload.operator_id;
  return typeof operatorId === 'string' && operatorId.length > 0
    ? { role, operator_id: operatorId }
    : { role };
}

function csrfToken(): string | undefined {
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('agentos_tenant_csrf='));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice('agentos_tenant_csrf='.length));
  } catch {
    return entry.slice('agentos_tenant_csrf='.length);
  }
}

async function readPayload(response: Response): Promise<ApiResult> {
  try {
    const payload: unknown = await response.json();
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as ApiResult) : {};
  } catch {
    return {};
  }
}

async function demoFetch(path: string, init: RequestInit = {}): Promise<{ response: Response; payload: ApiResult }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
    const csrf = csrfToken();
    if (csrf) headers.set('x-csrf-token', csrf);
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  return { response, payload: await readPayload(response) };
}

function apiError(payload: ApiResult, fallback: string): string {
  const code = typeof payload.error === 'string' ? payload.error : '';
  const message = typeof payload.message === 'string' ? payload.message : '';
  if (code === 'INSUFFICIENT_AUTHORITY' || code === 'FORBIDDEN') return 'permission_denied: this role cannot perform that operation.';
  if (code === 'CONVERSATION_LOCKED' || code === 'TAKEOVER_LEASE_HELD') return message || 'This conversation is controlled by another operator.';
  if (code === 'TAKEOVER_LEASE_EXPIRED' || code === 'TAKEOVER_LEASE_LOST') return message || 'The takeover lease has expired. Acquire a new lease before replying.';
  return message || code || fallback;
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
}

export default function OperationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [leases, setLeases] = useState<Record<string, Lease>>({});
  const lease = selectedId ? leases[selectedId] ?? null : null;
  const setLease = useCallback((nextLease: Lease | null, targetId?: string) => {
    const id = targetId ?? selectedId;
    if (!id) return;
    setLeases((prev) => {
      if (!nextLease) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: nextLease };
    });
  }, [selectedId]);
  const [reply, setReply] = useState('');
  const [takeoverReason, setTakeoverReason] = useState('Customer requested human assistance');
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.conversation_id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { response, payload } = await demoFetch('/api/demo/session');
      if (response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!response.ok) {
        setError(apiError(payload, 'Unable to read the operator session.'));
        return;
      }
      const currentSession = normalizeSession(payload);
      if (!currentSession) {
        setError('The session response was invalid; sign in again.');
        return;
      }
      setSession(currentSession);
      if (currentSession.role !== 'tenant_operator') {
        setError('permission_denied: tenant operator access is required for Conversations.');
        return;
      }

      const listing = await demoFetch('/api/v1/conversations?limit=100');
      if (listing.response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!listing.response.ok) {
        setError(apiError(listing.payload, 'Unable to load conversations.'));
        return;
      }
      const rawItems = Array.isArray(listing.payload.items) ? listing.payload.items : [];
      const normalized = rawItems.filter((item): item is Conversation => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return typeof record.conversation_id === 'string' && typeof record.state === 'string';
      });
      setConversations(normalized);
      setSelectedId((current) => (normalized.some((item) => item.conversation_id === current) ? current : normalized[0]?.conversation_id ?? ''));
    } catch {
      setError('Unable to reach the API. Confirm the local demo services are running.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsMessagesLoading(true);
    setError(null);
    try {
      const { response, payload } = await demoFetch(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?limit=200`);
      if (response.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (!response.ok) {
        setError(apiError(payload, 'Unable to load message history.'));
        return;
      }
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      setMessages(rawItems.filter((item): item is Message => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return typeof record.message_id === 'string' && typeof record.content === 'string';
      }));
    } catch {
      setError('Unable to reach the conversation history service.');
    } finally {
      setIsMessagesLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    setNotice(null);
    void fetchMessages(selectedId);
  }, [fetchMessages, selectedId]);

  useEffect(() => {
    const activeLeaseEntries = Object.entries(leases);
    if (activeLeaseEntries.length === 0) return undefined;
    const heartbeat = window.setInterval(() => {
      for (const [convId] of activeLeaseEntries) {
        void (async () => {
          const { response, payload } = await demoFetch(`/api/v1/conversations/${encodeURIComponent(convId)}/takeover/heartbeat`, {
            method: 'POST',
            body: JSON.stringify({ extend_seconds: 60 }),
          });
          if (!response.ok) {
            setLease(null, convId);
            if (convId === selectedId) {
              setError(apiError(payload, 'Takeover heartbeat failed.'));
            }
            return;
          }
          if (typeof payload.lease_expires_at === 'string' && typeof payload.operator_id === 'string') {
            setLease({ lease_expires_at: payload.lease_expires_at, operator_id: payload.operator_id }, convId);
          }
        })();
      }
    }, 30000);
    return () => window.clearInterval(heartbeat);
  }, [leases, selectedId, setLease]);

  async function handleTakeover() {
    if (!selectedId || !takeoverReason.trim()) return;
    setIsMutating(true);
    setError(null);
    setNotice(null);
    try {
      const { response, payload } = await demoFetch(`/api/v1/conversations/${encodeURIComponent(selectedId)}/takeover`, {
        method: 'POST',
        body: JSON.stringify({ reason: takeoverReason.trim(), takeover_mode: 'FULL_CONTROL' }),
      });
      if (!response.ok) {
        setError(apiError(payload, 'Unable to acquire takeover lease.'));
        return;
      }
      if (typeof payload.lease_expires_at === 'string' && typeof payload.operator_id === 'string') {
        setLease({ lease_expires_at: payload.lease_expires_at, operator_id: payload.operator_id });
      }
      setNotice('Human takeover is active. Autonomous outbound is suppressed for this conversation.');
      await fetchConversations();
    } catch {
      setError('Unable to acquire takeover lease.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !lease || !reply.trim()) return;
    setIsMutating(true);
    setError(null);
    setNotice(null);
    try {
      const { response, payload } = await demoFetch(`/api/v1/conversations/${encodeURIComponent(selectedId)}/operator-messages`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!response.ok) {
        setError(apiError(payload, 'Operator reply was not accepted.'));
        return;
      }
      setReply('');
      setNotice('Operator reply persisted under your active lease.');
      await fetchMessages(selectedId);
    } catch {
      setError('Unable to send the operator reply.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleResume() {
    if (!selectedId || !lease) return;
    setIsMutating(true);
    setError(null);
    try {
      const { response, payload } = await demoFetch(`/api/v1/conversations/${encodeURIComponent(selectedId)}/resume`, {
        method: 'POST',
        body: JSON.stringify({ handoff_summary: 'Operator returned the conversation to agent control.' }),
      });
      if (!response.ok) {
        setError(apiError(payload, 'Unable to resume agent control.'));
        return;
      }
      setLease(null);
      setNotice('Conversation returned to agent control.');
      await fetchConversations();
    } catch {
      setError('Unable to resume agent control.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleLogout() {
    try {
      await demoFetch('/api/demo/logout', { method: 'POST', body: '{}' });
    } finally {
      router.replace('/sign-in');
    }
  }

  if (session?.role && session.role !== 'tenant_operator') {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-xl rounded-xl border border-rose-800/80 bg-rose-950/30 p-6" role="alert">
          <p className="text-xs font-mono uppercase tracking-wider text-rose-300">403 · permission_denied</p>
          <h1 className="mt-2 text-xl font-semibold">Tenant operator access required</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in with the tenant operator role to manage conversations and takeover leases.</p>
          <button type="button" onClick={() => void handleLogout()} className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">Sign out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">NovaMart operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Conversation operations</h1>
            <p className="mt-1 text-sm text-slate-400">Tenant-scoped history, human takeover, and Customer 360 evidence.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Executive</a>
            <a href="/demo/campaigns" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Campaigns</a>
            <button type="button" onClick={() => void handleLogout()} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Sign out</button>
          </div>
        </header>

        {error && <div role="alert" className="mt-5 rounded-lg border border-rose-800/80 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-lg border border-emerald-800/80 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60" aria-labelledby="conversation-list-heading">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 id="conversation-list-heading" className="text-sm font-semibold">Conversations</h2>
              <button type="button" onClick={() => void fetchConversations()} disabled={isLoading} className="text-xs font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50">{isLoading ? 'Loading…' : 'Refresh'}</button>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading conversations"><div className="h-12 animate-pulse rounded bg-slate-800" /><div className="h-12 animate-pulse rounded bg-slate-800" /></div>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No conversations are available for this tenant.</p>
            ) : (
              <ul className="max-h-[32rem] divide-y divide-slate-800 overflow-y-auto" role="list">
                {conversations.map((conversation) => (
                  <li key={conversation.conversation_id}>
                    <button type="button" onClick={() => setSelectedId(conversation.conversation_id)} className={`w-full px-4 py-3 text-left transition hover:bg-slate-800/70 ${selectedId === conversation.conversation_id ? 'bg-sky-950/40' : ''}`} aria-pressed={selectedId === conversation.conversation_id}>
                      <div className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{conversation.customer_id || 'Anonymous customer'}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${conversation.state === 'paused_takeover' ? 'bg-amber-950 text-amber-300' : conversation.state === 'closed' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-300'}`}>{conversation.state === 'paused_takeover' ? 'awaiting_human' : conversation.state}</span></div>
                      <p className="mt-1 truncate text-xs text-slate-500">{conversation.conversation_id} · {conversation.channel}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Updated {formatTime(conversation.last_message_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-6" aria-labelledby="conversation-detail-heading">
            {!selected ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center"><h2 id="conversation-detail-heading" className="text-base font-semibold">Select a conversation</h2><p className="mt-2 text-sm text-slate-400">Conversation messages and safe Customer 360 linkage will appear here.</p></div>
            ) : (
              <>
                <section className="rounded-xl border border-slate-800 bg-slate-900/60" aria-labelledby="conversation-detail-heading">
                  <div className="flex flex-col gap-4 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><h2 id="conversation-detail-heading" className="text-base font-semibold">Conversation history</h2><p className="mt-1 break-all text-xs font-mono text-slate-500">{selected.conversation_id}</p><p className="mt-1 text-xs text-slate-400">Customer: {selected.customer_id || 'Anonymous'} · Agent: {selected.active_agent}</p></div>
                    <div className="flex flex-wrap gap-2">
                      {lease ? <span className="rounded-full border border-amber-700/80 bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-300">HUMAN_TAKEOVER · expires {formatTime(lease.lease_expires_at)}</span> : <button type="button" onClick={() => void handleTakeover()} disabled={isMutating || selected.state === 'closed'} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">{isMutating ? 'Acquiring…' : 'Take over'}</button>}
                      {lease && <button type="button" onClick={() => void handleResume()} disabled={isMutating} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50">Resume AI</button>}
                    </div>
                  </div>
                  {!lease && <div className="border-b border-slate-800 px-4 py-3"><label htmlFor="takeover-reason" className="mb-1 block text-xs font-medium text-slate-400">Takeover reason</label><input id="takeover-reason" value={takeoverReason} onChange={(event) => setTakeoverReason(event.target.value)} maxLength={1000} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30" /></div>}
                  {selected.state === 'paused_takeover' && !lease && <p role="status" className="border-b border-amber-900/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">awaiting_human: this conversation is paused for operator control. Acquire the live lease before replying.</p>}
                  <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
                    {isMessagesLoading ? <div className="space-y-3" aria-busy="true" aria-label="Loading messages"><div className="h-16 animate-pulse rounded-lg bg-slate-800" /><div className="h-12 animate-pulse rounded-lg bg-slate-800" /></div> : messages.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No messages recorded for this conversation.</p> : messages.map((message) => <article key={message.message_id} className={`rounded-lg border p-3 ${message.sender_type === 'operator' ? 'ml-4 border-sky-800/70 bg-sky-950/30' : 'mr-4 border-slate-800 bg-slate-950/50'}`}><div className="flex items-center justify-between gap-3 text-[11px] text-slate-500"><span className="font-semibold uppercase tracking-wide">{message.sender_type}</span><time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.content}</p></article>) }
                  </div>
                  <form onSubmit={handleReply} className="border-t border-slate-800 p-4"><label htmlFor="operator-reply" className="mb-2 block text-sm font-medium">Lease-owned operator reply</label><textarea id="operator-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} rows={3} disabled={!lease || isMutating} placeholder={lease ? 'Reply to the customer…' : 'Acquire the takeover lease to reply.'} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60" /><div className="mt-3 flex justify-end"><button type="submit" disabled={!lease || isMutating || !reply.trim()} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50">{isMutating ? 'Sending…' : 'Send reply'}</button></div></form>
                </section>

                {selected.customer_id ? <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><Customer360Timeline initialCustomerId={selected.customer_id} /></section> : <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-sm font-semibold">Customer 360 unavailable</h2><p className="mt-1 text-sm text-slate-400">No verified customer_id is attached to this conversation, so no profile is requested.</p></section>}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
