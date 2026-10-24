import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, type Project, type Task, type TaskStatus } from '../api';
import { useMe } from '../auth';
import { Avatar, Empty, ErrorState, errorMessage, findRepoUrl, Icon, Loading, RepoCard, Sheet, Tabs, TopBar, useLoad } from '../ui';

const STATUS: Record<Project['status'], string> = { PLANNING: 'en préparation', ACTIVE: 'actif', MAINTENANCE: 'maintenance', ARCHIVED: 'archivé' };
const TASK_STATUS: Record<TaskStatus, string> = { OPEN: 'ouverte', IN_PROGRESS: 'en cours', REVIEW: 'en revue', DONE: 'terminée' };

const repoName = (project: Project) => project.repositoryUrl?.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '') ?? project.slug;

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="card">
      <div className="row-between">
        <span className="row card-title">
          <span style={{ color: 'var(--accent)' }}>
            <Icon name="branch" size={20} />
          </span>
          {project.name}
        </span>
        <span className="row" style={{ gap: 8 }}>
          <span className="tag">{STATUS[project.status]}</span>
          <Icon name="chevron" size={20} />
        </span>
      </div>
      <p className="small" style={{ color: 'var(--text-2)' }}>{project.description}</p>
      {project.technologies.length > 0 && (
        <div className="tags">
          {project.technologies.slice(0, 4).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="meta">
        {project.isBeginnerFriendly && <span className="tag green">débutant bienvenu</span>}
        <span>
          {project.memberCount} membre{project.memberCount > 1 ? 's' : ''}
        </span>
      </div>
      <p className="xs muted">{project.owner.displayName} · Voir les tâches →</p>
    </Link>
  );
}

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
    <main className="screen with-nav">
      <TopBar
        avatar
        title="Projets"
        right={
          <Link to="/publish?type=project_launch" className="btn btn-primary">
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
        <div className="stack pad" style={{ paddingBottom: 16 }}>
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

function NewProject({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [form, setForm] = useState({ name: '', description: '', repositoryUrl: '', technologies: '', isBeginnerFriendly: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 3) return setError('Le nom doit faire au moins 3 caractères.');
    if (form.description.trim() && form.description.trim().length < 10) return setError('Décris le projet en au moins 10 caractères.');
    setBusy(true);
    setError(null);
    try {
      const repo = form.repositoryUrl.trim();
      onCreated(
        await api.createProject({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          repositoryUrl: repo ? (repo.startsWith('http') ? repo : `https://${repo}`) : undefined,
          technologies: form.technologies.split(',').map((t) => t.trim()).filter(Boolean),
          isBeginnerFriendly: form.isBeginnerFriendly,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Ajouter un projet" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="np-name">Nom du projet</label>
          <input id="np-name" className="input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="devlink" />
        </div>
        <div className="field">
          <label htmlFor="np-desc">Description</label>
          <textarea id="np-desc" className="textarea" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ce que fait le projet et l’aide recherchée." />
        </div>
        <div className="field">
          <label htmlFor="np-repo">Dépôt GitHub · facultatif</label>
          <input id="np-repo" className="input mono" inputMode="url" value={form.repositoryUrl} onChange={(e) => setForm({ ...form, repositoryUrl: e.target.value })} placeholder="github.com/awacodes/devlink" />
        </div>
        <div className="field">
          <label htmlFor="np-tech">Technologies</label>
          <input id="np-tech" className="input" value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, TypeScript" />
          <p className="hint">Sépare-les par des virgules.</p>
        </div>
        <label className="row-between">
          <span className="small">Accueille les débutants</span>
          <span className="switch">
            <input type="checkbox" checked={form.isBeginnerFriendly} onChange={(e) => setForm({ ...form, isBeginnerFriendly: e.target.checked })} />
            <span />
          </span>
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" aria-label="Création" /> : 'Créer le projet'}
        </button>
      </form>
    </Sheet>
  );
}

function TaskRow({ task, projectId }: { task: Task; projectId: string }) {
  return (
    <Link to={`/projects/${projectId}/tasks/${task.id}`} className="list-item" style={{ alignItems: 'flex-start' }}>
      <span style={{ color: task.status === 'DONE' ? 'var(--text-3)' : 'var(--success)', paddingTop: 2 }}>
        <Icon name="circle" size={20} />
      </span>
      <div className="grow stack-s" style={{ gap: 4 }}>
        <p className="strong">{task.title}</p>
        <p className="xs muted">
          {TASK_STATUS[task.status]}
          {task.assignedUser && ` · ${task.assignedUser.displayName}`}
        </p>
        {task.isBeginnerFriendly && <span className="tag green" style={{ alignSelf: 'flex-start' }}>good first issue</span>}
      </div>
      <Icon name="chevron" size={20} />
    </Link>
  );
}

function ContributeSheet({ projectId, taskId, onClose }: { projectId: string; taskId?: string; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) return setError('Dis-en un peu plus (10 caractères minimum).');
    setBusy(true);
    setError(null);
    try {
      await api.contribute(projectId, message.trim(), taskId);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={taskId ? 'Proposer mon aide' : 'Contribuer au projet'} onClose={onClose}>
      {done ? (
        <div className="stack center">
          <p className="alert success">Proposition envoyée. L’équipe du projet va te répondre.</p>
          <button type="button" className="btn btn-block" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="contrib">Ton message à l’équipe</label>
            <textarea id="contrib" className="textarea" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ce que tu proposes de faire, et comment tu comptes t’y prendre." />
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-label="Envoi" /> : 'Envoyer ma proposition'}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function NewTask({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (t: Task) => void }) {
  const [form, setForm] = useState({ title: '', description: '', criteria: '', isBeginnerFriendly: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) return setError('Le titre doit faire au moins 3 caractères.');
    if (form.description.trim().length < 10) return setError('Décris la tâche en au moins 10 caractères.');
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await api.createTask(projectId, {
          title: form.title.trim(),
          description: form.description.trim(),
          acceptanceCriteria: form.criteria.split('\n').map((c) => c.trim()).filter(Boolean),
          isBeginnerFriendly: form.isBeginnerFriendly,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Nouvelle tâche" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="nt-title">Titre</label>
          <input id="nt-title" className="input" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nt-desc">Description</label>
          <textarea id="nt-desc" className="textarea" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nt-crit">Critères d’acceptation</label>
          <textarea id="nt-crit" className="textarea" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder="Un critère par ligne" />
        </div>
        <label className="row-between">
          <span className="small">Bonne première tâche (good first issue)</span>
          <span className="switch">
            <input type="checkbox" checked={form.isBeginnerFriendly} onChange={(e) => setForm({ ...form, isBeginnerFriendly: e.target.checked })} />
            <span />
          </span>
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" aria-label="Création" /> : 'Créer la tâche'}
        </button>
      </form>
    </Sheet>
  );
}

export function ProjectDetail() {
  const me = useMe();
  const { id = '' } = useParams();
  const [tab, setTab] = useState<'overview' | 'tasks' | 'discussions'>('overview');
  const [contributing, setContributing] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const project = useLoad(() => api.project(id), [id]);
  const tasks = useLoad(() => api.tasks(id), [id]);

  if (project.error) return <main className="screen"><TopBar back title="Projet" /><ErrorState message={project.error} onRetry={project.reload} /></main>;
  if (!project.data) return <main className="screen"><TopBar back title="Projet" /><Loading /></main>;
  const p = project.data;
  const repo = p.repositoryUrl && findRepoUrl(p.repositoryUrl);
  const open = (tasks.data ?? []).filter((t) => t.status !== 'DONE');
  const isOwner = p.ownerId === me.id;

  return (
    <main className="screen">
      <TopBar back title={p.name} />
      <section className="section stack-s">
        <div className="row-between">
          <h2 className="card-title" style={{ fontSize: 18 }}>{repoName(p)}</h2>
          <span className="tag">{STATUS[p.status]}</span>
        </div>
        <p style={{ color: 'var(--text-2)' }}>{p.description}</p>
        <div className="tags">
          {p.technologies.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
          {p.isBeginnerFriendly && <span className="tag green">débutant bienvenu</span>}
        </div>
        <p className="row small muted">
          <Avatar user={p.owner} size="s" /> Par {p.owner.displayName} · {p.memberCount} membre{p.memberCount > 1 ? 's' : ''}
        </p>
      </section>
      <Tabs
        label="Sections du projet"
        value={tab}
        onChange={setTab}
        tabs={[
          ['overview', 'Aperçu'],
          ['tasks', 'Tâches'],
          ['discussions', 'Discussions'],
        ]}
      />
      <div className="grow">
        {tab === 'overview' && (
          <>
            {repo && (
              <section className="section stack-s">
                <h2 className="section-title">Dépôt</h2>
                <RepoCard url={repo} />
              </section>
            )}
            <section className="row-between section">
              <h2 className="section-title">Choisissez une première tâche</h2>
              <span className="xs muted">{open.length} ouverte{open.length > 1 ? 's' : ''}</span>
            </section>
            {tasks.loading ? <Loading /> : open.length ? open.slice(0, 3).map((t) => <TaskRow key={t.id} task={t} projectId={id} />) : <Empty icon="check" title="Aucune tâche ouverte">{isOwner ? 'Découpe ton projet en tâches pour guider les contributeurs.' : 'Propose directement ton aide à l’équipe.'}</Empty>}
          </>
        )}
        {tab === 'tasks' && (
          <>
            {isOwner && (
              <div className="pad" style={{ padding: 16 }}>
                <button type="button" className="btn btn-block" onClick={() => setNewTask(true)}>
                  <Icon name="plus" size={18} /> Nouvelle tâche
                </button>
              </div>
            )}
            {tasks.error ? <ErrorState message={tasks.error} onRetry={tasks.reload} /> : tasks.loading ? <Loading /> : tasks.data!.length ? tasks.data!.map((t) => <TaskRow key={t.id} task={t} projectId={id} />) : <Empty icon="check" title="Pas encore de tâche" />}
          </>
        )}
        {tab === 'discussions' && (
          <Empty icon="chat" title="Discussions bientôt disponibles" action={<Link to="/messages" className="btn">Écrire à l’équipe en message</Link>}>
            Le serveur ne gère pas encore les discussions de projet.
          </Empty>
        )}
      </div>
      <div className="footer-cta row">
        {!isOwner && (
          <button type="button" className="btn btn-primary btn-block grow" onClick={() => setContributing(true)}>
            Contribuer
          </button>
        )}
        {p.repositoryUrl && (
          <a href={p.repositoryUrl} target="_blank" rel="noreferrer" className="btn btn-block grow">
            <Icon name="external" size={18} /> Voir sur GitHub
          </a>
        )}
      </div>
      {contributing && <ContributeSheet projectId={id} onClose={() => setContributing(false)} />}
      {newTask && (
        <NewTask
          projectId={id}
          onClose={() => setNewTask(false)}
          onCreated={(t) => {
            tasks.setData([...(tasks.data ?? []), t]);
            setNewTask(false);
          }}
        />
      )}
    </main>
  );
}

export function TaskDetail() {
  const { id = '', taskId = '' } = useParams();
  const [helping, setHelping] = useState(false);
  const data = useLoad(() => Promise.all([api.project(id), api.tasks(id)]), [id]);

  if (data.error) return <main className="screen"><TopBar back title="Tâche" /><ErrorState message={data.error} onRetry={data.reload} /></main>;
  if (!data.data) return <main className="screen"><TopBar back title="Tâche" /><Loading /></main>;
  const [project, tasks] = data.data;
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return <main className="screen"><TopBar back title="Tâche" /><Empty title="Tâche introuvable">Elle a peut-être été supprimée.</Empty></main>;

  return (
    <main className="screen">
      <TopBar back={`/projects/${id}`} title={task.title} sub={`${project.name} · Retour aux tâches`} />
      <div className="pad stack" style={{ paddingTop: 8 }}>
        <p className="post-handle">{repoName(project)}</p>
        <div className="tags">
          <span className="tag green">{TASK_STATUS[task.status]}</span>
          {task.isBeginnerFriendly && <span className="tag">good first issue</span>}
        </div>
        {task.assignedUser && <p className="small muted">Prise par {task.assignedUser.displayName} · @{task.assignedUser.username}</p>}
        <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
        {task.acceptanceCriteria.length > 0 && (
          <section className="stack-s">
            <h2 className="section-title">Critères d’acceptation</h2>
            <ul className="stack-s" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {task.acceptanceCriteria.map((c) => (
                <li key={c} className="row small" style={{ alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ width: 16, height: 16, border: '1.5px solid var(--text-3)', borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="spacer" />
      <div className="footer-cta stack-s">
        {task.status !== 'DONE' && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => setHelping(true)}>
            <Icon name="comment" size={20} /> Proposer mon aide
          </button>
        )}
        {project.repositoryUrl && (
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block">
            <Icon name="external" size={18} /> Voir le dépôt sur GitHub
          </a>
        )}
      </div>
      {helping && <ContributeSheet projectId={id} taskId={task.id} onClose={() => setHelping(false)} />}
    </main>
  );
}
