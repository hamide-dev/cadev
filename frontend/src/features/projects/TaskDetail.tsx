import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { repoName, TASK_STATUS } from './labels';
import { ContributeSheet } from './sheets';
import { api } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';

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
