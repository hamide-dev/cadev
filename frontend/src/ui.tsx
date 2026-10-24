import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api, ApiError, type Author, type Level, type Post, type RepoPreview, type Specialty } from './api';
import { useSession } from './auth';

/* ---------- Libellés ---------- */

export const SPECIALTIES: Record<Specialty, string> = {
  FRONT_END: 'Front-end',
  BACK_END: 'Back-end',
  FULL_STACK: 'Full-stack',
  MOBILE: 'Mobile',
  DATA_AI: 'Data/IA',
  DEVOPS: 'DevOps',
};
export const LEVELS: Record<Level, string> = {
  LEARNING: 'En apprentissage',
  JUNIOR: 'Junior',
  CONFIRMED: 'Confirmé',
  SENIOR: 'Senior',
};
export const INTERESTS = ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Data/IA', 'DevOps', 'Accessibilité', 'Open source'];

export function roleLine(user: { specialty: Specialty | null; experienceLevel: Level | null }): string {
  return [user.specialty && SPECIALTIES[user.specialty], user.experienceLevel && LEVELS[user.experienceLevel]]
    .filter(Boolean)
    .join(' · ');
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return rtf.format(-Math.floor(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short' });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

// Premier dépôt GitHub cité dans un texte, pour l'aperçu du projet.
export function findRepoUrl(text: string): string | null {
  return text.match(/https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/)?.[0].replace(/[.,)]+$/, '') ?? null;
}

/* ---------- Chargement de données ---------- */

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((value) => alive && setData(value))
      .catch((err) => alive && setError(errorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [run]);

  useEffect(reload, [reload]);
  return { data, error, loading, reload, setData };
}

/* ---------- Icônes (traits 1.8, 24×24) ---------- */

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  branch: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  back: 'M19 12H5M12 19l-7-7 7-7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  comment: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 20l1.2-4A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  fork: 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M12 12v3',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  compose: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  clip: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M1 1l22 22',
  check: 'M20 6 9 17l-5-5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z',
  chevron: 'M9 18l6-6-6-6',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  pin: 'M12 17v5M9 10.8V4h6v6.8l3 3.2H6z',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  x: 'M18 6 6 18M6 6l12 12',
  filter: 'M4 6h16M7 12h10M10 18h4',
};

export function Icon({ name, size = 24, label }: { name: keyof typeof PATHS | string; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function GitHubLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

/* ---------- Marque ---------- */

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="hw-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d9d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#hw-top)" />
      <path d="M4 26 32 38 60 26V52a10 10 0 0 1-10 10H14A10 10 0 0 1 4 52z" fill="#000" />
      <text x="32" y="55" textAnchor="middle" fill="#fff" fontFamily="Geist Mono, monospace" fontWeight="700" fontSize="15">&gt; &lt;</text>
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <LogoMark size={40} />
      Hello World
    </span>
  );
}

/* ---------- Avatar ---------- */

const AVATAR_COLORS = ['#373737', '#1D4ED8', '#0B5F46', '#6D28D9', '#9A3412'];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function Avatar({ user, size, link = true }: { user: Pick<Author, 'username' | 'displayName' | 'avatarUrl'>; size?: 's' | 'xl'; link?: boolean }) {
  const hash = [...user.username].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const content = user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" loading="lazy" width={96} height={96} />
  ) : (
    initials(user.displayName)
  );
  const props = { className: `avatar ${size ?? ''}`, style: { background: AVATAR_COLORS[hash % AVATAR_COLORS.length] } };
  return link ? (
    <Link to={`/u/${user.username}`} {...props} aria-label={`Profil de ${user.displayName}`}>
      {content}
    </Link>
  ) : (
    <span {...props} aria-hidden="true">
      {content}
    </span>
  );
}

/* ---------- En-têtes et navigation ---------- */

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="icon-btn" onClick={() => (to ? navigate(to) : navigate(-1))} aria-label="Retour">
      <Icon name="back" />
    </button>
  );
}

export function TopBar({ title, sub, back, right, avatar }: { title: ReactNode; sub?: string; back?: boolean | string; right?: ReactNode; avatar?: boolean }) {
  const { user } = useSession();
  return (
    <header className="topbar">
      {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
      {avatar && user && <Avatar user={user} size="s" />}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

const NAV = [
  { to: '/feed', label: 'Fil', icon: 'home' },
  { to: '/explore', label: 'Explorer', icon: 'search' },
  { to: '/projects', label: 'Projets', icon: 'branch' },
  { to: '/notifications', label: 'Notifs', icon: 'bell' },
  { to: '/messages', label: 'Messages', icon: 'mail' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<[T, string]>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map(([key, text]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/* ---------- États d'écran ---------- */

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

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={ref} className="sheet stack" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2 className="center" style={{ fontSize: 20 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/* ---------- Contenus ---------- */

// Texte d'une publication : blocs ```code```, `extraits` et @mentions mis en valeur.
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```[\w-]*\n?([\s\S]*?)```/g);
  if (blocks.length === 1) return <Inline text={text} />;
  return (
    <div className="stack-s">
      {blocks.map((block, i) => (i % 2 ? <pre key={i} className="code">{block.trimEnd()}</pre> : block.trim() && <Inline key={i} text={block.trim()} />))}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`|@[a-zA-Z0-9_]{3,20})/g);
  return (
    <p className="post-text">
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : part.startsWith('@') ? (
          <Link key={i} to={`/u/${part.slice(1)}`} className="link-accent">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}

export function RepoCard({ url, label }: { url: string; label?: string }) {
  const { data } = useLoad<RepoPreview | null>(() => api.repoPreview(url).catch(() => null), [url]);
  const fallback = url.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  return (
    <a className="card" href={data?.htmlUrl ?? url} target="_blank" rel="noreferrer">
      <div className="row-between">
        <span className="row card-title">
          <span style={{ color: 'var(--accent)' }}>
            <Icon name="branch" size={20} />
          </span>
          {data?.fullName ?? fallback}
        </span>
        {label && <span className="tag">{label}</span>}
      </div>
      {data?.description && <p className="small muted">{data.description}</p>}
      {data && (
        <div className="meta">
          {data.language && <span className="mono">{data.language}</span>}
          <span className="row" style={{ gap: 4 }}>
            <span className="star">
              <Icon name="star" size={16} />
            </span>
            {data.stars}
          </span>
          <span className="row" style={{ gap: 4 }}>
            <Icon name="fork" size={16} />
            {data.forks} forks
          </span>
        </div>
      )}
    </a>
  );
}

const TYPE_LABEL: Record<Post['type'], string | null> = { QUESTION: '? Question technique', PROJECT_LAUNCH: 'Projet', ARTICLE: null };

export function PostCard({ post, onChange, onDelete, linked = true }: { post: Post; onChange?: (post: Post) => void; onDelete?: (id: string) => void; linked?: boolean }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const repo = findRepoUrl(post.content);
  const mine = user?.id === post.author.id;
  const typeLabel = TYPE_LABEL[post.type];

  const toggleLike = async () => {
    if (!user) return navigate('/login');
    const on = !post.likedByMe;
    onChange?.({ ...post, likedByMe: on, likeCount: post.likeCount + (on ? 1 : -1) });
    try {
      await api.like(post.id, on);
    } catch {
      onChange?.(post);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      alert(errorMessage(error));
    } finally {
      setBusy(false);
      setMenu(false);
    }
  };

  const body = (
    <>
      <RichText text={repo ? post.content.replace(repo, '').trim() : post.content} />
      {post.codeSnippet && <pre className="code">{post.codeSnippet}</pre>}
    </>
  );

  return (
    <article className="post" aria-label={`Publication de ${post.author.displayName}`}>
      <Avatar user={post.author} />
      <div className="post-body">
        {post.isPinned && (
          <span className="row xs muted">
            <Icon name="pin" size={14} /> Publication épinglée
          </span>
        )}
        <div className="post-head">
          <div className="grow">
            <Link to={`/u/${post.author.username}`} className="post-name">
              {post.author.displayName}
            </Link>
            <div className="post-handle">
              @{post.author.username} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </div>
          </div>
          {mine && onDelete && (
            <div style={{ position: 'relative' }}>
              <button type="button" className="icon-btn" aria-label="Options de la publication" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <Icon name="more" />
              </button>
              {menu && (
                <div className="group" style={{ position: 'absolute', right: 0, top: 44, zIndex: 5, minWidth: 200 }}>
                  <button
                    type="button"
                    className="list-item"
                    disabled={busy}
                    onClick={() => run(async () => {
                      await api.pin(post.id, !post.isPinned);
                      onChange?.({ ...post, isPinned: !post.isPinned });
                    })}
                  >
                    <Icon name="pin" size={18} /> {post.isPinned ? 'Désépingler' : 'Épingler sur mon profil'}
                  </button>
                  <button
                    type="button"
                    className="list-item"
                    style={{ color: 'var(--danger)' }}
                    disabled={busy}
                    onClick={() => confirm('Supprimer cette publication ?') && run(async () => {
                      await api.deletePost(post.id);
                      onDelete(post.id);
                    })}
                  >
                    <Icon name="x" size={18} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {linked ? (
          <Link to={`/post/${post.id}`} className="post-link">
            {body}
          </Link>
        ) : (
          body
        )}
        {(typeLabel || post.tags.length > 0) && (
          <div className="tags">
            <span className="tag outline">{[typeLabel, ...post.tags].filter(Boolean).join(' · ')}</span>
          </div>
        )}
        {post.attachments.length > 0 && (
          <div className="media-grid">
            {post.attachments.map((media) =>
              media.resourceType === 'video' ? (
                <video key={media.id} src={media.url} controls preload="metadata" />
              ) : (
                <img key={media.id} src={media.url} alt="Pièce jointe" loading="lazy" />
              ),
            )}
          </div>
        )}
        {repo && <RepoCard url={repo} />}
        <div className="post-actions">
          <Link to={`/post/${post.id}`} className="action" aria-label={post.type === 'QUESTION' ? 'Voir les réponses' : 'Voir les commentaires'}>
            <Icon name="comment" size={20} />
            {post.type === 'QUESTION' ? 'Répondre' : 'Commenter'}
          </Link>
          <button type="button" className="action" aria-pressed={!!post.likedByMe} onClick={toggleLike} aria-label={post.likedByMe ? "Retirer le j'aime" : "J'aime"}>
            <Icon name="heart" size={20} />
            {post.likeCount}
          </button>
        </div>
      </div>
    </article>
  );
}

// Liste paginée par curseur, partagée par les fils et le profil.
export function PostFeed({ load, empty }: { load: (cursor?: string | null) => Promise<{ items: Post[]; nextCursor: string | null; hasMore: boolean }>; empty: ReactNode }) {
  const [items, setItems] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const fetchPage = useCallback(
    async (from: string | null) => {
      setError(null);
      try {
        const page = await load(from);
        setItems((prev) => (from && prev ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [load],
  );

  useEffect(() => {
    setItems(null);
    fetchPage(null);
  }, [fetchPage]);

  if (error && !items) return <ErrorState message={error} onRetry={() => fetchPage(null)} />;
  if (!items) return <Loading />;
  if (items.length === 0) return <>{empty}</>;
  return (
    <div>
      {items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onChange={(next) => setItems((list) => list!.map((p) => (p.id === next.id ? next : p)))}
          onDelete={(id) => setItems((list) => list!.filter((p) => p.id !== id))}
        />
      ))}
      {hasMore && (
        <div className="pad" style={{ padding: 16 }}>
          <button
            type="button"
            className="btn btn-block"
            disabled={more}
            onClick={async () => {
              setMore(true);
              await fetchPage(cursor);
              setMore(false);
            }}
          >
            {more ? <span className="spinner" aria-label="Chargement" /> : 'Voir plus de publications'}
          </button>
        </div>
      )}
      {error && <p className="alert" style={{ margin: 16 }}>{error}</p>}
    </div>
  );
}
