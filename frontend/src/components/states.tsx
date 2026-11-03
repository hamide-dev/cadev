import { type ReactNode } from 'react';
import { Icon } from './Icon';

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="stack pad" style={{ paddingTop: 16 }} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div className="grow stack-s">
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
            <div className="skeleton" style={{ height: 14 }} />
            <div className="skeleton" style={{ height: 14, width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'circle', title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <span className="icon">
        <Icon name={icon} size={32} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <h2>Ça n'a pas chargé</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
