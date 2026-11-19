import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { RepoCard } from '../../components/RepoCard';
import { RichText } from './RichText';
import { CodeBlock } from './CodeBlock';
import { PhotoMosaic } from './PhotoMosaic';
import { api, type Post } from '../../lib/api';
import { errorMessage, findRepoUrl, timeAgo } from '../../lib/format';
import { useSession } from '../../lib/session';
import { isSaved, toggleSaved, useSaved } from '../../lib/saved';
import { Video } from '../../components/Video';

const TYPE_LABEL: Record<Post['type'], string | null> = { QUESTION: 'Question', PROJECT_LAUNCH: 'Projet', ARTICLE: null };

export function PostCard({ post, onChange, onDelete, linked = true }: { post: Post; onChange?: (post: Post) => void; onDelete?: (id: string) => void; linked?: boolean }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const repo = findRepoUrl(post.content);
  const mine = user?.id === post.author.id;
  const typeLabel = TYPE_LABEL[post.type];
  const videos = post.attachments.filter((media) => media.resourceType === 'video');
  const photos = post.attachments
    .filter((media) => media.resourceType !== 'video')
    .map((media, index, all) => ({ src: media.url, alt: `Image ${all.length > 1 ? `${index + 1} ` : ''}de ${post.author.displayName}` }));
  const saved = isSaved(useSaved(), post.id);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${post.author.displayName} sur Hello World`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Partage annulé par l'utilisateur.
    }
  };

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
      {post.codeSnippet && <CodeBlock code={post.codeSnippet} />}
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
          <div style={{ position: 'relative' }}>
            <button type="button" className="icon-btn" aria-label="Options de la publication" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon name="more" />
            </button>
            {menu && (
              <>
                <div className="menu-scrim" onClick={() => setMenu(false)} />
                <div className="menu" role="menu">
                  <button type="button" role="menuitem" className="list-item" onClick={() => { setMenu(false); void share(); }}>
                    <Icon name="share" size={18} /> Partager
                  </button>
                  <button type="button" role="menuitem" className="list-item" onClick={() => { toggleSaved(post); setMenu(false); }}>
                    <Icon name="bookmark" size={18} /> {saved ? 'Retirer des sauvegardes' : 'Sauvegarder'}
                  </button>
                  {mine && onDelete && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
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
                        role="menuitem"
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>
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
            {typeLabel && <span className={`tag type-${post.type.toLowerCase()}`}>{typeLabel}</span>}
            {post.tags.map((tag) => (
              <span key={tag} className="tag grey">#{tag}</span>
            ))}
          </div>
        )}
        {videos.length > 0 && (
          <div className="media-grid">
            {videos.map((media) => (
              <Video key={media.id} id={media.id} src={media.url} post={post} onPostChange={onChange} />
            ))}
          </div>
        )}
        {photos.length > 0 && <PhotoMosaic photos={photos} post={post} onPostChange={onChange} />}
        {/* Pas d’aperçu de lien dans les publications : le lien seul suffit. Seul un dépôt GitHub a sa carte. */}
        {repo && <RepoCard url={repo} />}
        <div className="post-actions">
          <Link to={`/post/${post.id}`} className="action" aria-label={post.type === 'QUESTION' ? 'Voir les réponses' : 'Voir les commentaires'}>
            <Icon name="comment" size={20} />
            <span>{post.commentCount}</span>
            {post.type === 'QUESTION' ? 'Répondre' : 'Commenter'}
          </Link>
          <button type="button" className="action" aria-pressed={!!post.likedByMe} onClick={toggleLike} aria-label={post.likedByMe ? "Retirer le j'aime" : "J'aime"}>
            <Icon name="heart" size={20} />
            {post.likeCount}
          </button>
          <span className="grow" />
          <button type="button" className="action" aria-pressed={saved} data-kind="save" onClick={() => toggleSaved(post)} aria-label={saved ? 'Retirer des sauvegardes' : 'Sauvegarder'}>
            <Icon name="bookmark" size={20} />
          </button>
          <button type="button" className="action" onClick={share} aria-label="Partager la publication">
            <Icon name={copied ? 'check' : 'share'} size={20} />
            {copied && <span className="xs">Lien copié</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
