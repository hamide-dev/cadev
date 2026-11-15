import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { LogoMark } from '../../components/Brand';
import { Tabs } from '../../components/Tabs';
import { Empty } from '../../components/states';
import { PostFeed } from './PostFeed';
import { api } from '../../lib/api';
import { useMe } from '../../lib/session';

// Raccourcis de publication : on choisit le type en un clic depuis le fil.
const QUICK = [
  { type: 'question', label: 'Question', icon: 'chat' },
  { type: 'article', label: 'Code', icon: 'code', code: true },
  { type: 'project_launch', label: 'Projet', icon: 'branch' },
];

export function QuickCompose() {
  const me = useMe();
  return (
    <section className="quick-compose" aria-label="Publier">
      {/* Sur mobile l'avatar est déjà dans l'en-tête : on ne le répète pas. */}
      <span className="desktop-only">
        <Avatar user={me} link={false} />
      </span>
      <div className="grow stack-s">
        <Link to="/publish" className="quick-compose-input">
          Quoi de neuf dans ton code ?
        </Link>
        <div className="quick-compose-actions">
          {QUICK.map((q) => (
            <Link key={q.label} to={`/publish?type=${q.type}${q.code ? '&code=1' : ''}`} className="chip-action">
              <Icon name={q.icon} size={16} /> {q.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Feed() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'following' ? 'following' : 'for-you';
  const load = useCallback((cursor?: string | null) => api.feed(tab, cursor), [tab]);

  return (
    <main className="screen">
      <header className="topbar">
        <span className="mobile-only">
          <Avatar user={me} size="s" />
        </span>
        <div className="grow mobile-only">
          <span className="topbar-logo">
            <LogoMark size={40} />
          </span>
        </div>
        <h1 className="grow desktop-only">Fil d’actualité</h1>
        <Link to="/explore" className="icon-btn mobile-only" aria-label="Rechercher">
          <Icon name="search" />
        </Link>
      </header>
      <Tabs
        label="Fils"
        tabs={[
          ['for-you', 'Pour vous'],
          ['following', 'Abonnements'],
        ]}
        value={tab}
        onChange={(value) => setParams(value === 'following' ? { tab: value } : {})}
      />
      <QuickCompose />
      <PostFeed
        key={tab}
        cacheKey={`feed:${tab}`}
        load={load}
        empty={
          tab === 'following' ? (
            <Empty icon="search" title="Tu ne suis encore personne" action={<Link to="/explore" className="btn btn-primary">Découvrir des développeurs</Link>}>
              Abonne-toi à des développeurs pour retrouver ici leurs publications, dans l'ordre chronologique.
            </Empty>
          ) : (
            <Empty icon="home" title="Ton fil est encore calme" action={<Link to="/publish" className="btn btn-primary">Écrire la première publication</Link>}>
              Publie quelque chose pour lancer la conversation.
            </Empty>
          )
        }
      />
    </main>
  );
}
