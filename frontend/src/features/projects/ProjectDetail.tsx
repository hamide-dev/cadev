import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { RepoCard } from '../../components/RepoCard';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { PROJECT_STATUS, repoName, TASK_STATUS } from './labels';
import { ContributeSheet, NewTask } from './sheets';
import { api, type Task } from '../../lib/api';
import { findRepoUrl } from '../../lib/format';
import { useMe } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';

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
          <span className="tag">{PROJECT_STATUS[p.status]}</span>
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
