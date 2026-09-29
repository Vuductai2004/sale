'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';


export type StatusTone =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'partial'
  | 'stale'
  | 'live'
  | 'no-data'
  | 'not-instrumented'
  | 'integrated'
  | 'not-integrated'
  | 'not-configured'
  | 'blocked'
  | 'demo-only'
  | 'permission-denied'
  | 'dependency-unavailable'
  | 'version-conflict'
  | 'fail-closed'
  | 'danger'
  | 'neutral';

export function StatusBadge({ label, tone = 'neutral' }: { readonly label: string; readonly tone?: StatusTone }) {
  return <span className={`ui-status ui-status--${tone}`} role="status">{label}</span>;
}

export function DemoBadge() {
  return <StatusBadge label="Demo" tone="demo-only" />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
}: {
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={`ui-section-card ${className}`}>
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-5 text-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatePanel({
  title,
  detail,
  tone = 'neutral',
  action,
}: {
  readonly title: string;
  readonly detail: string;
  readonly tone?: 'neutral' | 'blocked' | 'danger';
  readonly action?: ReactNode;
}) {
  return (
    <div className={`state-panel ${tone === 'danger' ? 'state-panel--error' : tone === 'blocked' ? 'state-panel--blocked' : ''}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  status,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly status?: ReactNode;
}) {
  return (
    <article className="ui-section-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        {status}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </article>
  );
}

export function LoadingPanel({ label = 'Loading current data' }: { readonly label?: string }) {
  return <div className="state-panel" aria-busy="true" aria-label={label}><div className="h-3 w-32 animate-pulse rounded bg-brand-soft" /><div className="mt-3 h-3 max-w-md animate-pulse rounded bg-surface-raised" /></div>;
}

export function EmptyState({ title, detail }: { readonly title: string; readonly detail: string }) {
  return <StatePanel title={title} detail={detail} tone="neutral" />;
}

export function ErrorState({ title = 'Data unavailable', detail, correlationId, onRetry }: { readonly title?: string; readonly detail: string; readonly correlationId?: string | null; readonly onRetry?: () => void }) {
  return <StatePanel title={title} detail={`${detail}${correlationId ? ` Correlation ID: ${correlationId}.` : ''}`} tone="danger" action={onRetry ? <button type="button" className="ui-button ui-button--secondary" onClick={onRetry}>Retry</button> : undefined} />;
}

export function BlockedState({ title = 'Capability unavailable', detail }: { readonly title?: string; readonly detail: string }) {
  return <StatePanel title={title} detail={detail} tone="blocked" />;
}

export interface DataTableColumn<TRow> {
  readonly key: string;
  readonly label: string;
  readonly render: (row: TRow) => ReactNode;
}

export function DataTable<TRow>({ columns, rows, getRowKey, empty }: { readonly columns: readonly DataTableColumn<TRow>[]; readonly rows: readonly TRow[]; readonly getRowKey: (row: TRow, index: number) => string; readonly empty?: ReactNode }) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="No records" detail="The authorized source returned no rows." />}</>;
  return <div className="overflow-x-auto rounded-lg border border-line"><table className="min-w-full text-left text-sm"><thead className="bg-surface-low text-xs uppercase tracking-[0.1em] text-muted"><tr>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3 font-semibold">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map((row, index) => <tr key={getRowKey(row, index)} className="text-ink-body">{columns.map((column) => <td key={column.key} className="px-4 py-3 align-top">{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}

export function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly detail: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly busy?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const detailId = useId();

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          onCancel();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
        <p id={detailId} className="mt-2 text-sm leading-6 text-muted">{detail}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="ui-button ui-button--secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className="ui-button ui-button--primary" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
