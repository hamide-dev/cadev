import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { ProjectCard } from './ProjectCard';
import { NewProject } from './sheets';
import { api } from '../../lib/api';
import { useMe } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';

export function Projects() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'mine' ? 'mine' : 'discover';
  const [beginner, setBeginner] = useState(false);
  const [tech, setTech] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload, setData } = useLoad(() => api.projects(), []);

  const allTech = useMemo(() => [...new Set((data ?? []).flatMap((p) => p.technologies))].slice(0, 12), [data]);
  const shown = (data ?? []).filter((p) => (tab === 'mine' ? p.ownerId === me.id : (!beginner || p.isBeginnerFriendly) && (!tech || p.technologies.includes(tech))));

  return (
    <main className="screen">
      <TopBar
        avatar
        title="Projets"
        right={
          <Link to="/publish?type=project_launch" className="btn btn-primary mobile-only">
            Publier
          </Link>
        }
      />
      <Tabs
        label="Projets"
        value={tab}
        onChange={(value) => setParams(value === 'mine' ? { tab: value } : {})}
        tabs={[
          ['discover', 'Découvrir'],
          ['mine', 'Mes projets'],
        ]}
      />
      {tab === 'discover' ? (
        <div className="pad row wrap" style={{ padding: 16 }}>
          <button type="button" className="btn btn-s" aria-pressed={beginner} style={beginner ? { background: 'var(--text)', color: 'var(--on-light)' } : undefined} onClick={() => setBeginner(!beginner)}>
            Débutant bienvenu {beginner && '✓'}
          </button>
          {allTech.map((t) => (
            <button key={t} type="button" className="btn btn-s" aria-pressed={tech === t} style={tech === t ? { background: 'var(--text)', color: 'var(--on-light)' } : undefined} onClick={() => setTech(tech === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      ) : (
        <div className="row-between pad" style={{ padding: 16 }}>
          <h2 className="section-title">Créés par vous · {shown.length}</h2>
          <button type="button" className="btn btn-primary btn-s" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> Ajouter un projet
          </button>
        </div>
      )}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Loading />
      ) : shown.length === 0 ? (
        tab === 'mine' ? (
          <Empty icon="branch" title="Tu n’as pas encore de projet" action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Ajouter un projet</button>}>
            Présente ton projet open source et découpe-le en tâches pour accueillir des contributeurs.
          </Empty>
        ) : (
          <Empty icon="branch" title={beginner || tech ? 'Aucun projet avec ces filtres' : 'Aucun projet pour l’instant'}>
            {beginner || tech ? 'Retire un filtre pour voir plus de projets.' : 'Les projets ouverts à contribution apparaîtront ici.'}
          </Empty>
        )
      ) : (
        <div className="project-grid pad" style={{ paddingBottom: 16 }}>
          {tab === 'discover' && <h2 className="section-title">Ouverts à contribution</h2>}
          {shown.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
      {creating && (
        <NewProject
          onClose={() => setCreating(false)}
          onCreated={(project) => {
            setData([project, ...(data ?? [])]);
            setCreating(false);
          }}
        />
      )}
    </main>
  );
}
