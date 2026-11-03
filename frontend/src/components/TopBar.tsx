import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useSession } from '../lib/session';

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="icon-btn back-btn" onClick={() => (to ? navigate(to) : navigate(-1))} aria-label="Retour">
      <Icon name="back" />
    </button>
  );
}

export function TopBar({ title, sub, back, right, avatar }: { title: ReactNode; sub?: string; back?: boolean | string; right?: ReactNode; avatar?: boolean }) {
  const { user } = useSession();
  return (
    <header className="topbar">
      {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
      {avatar && user && (
        <span className="mobile-only">
          <Avatar user={user} size="s" />
        </span>
      )}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
