import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { api, type Author } from '../lib/api';
import { useMe } from '../lib/session';
import { useLoad } from '../lib/useLoad';

// Colonne de droite sur grand écran. Uniquement des données réelles de l'API :
// projets ouverts aux débutants et auteurs des publications récentes.
export function Aside() {
  const me = useMe();
  const { data, error, loading } = useLoad(() => Promise.all([api.projects(), api.posts()]), []);

  const projects = (data?.[0] ?? []).filter((p) => p.isBeginnerFriendly && p.ownerId !== me.id).slice(0, 3);
  const authors = new Map<string, Author>();
  for (const post of data?.[1].items ?? []) if (post.author.id !== me.id) authors.set(post.author.id, post.author);
  const devs = [...authors.values()].slice(0, 4);

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
          <h2 className="section-title">Développeurs actifs</h2>
          <ul className="aside-list">
            {devs.map((dev) => (
              <li key={dev.id}>
                <Link to={`/u/${dev.username}`} className="aside-link row" style={{ gap: 12 }}>
                  <Avatar user={dev} size="s" link={false} />
                  <span className="grow">
                    <span className="strong small" style={{ display: 'block' }}>{dev.displayName}</span>
                    <span className="post-handle">@{dev.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/explore" className="link small">
            Explorer la communauté
          </Link>
        </section>
      )}

      <p className="xs muted" style={{ padding: '0 var(--space-2)' }}>
        Hello World · le réseau social des développeurs, en Afrique d’abord.
      </p>
    </aside>
  );
}
