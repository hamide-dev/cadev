import { Icon } from './Icon';
import { api, type RepoPreview } from '../lib/api';
import { useLoad } from '../lib/useLoad';

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
