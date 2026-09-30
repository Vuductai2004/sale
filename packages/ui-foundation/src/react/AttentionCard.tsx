import type { ReactNode } from 'react';
import type { Tone } from '../status-view.js';
import { StatusBadge } from './StatusBadge.js';

const tones: readonly Tone[] = ['success', 'warning', 'info', 'neutral', 'danger', 'demo'];

export interface AttentionCardProps {
  readonly severity: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly href?: string;
  readonly domain?: ReactNode;
  readonly className?: string;
}

export function AttentionCard({ severity, title, description, href, domain, className }: AttentionCardProps) {
  const isTone = tones.includes(severity as Tone);
  const card = (
    <article className={['ui-attention-card', 'ui-surface', className].filter(Boolean).join(' ')}>
      <div className="ui-attention-card__header">
        <StatusBadge
          {...(isTone ? { tone: severity as Tone, label: severity } : { code: severity })}
        />
        {domain ? <span className="ui-attention-card__domain">{domain}</span> : null}
      </div>
      <h3 className="ui-attention-card__title">{title}</h3>
      {description ? <p className="ui-attention-card__description">{description}</p> : null}
    </article>
  );

  return href ? (
    <a href={href} className="ui-attention-card__link ui-focus-ring">
      {card}
    </a>
  ) : (
    card
  );
}
