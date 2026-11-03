import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { RepoCard } from '../../components/RepoCard';
import { RichText } from './RichText';
import { api, type Post } from '../../lib/api';
import { errorMessage, findRepoUrl, timeAgo } from '../../lib/format';
import { useSession } from '../../lib/session';

const TYPE_LABEL: Record<Post['type'], string | null> = { QUESTION: '? Question technique', PROJECT_LAUNCH: 'Projet', ARTICLE: null };

export function PostCard({ post, onChange, onDelete, linked = true }: { post: Post; onChange?: (post: Post) => void; onDelete?: (id: string) => void; linked?: boolean }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const repo = findRepoUrl(post.content);
  const mine = user?.id === post.author.id;
  const typeLabel = TYPE_LABEL[post.type];

  const toggleLike = async () => {
    if (!user) return navigate('/login');
    const on = !post.likedByMe;
    onChange?.({ ...post, likedByMe: on, likeCount: post.likeCount + (on ? 1 : -1) });
    try {
      await api.like(post.id, on);
    } catch {
      onChange?.(post);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      alert(errorMessage(error));
    } finally {
      setBusy(false);
      setMenu(false);
    }
  };

  const body = (
    <>
      <RichText text={repo ? post.content.replace(repo, '').trim() : post.content} />
      {post.codeSnippet && <pre className="code">{post.codeSnippet}</pre>}
    </>
  );

  return (
    <article className="post" aria-label={`Publication de ${post.author.displayName}`}>
      <Avatar user={post.author} />
      <div className="post-body">
        {post.isPinned && (
          <span className="row xs muted">
            <Icon name="pin" size={14} /> Publication épinglée
          </span>
        )}
        <div className="post-head">
          <div className="grow">
            <Link to={`/u/${post.author.username}`} className="post-name">
              {post.author.displayName}
            </Link>
            <div className="post-handle">
              @{post.author.username} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </div>
          </div>
          {mine && onDelete && (
            <div style={{ position: 'relative' }}>
              <button type="button" className="icon-btn" aria-label="Options de la publication" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <Icon name="more" />
              </button>
              {menu && (
                <div className="group" style={{ position: 'absolute', right: 0, top: 44, zIndex: 5, minWidth: 200 }}>
                  <button
                    type="button"
                    className="list-item"
                    disabled={busy}
                    onClick={() => run(async () => {
                      await api.pin(post.id, !post.isPinned);
                      onChange?.({ ...post, isPinned: !post.isPinned });
                    })}
                  >
                    <Icon name="pin" size={18} /> {post.isPinned ? 'Désépingler' : 'Épingler sur mon profil'}
                  </button>
                  <button
                    type="button"
                    className="list-item"
                    style={{ color: 'var(--danger)' }}
                    disabled={busy}
                    onClick={() => confirm('Supprimer cette publication ?') && run(async () => {
                      await api.deletePost(post.id);
                      onDelete(post.id);
                    })}
                  >
                    <Icon name="x" size={18} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {linked ? (
          <Link to={`/post/${post.id}`} className="post-link">
            {body}
          </Link>
        ) : (
          body
        )}
        {(typeLabel || post.tags.length > 0) && (
          <div className="tags">
            <span className="tag outline">{[typeLabel, ...post.tags].filter(Boolean).join(' · ')}</span>
          </div>
        )}
        {post.attachments.length > 0 && (
          <div className="media-grid">
            {post.attachments.map((media) =>
              media.resourceType === 'video' ? (
                <video key={media.id} src={media.url} controls preload="metadata" />
              ) : (
                <img key={media.id} src={media.url} alt="Pièce jointe" loading="lazy" />
              ),
            )}
          </div>
        )}
        {repo && <RepoCard url={repo} />}
        <div className="post-actions">
          <Link to={`/post/${post.id}`} className="action" aria-label={post.type === 'QUESTION' ? 'Voir les réponses' : 'Voir les commentaires'}>
            <Icon name="comment" size={20} />
            {post.type === 'QUESTION' ? 'Répondre' : 'Commenter'}
          </Link>
          <button type="button" className="action" aria-pressed={!!post.likedByMe} onClick={toggleLike} aria-label={post.likedByMe ? "Retirer le j'aime" : "J'aime"}>
            <Icon name="heart" size={20} />
            {post.likeCount}
          </button>
        </div>
      </div>
    </article>
  );
}
