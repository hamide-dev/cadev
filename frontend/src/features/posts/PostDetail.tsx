import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { PostCard } from './PostCard';
import { RichText } from './RichText';
import { api, type Comment } from '../../lib/api';
import { errorMessage, timeAgo } from '../../lib/format';
import { useMe } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';

const PAGE = 5;
const CLAMP = 280;

type ItemProps = {
  comment: Comment;
  nested?: boolean;
  replyTo: { username: string } | null;
  isQuestion: boolean;
  useful: boolean;
  mine: boolean;
  onReply: (comment: Comment) => void;
  onUseful: (comment: Comment) => void;
};

function CommentItem({ comment: c, nested = false, replyTo, isQuestion, useful, mine, onReply, onUseful }: ItemProps) {
  const [full, setFull] = useState(false);
  const long = c.content.length > CLAMP;
  return (
    <article className={`post comment ${nested ? 'comment-nested' : ''}`}>
      <Avatar user={c.author} size={nested ? 's' : undefined} />
      <div className="post-body">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <Link to={`/u/${c.author.username}`} className="post-name">{c.author.displayName}</Link>
          <span className="post-handle">· {timeAgo(c.createdAt)}</span>
        </div>
        {nested && replyTo && <p className="xs" style={{ color: 'var(--accent)' }}>En réponse à @{replyTo.username}</p>}
        <RichText text={long && !full ? `${c.content.slice(0, CLAMP).trimEnd()}…` : c.content} />
        {long && (
          <button type="button" className="link-more" onClick={() => setFull(!full)}>
            {full ? 'Voir moins' : 'Voir plus'}
          </button>
        )}
        <div className="post-actions">
          <button type="button" className="action" onClick={() => onReply(c)}>
            <Icon name="comment" size={16} /> Répondre
          </button>
          {isQuestion && (
            <button type="button" className="action" aria-pressed={useful} style={useful ? { color: 'var(--success)' } : undefined} onClick={() => onUseful(c)} disabled={mine}>
              <Icon name="check" size={16} /> Utile · {c.usefulCount}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PostDetail() {
  const me = useMe();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [sort, setSort] = useState<'useful' | 'chronological'>('useful');
  const [following, setFollowing] = useState(false);
  const [useful, setUseful] = useState<Record<string, boolean>>({});
  const [reply, setReply] = useState('');
  const [parent, setParent] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Comme sur TikTok : quelques commentaires d'abord, les réponses repliées sous chacun.
  const [shown, setShown] = useState(PAGE);
  const [openThreads, setOpenThreads] = useState<Record<string, boolean>>({});

  const post = useLoad(() => api.post(id), [id]);
  const isQuestion = post.data?.type === 'QUESTION';
  const comments = useLoad(
    () => (post.data ? (isQuestion ? api.answers(id, sort) : api.comments(id)) : Promise.resolve([] as Comment[])),
    [id, post.data?.type, sort],
  );

  if (post.error) return <main className="screen"><TopBar back title="Discussion" /><ErrorState message={post.error} onRetry={post.reload} /></main>;
  if (!post.data) return <main className="screen"><TopBar back title="Discussion" /><Loading /></main>;
  const p = post.data;
  const all = comments.data ?? [];
  const byId = new Map(all.map((c) => [c.id, c]));
  // Chaque réponse est rangée sous son commentaire racine, quelle que soit sa profondeur.
  const rootOf = (c: Comment): string => {
    let current = c;
    const seen = new Set<string>();
    while (current.parentCommentId && byId.has(current.parentCommentId) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parentCommentId)!;
    }
    return current.id;
  };
  const roots = all.filter((c) => !c.parentCommentId || !byId.has(c.parentCommentId));
  const replies = new Map<string, Comment[]>();
  for (const c of all) {
    if (!c.parentCommentId || !byId.has(c.parentCommentId)) continue;
    const root = rootOf(c);
    replies.set(root, [...(replies.get(root) ?? []), c]);
  }

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const created = await api.comment(id, reply.trim(), isQuestion, parent?.id);
      comments.setData([...(comments.data ?? []), created]);
      if (created.parentCommentId) {
        const parentComment = byId.get(created.parentCommentId);
        if (parentComment) setOpenThreads((t) => ({ ...t, [rootOf(parentComment)]: true }));
      } else setShown((n) => Math.max(n, roots.length + 1));
      setReply('');
      setParent(null);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const toggleUseful = async (comment: Comment) => {
    const on = !useful[comment.id];
    setUseful((u) => ({ ...u, [comment.id]: on }));
    comments.setData(comments.data!.map((c) => (c.id === comment.id ? { ...c, usefulCount: c.usefulCount + (on ? 1 : -1) } : c)));
    await api.useful(comment.id, on).catch(() => comments.reload());
  };

  const itemProps = (c: Comment) => ({
    comment: c,
    isQuestion,
    useful: !!useful[c.id],
    mine: c.author.id === me.id,
    onReply: (target: Comment) => {
      setParent(target);
      document.getElementById('reply')?.focus();
    },
    onUseful: toggleUseful,
  });

  return (
    <main className="screen">
      <TopBar back title={isQuestion ? 'Discussion' : 'Publication'} />
      <PostCard post={p} linked={false} onChange={post.setData} onDelete={() => navigate('/feed')} />
      <div className="row-between section xs muted">
        <span>
          {isQuestion ? 'Question technique' : 'Publication'} · Public · {new Date(p.createdAt).toLocaleString('fr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        {isQuestion && p.author.id !== me.id && (
          <button
            type="button"
            className="btn btn-s"
            aria-pressed={following}
            onClick={async () => {
              setFollowing(!following);
              await api.followQuestion(p.id, !following).catch(() => setFollowing(following));
            }}
          >
            {following ? 'Question suivie' : 'Suivre la question'}
          </button>
        )}
      </div>
      <div className="row-between section">
        <h2 className="section-title">
          {comments.data?.length ?? '…'} {isQuestion ? 'réponse' : 'commentaire'}
          {(comments.data?.length ?? 0) > 1 ? 's' : ''}
        </h2>
        {isQuestion && (
          <label className="row small muted">
            <span className="sr-only">Trier les réponses</span>
            <select className="select" style={{ minHeight: 36, padding: '0 8px', width: 'auto', fontSize: 13 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="useful">Les plus utiles</option>
              <option value="chronological">Les plus anciennes</option>
            </select>
          </label>
        )}
      </div>
      <div className="grow">
        {comments.error ? (
          <ErrorState message={comments.error} onRetry={comments.reload} />
        ) : comments.loading && !comments.data ? (
          <Loading />
        ) : comments.data!.length === 0 ? (
          <Empty icon="comment" title={isQuestion ? 'Pas encore de réponse' : 'Pas encore de commentaire'}>
            {isQuestion ? 'Partage ce que tu sais, même une piste aide.' : 'Lance la discussion.'}
          </Empty>
        ) : (
          <>
            {roots.slice(0, shown).map((c) => {
              const thread = replies.get(c.id) ?? [];
              const expanded = !!openThreads[c.id];
              return (
                <div key={c.id} className="thread">
                  <CommentItem {...itemProps(c)} replyTo={isQuestion ? p.author : null} />
                  {thread.length > 0 && (
                    <div className="thread-replies">
                      {expanded && thread.map((r) => <CommentItem key={r.id} {...itemProps(r)} nested replyTo={byId.get(r.parentCommentId!)?.author ?? null} />)}
                      <button type="button" className="thread-toggle" aria-expanded={expanded} onClick={() => setOpenThreads((t) => ({ ...t, [c.id]: !expanded }))}>
                        <span className="thread-line" aria-hidden="true" />
                        {expanded ? 'Masquer les réponses' : `Voir ${thread.length} réponse${thread.length > 1 ? 's' : ''}`}
                        <Icon name="chevron" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {roots.length > shown && (
              <button type="button" className="more-comments" onClick={() => setShown((n) => n + PAGE)}>
                Voir plus de {isQuestion ? 'réponses' : 'commentaires'} ({roots.length - shown})
              </button>
            )}
          </>
        )}
      </div>
      <form className="composer" onSubmit={send} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {parent && (
          <p className="row-between xs muted">
            En réponse à @{parent.author.username}
            <button type="button" className="link xs" onClick={() => setParent(null)}>
              Annuler
            </button>
          </p>
        )}
        {sendError && <p className="error-text">{sendError}</p>}
        <div className="row">
          <Avatar user={me} size="s" link={false} />
          <label className="grow">
            <span className="sr-only">Ta réponse</span>
            <textarea id="reply" className="textarea" rows={1} placeholder={`Répondre à ${(parent?.author ?? p.author).displayName.split(' ')[0]}…`} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} />
          </label>
          <button type="submit" className="icon-btn" aria-label="Envoyer" disabled={sending || !reply.trim()}>
            {sending ? <span className="spinner" /> : <Icon name="send" />}
          </button>
        </div>
      </form>
    </main>
  );
}
