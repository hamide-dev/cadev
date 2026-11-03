import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { PROJECT_STATUS } from './labels';
import { type Project } from '../../lib/api';

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
          <span className="tag">{PROJECT_STATUS[project.status]}</span>
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
