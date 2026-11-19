import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { RepoCard } from '../../components/RepoCard';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { api, type Media, type PostType, uploadPostToCloudinary } from '../../lib/api';
import { errorMessage, findRepoUrl, INTERESTS, roleLine } from '../../lib/format';
import { useMe } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';
import { useAutosize } from '../../lib/useAutosize';

// Limite du back (ArrayMaxSize(5) sur attachmentIds).
const MAX_MEDIA = 5;
type Pending = { key: string; preview: string; video: boolean };

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
  const contentBox = useAutosize(content);
  const [code, setCode] = useState<string | null>(params.get('code') ? '' : null);
  const [repo, setRepo] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const uploading = pending.length > 0;
  // Aperçu local gardé après l'envoi : la photo ne clignote pas en vide le temps que Cloudinary la renvoie.
  const previews = useRef(new Map<string, string>());
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState(false);
  const drafts = useLoad(() => api.drafts(), []);

  const repoUrl = repo.trim() ? findRepoUrl(repo.trim().startsWith('http') ? repo.trim() : `https://${repo.trim()}`) : null;
  const topics = [...new Set([...me.interests, ...me.technologies, ...INTERESTS])];

  // Plusieurs fichiers d'un coup : chacun apparaît tout de suite dans l'aperçu, puis part vers Cloudinary l'un après l'autre.
  const attach = async (files: File[]) => {
    const room = MAX_MEDIA - media.length - pending.length;
    const kept = files.slice(0, Math.max(room, 0));
    const dropped = files.length - kept.length;
    setError(dropped > 0 ? `${MAX_MEDIA} photos ou vidéos au maximum : ${dropped === 1 ? 'la dernière n’a pas été ajoutée' : `les ${dropped} dernières n’ont pas été ajoutées`}.` : null);
    const queue = kept.map((file, i) => ({ file, key: `${Date.now()}-${i}`, preview: URL.createObjectURL(file), video: file.type.startsWith('video/') }));
    setPending((list) => [...list, ...queue.map(({ key, preview, video }) => ({ key, preview, video }))]);
    for (const item of queue) {
      try {
        const confirmed = await uploadPostToCloudinary(item.video ? 'video' : 'image', item.file);
        previews.current.set(confirmed.id, item.preview);
        setMedia((m) => [...m, confirmed]);
      } catch (err) {
        setError(errorMessage(err));
        URL.revokeObjectURL(item.preview);
      } finally {
        setPending((list) => list.filter((p) => p.key !== item.key));
      }
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
      <TopBar back title="Nouvelle publication" />
      <Tabs label="Type de publication" tabs={COMPOSE_TABS} value={type} onChange={setType} />
      <div className="section row" style={{ gap: 12 }}>
        <Avatar user={me} link={false} />
        <div className="grow">
          <p className="strong">{me.displayName}</p>
          <p className="xs muted row" style={{ gap: 4 }}>
            <Icon name="globe" size={14} /> Public{roleLine(me) ? ` · ${roleLine(me)}` : ''}
          </p>
        </div>
      </div>
      <section className="section stack">
        <label className="label" htmlFor="content">
          {type === 'QUESTION' ? 'Votre question' : type === 'PROJECT_LAUNCH' ? 'Présentez le projet' : 'Votre publication'}
        </label>
        <textarea
          ref={contentBox}
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
          <label className="btn btn-s" aria-disabled={media.length + pending.length >= MAX_MEDIA}>
            <Icon name="clip" size={18} /> Photos ou vidéo
            {media.length + pending.length > 0 && <span className="muted">{media.length + pending.length}/{MAX_MEDIA}</span>}
            <input
              type="file"
              multiple
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              disabled={media.length + pending.length >= MAX_MEDIA}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) void attach(files);
              }}
            />
          </label>
        </div>
        {media.length + pending.length > 0 && (
          // Même grille que dans le fil : ce qu'on voit ici, c'est ce qui sera publié.
          <div className={`mosaic mosaic-${Math.min(media.length + pending.length, MAX_MEDIA)}`}>
            {media.map((m, i) => (
              <div key={m.id} className="mosaic-tile">
                {m.resourceType === 'video' ? <video src={previews.current.get(m.id) ?? m.url} preload="metadata" muted playsInline /> : <img src={previews.current.get(m.id) ?? m.url} alt={`Pièce jointe ${i + 1}`} />}
                <button type="button" className="icon-btn mosaic-remove" aria-label={`Retirer la pièce jointe ${i + 1}`} onClick={() => setMedia((list) => list.filter((x) => x.id !== m.id))}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
            {pending.map((p) => (
              <div key={p.key} className="mosaic-tile is-pending" role="status" aria-label="Envoi en cours">
                {p.video ? <video src={p.preview} muted playsInline /> : <img src={p.preview} alt="" />}
                <span className="spinner" />
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
          <button type="button" className="btn btn-ghost" style={{ minHeight: 52 }} disabled={!!busy} onClick={() => submit(true)}>
            {busy === 'draft' ? <span className="spinner" /> : 'Enregistrer en brouillon'}
          </button>
          <button type="button" className="btn btn-primary btn-block grow" disabled={!!busy || uploading} onClick={() => submit(false)}>
            {busy === 'publish' ? <span className="spinner" aria-label="Publication en cours" /> : label}
          </button>
        </div>
      </div>
    </main>
  );
}
