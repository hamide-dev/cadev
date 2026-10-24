import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, uploadToCloudinary, type Comment, type Media, type Post, type PostType } from '../api';
import { useMe } from '../auth';
import {
  Avatar,
  Empty,
  ErrorState,
  errorMessage,
  findRepoUrl,
  Icon,
  INTERESTS,
  Loading,
  LogoMark,
  PostCard,
  PostFeed,
  RepoCard,
  RichText,
  roleLine,
  Tabs,
  timeAgo,
  TopBar,
  useLoad,
} from '../ui';

export function Feed() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'following' ? 'following' : 'for-you';
  const load = useCallback((cursor?: string | null) => api.feed(tab, cursor), [tab]);

  return (
    <main className="screen with-nav">
      <header className="topbar">
        <Avatar user={me} size="s" />
        <div className="grow center">
          <Link to="/feed" aria-label="Hello World, accueil">
            <LogoMark size={44} />
          </Link>
        </div>
        <Link to="/publish" className="btn btn-primary">
          Publier
        </Link>
      </header>
      <Tabs
        label="Fils"
        tabs={[
          ['for-you', 'Pour vous'],
          ['following', 'Abonnements'],
        ]}
        value={tab}
        onChange={(value) => setParams(value === 'following' ? { tab: value } : {})}
      />
      {tab === 'for-you' && me.interests.length > 0 && (
        <p className="row xs muted section" style={{ gap: 6 }}>
          <span style={{ color: 'var(--star)' }}>⚡</span> Basé sur vos intérêts{' '}
          {me.interests.slice(0, 3).map((topic) => (
            <span key={topic} style={{ color: 'var(--accent)' }}>
              {topic}
            </span>
          ))}
        </p>
      )}
      <PostFeed
        key={tab}
        load={load}
        empty={
          tab === 'following' ? (
            <Empty icon="search" title="Tu ne suis encore personne" action={<Link to="/explore" className="btn">Découvrir des développeurs</Link>}>
              Abonne-toi à des développeurs pour retrouver ici leurs publications, dans l'ordre chronologique.
            </Empty>
          ) : (
            <Empty
              icon="home"
              title="Ton fil est encore calme"
              action={
                <Link to="/publish" className="btn btn-primary">
                  Écrire la première publication
                </Link>
              }
            >
              {me.interests.length
                ? 'Aucune publication ne correspond encore à tes intérêts. Lance la conversation.'
                : 'Choisis tes centres d’intérêt dans ton profil pour que ce fil se remplisse.'}
            </Empty>
          )
        }
      />
    </main>
  );
}

type ExploreTab = 'all' | 'devs' | 'projects' | 'questions';

export function Explore() {
  const me = useMe();
  const [tab, setTab] = useState<ExploreTab>('all');
  const [query, setQuery] = useState('');
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const { data, error, loading, reload } = useLoad(() => Promise.all([api.posts(), api.projects()]), []);

  const q = query.trim().toLowerCase();
  const match = (...texts: Array<string | null | undefined>) => !q || texts.some((t) => t?.toLowerCase().includes(q));

  const { devs, questions, projects } = useMemo(() => {
    const [page, projectList] = data ?? [{ items: [] as Post[] }, []];
    const authors = new Map(page.items.filter((p) => p.author.id !== me.id).map((p) => [p.author.id, p.author]));
    return {
      devs: [...authors.values()],
      questions: page.items.filter((p) => p.type === 'QUESTION'),
      projects: projectList,
    };
  }, [data, me.id]);

  const toggleFollow = async (username: string) => {
    const on = !followed[username];
    setFollowed((f) => ({ ...f, [username]: on }));
    try {
      await (on ? api.follow(username) : api.unfollow(username));
    } catch (err) {
      setFollowed((f) => ({ ...f, [username]: !on }));
      alert(errorMessage(err));
    }
  };

  const shownDevs = devs.filter((d) => match(d.displayName, d.username));
  const shownQuestions = questions.filter((p) => match(p.content, ...p.tags));
  const shownProjects = projects.filter((p) => match(p.name, p.description, ...p.technologies));
  const nothing = !shownDevs.length && !shownQuestions.length && !shownProjects.length;

  return (
    <main className="screen with-nav">
      <TopBar
        avatar
        title="Explorer"
        right={
          <Link to="/publish" className="btn btn-primary">
            Publier
          </Link>
        }
      />
      <div className="pad" style={{ paddingBottom: 12 }}>
        <label className="input-wrap">
          <span className="sr-only">Rechercher</span>
          <span style={{ position: 'absolute', left: 14, color: 'var(--text-3)' }}>
            <Icon name="search" size={22} />
          </span>
          <input className="input" type="search" style={{ paddingLeft: 46 }} placeholder="Personnes, questions, projets" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {q && <p className="xs muted" style={{ marginTop: 8 }}>Recherche parmi les contenus récents.</p>}
      </div>
      <Tabs
        label="Catégories"
        value={tab}
        onChange={setTab}
        tabs={[
          ['all', 'Tout'],
          ['devs', 'Développeurs'],
          ['projects', 'Projets'],
          ['questions', 'Questions'],
        ]}
      />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Loading />
      ) : (
        <>
          {tab === 'all' && me.interests.length > 0 && !q && (
            <section className="section stack-s">
              <h2 className="section-title">À explorer selon vos intérêts</h2>
              <div className="tags">
                {me.interests.map((topic) => (
                  <button key={topic} type="button" className="tag" style={{ border: 0, cursor: 'pointer', minHeight: 32 }} onClick={() => setQuery(topic)}>
                    {topic}
                  </button>
                ))}
              </div>
            </section>
          )}
          {(tab === 'all' || tab === 'devs') && shownDevs.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Développeurs à découvrir</h2>
              {shownDevs.slice(0, tab === 'all' ? 3 : undefined).map((dev) => (
                <div key={dev.id} className="row" style={{ gap: 12 }}>
                  <Avatar user={dev} />
                  <Link to={`/u/${dev.username}`} className="grow" style={{ textDecoration: 'none' }}>
                    <p className="strong">{dev.displayName}</p>
                    <p className="post-handle">@{dev.username}</p>
                  </Link>
                  <button type="button" className={`btn btn-s ${followed[dev.username] ? '' : 'btn-primary'}`} aria-pressed={!!followed[dev.username]} onClick={() => toggleFollow(dev.username)}>
                    {followed[dev.username] ? 'Abonné' : 'Suivre'}
                  </button>
                </div>
              ))}
            </section>
          )}
          {(tab === 'all' || tab === 'projects') &&
            shownProjects.slice(0, tab === 'all' ? 2 : undefined).map((project) => (
              <div key={project.id} className="section">
                <ProjectCardLink project={project} />
              </div>
            ))}
          {(tab === 'all' || tab === 'questions') &&
            (tab === 'all' ? shownQuestions.slice(0, 1) : shownQuestions).map((post) =>
              tab === 'all' ? (
                <section key={post.id} className="section stack-s">
                  <h2 className="row section-title">
                    <span style={{ color: 'var(--accent)' }}>
                      <Icon name="comment" size={20} />
                    </span>
                    Question de la communauté
                  </h2>
                  <RichText text={post.content.split('\n')[0]!} />
                  <p className="xs muted">
                    @{post.author.username} · {post.tags.join(' · ')}
                  </p>
                  <Link to={`/post/${post.id}`} className="btn btn-block" style={{ minHeight: 44 }}>
                    <Icon name="arrow" size={18} /> Ouvrir la discussion
                  </Link>
                </section>
              ) : (
                <PostCard key={post.id} post={post} />
              ),
            )}
          {nothing && (
            <Empty icon="search" title={q ? 'Aucun résultat' : 'Rien à explorer pour l’instant'}>
              {q ? `Rien ne correspond à « ${query} » dans les contenus récents.` : 'Les premières publications et les premiers projets apparaîtront ici.'}
            </Empty>
          )}
        </>
      )}
    </main>
  );
}

function ProjectCardLink({ project }: { project: { id: string; name: string; description: string; technologies: string[]; isBeginnerFriendly: boolean } }) {
  return (
    <Link to={`/projects/${project.id}`} className="card">
      <span className="row card-title">
        <span style={{ color: 'var(--accent)' }}>
          <Icon name="branch" size={20} />
        </span>
        {project.name}
      </span>
      <p className="small muted">{project.description}</p>
      <div className="tags">
        {project.technologies.slice(0, 4).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        {project.isBeginnerFriendly && <span className="tag green">débutant bienvenu</span>}
      </div>
    </Link>
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

  const post = useLoad(() => api.post(id), [id]);
  const isQuestion = post.data?.type === 'QUESTION';
  const comments = useLoad(
    () => (post.data ? (isQuestion ? api.answers(id, sort) : api.comments(id)) : Promise.resolve([] as Comment[])),
    [id, post.data?.type, sort],
  );

  if (post.error) return <main className="screen"><TopBar back title="Discussion" /><ErrorState message={post.error} onRetry={post.reload} /></main>;
  if (!post.data) return <main className="screen"><TopBar back title="Discussion" /><Loading /></main>;
  const p = post.data;
  const byId = new Map((comments.data ?? []).map((c) => [c.id, c]));

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const created = await api.comment(id, reply.trim(), isQuestion, parent?.id);
      comments.setData([...(comments.data ?? []), created]);
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
          comments.data!.map((c) => {
            const replyTo = c.parentCommentId ? byId.get(c.parentCommentId)?.author : isQuestion ? p.author : null;
            return (
              <article key={c.id} className="post">
                <Avatar user={c.author} />
                <div className="post-body">
                  <div>
                    <Link to={`/u/${c.author.username}`} className="post-name">
                      {c.author.displayName}
                    </Link>
                    <div className="post-handle">
                      @{c.author.username} · {timeAgo(c.createdAt)}
                    </div>
                  </div>
                  {replyTo && <p className="small" style={{ color: 'var(--accent)' }}>En réponse à @{replyTo.username}</p>}
                  <RichText text={c.content} />
                  <div className="post-actions">
                    <button type="button" className="action" onClick={() => { setParent(c); document.getElementById('reply')?.focus(); }}>
                      <Icon name="comment" size={18} /> Répondre
                    </button>
                    {isQuestion && (
                      <button type="button" className="action" aria-pressed={!!useful[c.id]} style={useful[c.id] ? { color: 'var(--success)' } : undefined} onClick={() => toggleUseful(c)} disabled={c.author.id === me.id}>
                        <Icon name="check" size={18} /> Utile · {c.usefulCount}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
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

const COMPOSE_TABS: Array<[PostType, string]> = [
  ['ARTICLE', 'Publication'],
  ['QUESTION', 'Question'],
  ['PROJECT_LAUNCH', 'Projet'],
];

export function Compose() {
  const me = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = (COMPOSE_TABS.find(([t]) => t.toLowerCase() === params.get('type')) ?? COMPOSE_TABS[0])[0];
  const [type, setType] = useState<PostType>(initial);
  const [content, setContent] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [repo, setRepo] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState(false);
  const drafts = useLoad(() => api.drafts(), []);

  const repoUrl = repo.trim() ? findRepoUrl(repo.trim().startsWith('http') ? repo.trim() : `https://${repo.trim()}`) : null;
  const topics = [...new Set([...me.interests, ...me.technologies, ...INTERESTS])];

  const attach = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const sig = await api.postSignature(kind);
      await uploadToCloudinary(sig, file, kind);
      const confirmed = await api.confirmPost(sig.publicId, kind);
      setMedia((m) => [...m, confirmed]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (draft: boolean) => {
    let text = content.trim();
    if (type === 'PROJECT_LAUNCH') {
      if (!repoUrl) return setError('Ajoute le lien du dépôt GitHub du projet.');
      if (!text.includes(repoUrl)) text = `${text}\n\n${repoUrl}`.trim();
    }
    if (!text) return setError(type === 'QUESTION' ? 'Écris ta question avant de publier.' : 'Écris quelque chose avant de publier.');
    setBusy(draft ? 'draft' : 'publish');
    setError(null);
    try {
      const post = await api.createPost(
        { type, content: text, codeSnippet: code?.trim() || undefined, tags, attachmentIds: media.map((m) => m.id) },
        draft,
      );
      if (draft) {
        setSavedDraft(true);
        drafts.reload();
      } else navigate(`/post/${post.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const label = type === 'QUESTION' ? 'Publier la question' : type === 'PROJECT_LAUNCH' ? 'Publier le projet' : 'Publier';

  return (
    <main className="screen">
      <TopBar
        title="Publier"
        right={
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Annuler
          </button>
        }
      />
      <Tabs label="Type de publication" tabs={COMPOSE_TABS} value={type} onChange={setType} />
      <div className="section row" style={{ gap: 12 }}>
        <Avatar user={me} link={false} />
        <div className="grow">
          <p className="strong">{me.displayName}</p>
          <p className="post-handle">@{me.username}</p>
          <p className="xs muted">{roleLine(me)}</p>
        </div>
      </div>
      <p className="row section small muted">
        <Icon name="globe" size={18} /> Public · communauté de développeurs
      </p>
      <section className="section stack">
        <label className="label" htmlFor="content">
          {type === 'QUESTION' ? 'Votre question' : type === 'PROJECT_LAUNCH' ? 'Présentez le projet' : 'Votre publication'}
        </label>
        <textarea
          id="content"
          className="textarea"
          style={{ minHeight: 160, border: 0, padding: 0, background: 'none', fontSize: 17 }}
          placeholder={
            type === 'QUESTION'
              ? 'Comment rendre un graphe navigable au clavier ?\n\nDonne le contexte : ce que tu as essayé, ce qui bloque.'
              : type === 'PROJECT_LAUNCH'
                ? 'Ce que fait le projet, où il en est et le type de contributions recherchées.'
                : 'Partage ce que tu codes, une astuce, un retour d’expérience…'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={20000}
        />
        {savedDraft && <p className="xs muted">Brouillon enregistré · non publié</p>}
        {code !== null && (
          <div className="field">
            <div className="row-between">
              <label className="label" htmlFor="code">Extrait de code</label>
              <button type="button" className="link xs" onClick={() => setCode(null)}>
                Retirer
              </button>
            </div>
            <textarea id="code" className="textarea mono" style={{ fontSize: 13 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="const Panel = React.lazy(() => import('./Panel'));" />
          </div>
        )}
      </section>
      {type === 'PROJECT_LAUNCH' && (
        <section className="section stack">
          <div className="field">
            <label htmlFor="repo">Dépôt GitHub</label>
            <input id="repo" className="input mono" inputMode="url" placeholder="github.com/awacodes/devlink" value={repo} onChange={(e) => setRepo(e.target.value)} />
            <p className="hint">Une URL publique suffit, aucune connexion de compte n’est requise.</p>
          </div>
          {repoUrl && <RepoCard url={repoUrl} />}
        </section>
      )}
      <section className="section stack">
        <div className="row-between">
          <h2 className="section-title">Tags techniques</h2>
          <span className="xs muted">{tags.length}/10</span>
        </div>
        <div className="tags">
          {topics.map((topic) => {
            const on = tags.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                className={`tag ${on ? '' : 'grey'}`}
                style={{ border: 0, cursor: 'pointer', minHeight: 32 }}
                aria-pressed={on}
                disabled={!on && tags.length >= 10}
                onClick={() => setTags((list) => (on ? list.filter((t) => t !== topic) : [...list, topic]))}
              >
                {on && '✓ '}
                {topic}
              </button>
            );
          })}
        </div>
        <div className="row wrap">
          {code === null && (
            <button type="button" className="btn btn-s" onClick={() => setCode('')}>
              <Icon name="code" size={18} /> Ajouter du code
            </button>
          )}
          <label className="btn btn-s" aria-disabled={uploading || media.length >= 5}>
            {uploading ? <span className="spinner" /> : <Icon name="clip" size={18} />} Pièce jointe
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              disabled={uploading || media.length >= 5}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) attach(file);
              }}
            />
          </label>
        </div>
        {media.length > 0 && (
          <div className="media-grid">
            {media.map((m) => (
              <div key={m.id} style={{ position: 'relative' }}>
                {m.resourceType === 'video' ? <video src={m.url} preload="metadata" /> : <img src={m.url} alt="Pièce jointe" />}
                <button type="button" className="icon-btn" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)' }} aria-label="Retirer la pièce jointe" onClick={() => setMedia((list) => list.filter((x) => x.id !== m.id))}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {drafts.data && drafts.data.items.length > 0 && (
        <section className="section stack-s">
          <h2 className="section-title">Mes brouillons</h2>
          {drafts.data.items.map((d) => (
            <div key={d.id} className="row-between">
              <p className="small grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.content || 'Brouillon sans texte'}
              </p>
              <button
                type="button"
                className="btn btn-s"
                onClick={async () => {
                  try {
                    const published = await api.publishDraft(d.id);
                    navigate(`/post/${published.id}`);
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                }}
              >
                Publier
              </button>
            </div>
          ))}
        </section>
      )}
      <div className="spacer" />
      <div className="footer-cta stack-s">
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <button type="button" className="btn" style={{ minHeight: 52 }} disabled={!!busy} onClick={() => submit(true)}>
            {busy === 'draft' ? <span className="spinner" /> : 'Brouillon'}
          </button>
          <button type="button" className="btn btn-primary btn-block grow" disabled={!!busy || uploading} onClick={() => submit(false)}>
            {busy === 'publish' ? <span className="spinner" aria-label="Publication en cours" /> : label}
          </button>
        </div>
      </div>
    </main>
  );
}

const SOON = 'Le serveur ne fournit pas encore cette fonctionnalité. Cet écran se remplira dès qu’elle sera disponible.';

export function Notifications() {
  const [tab, setTab] = useState<'all' | 'mentions' | 'projects'>('all');
  return (
    <main className="screen with-nav">
      <TopBar avatar title="Notifications" right={<Link to="/settings" className="icon-btn" aria-label="Paramètres"><Icon name="gear" /></Link>} />
      <Tabs
        label="Filtrer les notifications"
        value={tab}
        onChange={setTab}
        tabs={[
          ['all', 'Tout'],
          ['mentions', 'Mentions'],
          ['projects', 'Projets'],
        ]}
      />
      <Empty icon="bell" title="Bientôt : réponses, mentions et projets" action={<Link to="/feed" className="btn">Retour au fil</Link>}>
        {SOON}
      </Empty>
    </main>
  );
}

export function Saved() {
  const [tab, setTab] = useState<'all' | 'posts' | 'questions' | 'projects'>('all');
  return (
    <main className="screen">
      <TopBar back title="Sauvegardes" sub="Retour au profil" />
      <Tabs
        label="Filtrer les sauvegardes"
        value={tab}
        onChange={setTab}
        tabs={[
          ['all', 'Tout'],
          ['posts', 'Publications'],
          ['questions', 'Questions'],
          ['projects', 'Projets'],
        ]}
      />
      <Empty icon="bookmark" title="Les sauvegardes arrivent bientôt">
        {SOON}
      </Empty>
    </main>
  );
}
