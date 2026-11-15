import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { roleLine } from '../lib/format';
import { useMe } from '../lib/session';
import { useLoad } from '../lib/useLoad';
import { Credits } from '../features/legal/Legal';

// Colonne de droite sur grand écran, uniquement des données réelles de l'API :
// projets ouverts aux débutants et développeurs à suivre (ceux qu'on suit déjà sont écartés).
export function Aside() {
  const me = useMe();
  const { data, error, loading } = useLoad(
    () => Promise.all([api.projects(), api.users('', 1, 12), api.followingUsers().catch(() => ({ usernames: [] as string[] }))]),
    [],
  );
  const [followed, setFollowed] = useState<string[]>([]);

  const projects = (data?.[0] ?? []).filter((p) => p.isBeginnerFriendly && p.ownerId !== me.id).slice(0, 3);
  const already = new Set(data?.[2].usernames ?? []);
  const devs = (data?.[1].items ?? []).filter((u) => u.id !== me.id && !already.has(u.username)).slice(0, 4);

  const follow = async (username: string) => {
    setFollowed((list) => [...list, username]);
    try {
      await api.follow(username);
    } catch {
      setFollowed((list) => list.filter((u) => u !== username));
    }
  };

  return (
    <aside className="aside" aria-label="Suggestions">
      <section className="aside-card">
        <h2 className="section-title">Projets ouverts aux débutants</h2>
        {loading ? (
          <div className="skeleton" style={{ height: 96 }} />
        ) : error ? (
          <p className="small muted">Les suggestions n’ont pas chargé. Elles reviendront au prochain passage.</p>
        ) : projects.length ? (
          <ul className="aside-list">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="aside-link">
                  <span className="row card-title">
                    <span style={{ color: 'var(--accent)' }}>
                      <Icon name="branch" size={18} />
                    </span>
                    {p.name}
                  </span>
                  {p.technologies.length > 0 && <span className="xs muted">{p.technologies.slice(0, 3).join(' · ')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Aucun projet n’accueille de débutants pour l’instant.</p>
        )}
        <Link to="/projects" className="link small">
          Voir tous les projets
        </Link>
      </section>

      {!loading && !error && devs.length > 0 && (
        <section className="aside-card">
          <h2 className="section-title">Développeurs à découvrir</h2>
          <ul className="aside-list">
            {devs.map((dev) => {
              const on = followed.includes(dev.username);
              return (
                <li key={dev.id} className="row" style={{ gap: 8 }}>
                  <Link to={`/u/${dev.username}`} className="aside-link row grow" style={{ gap: 12 }}>
                    <Avatar user={dev} size="s" link={false} />
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="strong small ellipsis">{dev.displayName}</span>
                      <span className="post-handle ellipsis">{roleLine(dev) || `@${dev.username}`}</span>
                    </span>
                  </Link>
                  <button type="button" className={`btn btn-s pill ${on ? '' : 'btn-primary'}`} aria-pressed={on} disabled={on} onClick={() => follow(dev.username)}>
                    {on ? 'Suivi' : 'Suivre'}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link to="/explore" className="link small">
            Explorer la communauté
          </Link>
        </section>
      )}

      <Credits />
    </aside>
  );
}
