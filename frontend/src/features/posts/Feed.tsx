import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { LogoMark } from '../../components/Brand';
import { Tabs } from '../../components/Tabs';
import { Empty } from '../../components/states';
import { PostFeed } from './PostFeed';
import { api } from '../../lib/api';
import { useMe } from '../../lib/session';

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
        <div className="grow center mobile-only">
          <Link to="/feed" aria-label="Hello World, accueil">
            <LogoMark size={44} />
          </Link>
        </div>
        <h1 className="grow desktop-only">Fil d’actualité</h1>
        <Link to="/publish" className="btn btn-primary mobile-only">
          Publier
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
      {tab === 'for-you' && (
        <p className="row xs muted section" style={{ gap: 6 }}>
          Toutes les publications publiques de la communauté
        </p>
      )}
      <PostFeed
        key={tab}
        load={load}
        empty={
          tab === 'following' ? (
            <Empty icon="search" title="Tu ne suis encore personne" action={<Link to="/explore" className="btn">Découvrir des développeurs</Link>}>
              Abonne-toi à des développeurs pour retrouver ici leurs publications, dans l'ordre chronologique.
            </Empty>
          ) : (
            <Empty
              icon="home"
              title="Ton fil est encore calme"
              action={
                <Link to="/publish" className="btn btn-primary mobile-only">
                  Écrire la première publication
                </Link>
              }
            >
              Publie quelque chose pour lancer la conversation.
            </Empty>
          )
        }
      />
    </main>
  );
}
