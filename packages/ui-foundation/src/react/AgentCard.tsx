import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge.js';

export interface AgentCardProps {
  readonly name: ReactNode;
  readonly purpose: ReactNode;
  readonly status: string;
  readonly metric?: ReactNode;
  readonly href?: string;
  readonly className?: string;
}

export function AgentCard({ name, purpose, status, metric, href, className }: AgentCardProps) {
  const card = (
    <article className={['ui-agent-card', 'ui-surface', className].filter(Boolean).join(' ')}>
      <div className="ui-agent-card__header">
        <h3 className="ui-agent-card__name">{name}</h3>
        <StatusBadge code={status} />
      </div>
      <p className="ui-agent-card__purpose">{purpose}</p>
      {metric !== undefined ? <div className="ui-agent-card__metric">{metric}</div> : null}
    </article>
  );

  return href ? (
    <a className="ui-agent-card__link ui-focus-ring" href={href}>
      {card}
    </a>
  ) : (
    card
  );
}
