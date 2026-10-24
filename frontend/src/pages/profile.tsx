import { useCallback, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, uploadToCloudinary, type Level, type Specialty, type User } from '../api';
import { useMe, useSession } from '../auth';
import { emit, type Conversation } from '../socket';
import { Avatar, Empty, ErrorState, errorMessage, Icon, INTERESTS, LEVELS, Loading, PostFeed, roleLine, SPECIALTIES, Tabs, TopBar, useLoad } from '../ui';
import { ProjectCard } from './projects';

// Bannière décorative écrite à partir des vraies données du profil.
function Banner({ user }: { user: User }) {
  const role = user.specialty ? SPECIALTIES[user.specialty] : 'Développeur';
  const passion = user.interests[0] ?? user.technologies[0] ?? 'code';
  return (
    <div className="banner" aria-hidden="true">
      {`const profile = {\n  name: "${user.displayName}",\n  role: "${role}",\n  passion: "${passion}",\n}`}
    </div>
  );
}

export function Profile() {
  const me = useMe();
  const { username = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'posts' | 'projects' | 'contributions'>('posts');
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mine = username.toLowerCase() === me.username.toLowerCase();
  const profile = useLoad(() => (mine ? Promise.resolve(me) : api.user(username)), [username, mine, me]);
  const projects = useLoad(() => api.projects(), []);
  const loadPosts = useCallback((cursor?: string | null) => api.userPosts(username, cursor), [username]);

  if (profile.error) return <main className="screen"><TopBar back title="Profil" /><ErrorState message={profile.error} onRetry={profile.reload} /></main>;
  if (!profile.data) return <main className="screen"><TopBar back title="Profil" /><Loading /></main>;
  const user = profile.data;
  const owned = (projects.data ?? []).filter((p) => p.ownerId === user.id);
  const topics = user.technologies.length ? user.technologies : user.interests;

  const share = async () => {
    const url = `${location.origin}/u/${user.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `${user.displayName} sur Hello World`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Lien du profil copié.');
      }
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  };

  const toggleFollow = async () => {
    setBusy(true);
    try {
      await (following ? api.unfollow(user.username) : api.follow(user.username));
      setFollowing(!following);
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    setBusy(true);
    try {
      const conversation = await emit<Conversation>('conversation:create', { type: 'DIRECT', memberIds: [user.id] });
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      setNotice(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="screen with-nav">
      <div style={{ position: 'relative' }}>
        <Banner user={user} />
        <button type="button" className="icon-btn" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,.45)' }} aria-label="Retour" onClick={() => navigate(-1)}>
          <Icon name="x" />
        </button>
        {mine && (
          <Link to="/settings" className="icon-btn" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,.45)' }} aria-label="Paramètres">
            <Icon name="gear" />
          </Link>
        )}
      </div>
      <div className="pad stack" style={{ marginTop: -48, position: 'relative' }}>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <Avatar user={user} size="xl" link={false} />
          <div className="row">
            <button type="button" className="icon-btn bordered" aria-label="Partager le profil" onClick={share}>
              <Icon name="share" size={20} />
            </button>
            {mine ? (
              <Link to="/profile/edit" className="btn btn-primary" style={{ borderRadius: 999 }}>
                <Icon name="edit" size={18} /> Modifier le profil
              </Link>
            ) : (
              <>
                <button type="button" className="btn" style={{ borderRadius: 999 }} onClick={message} disabled={busy}>
                  Message
                </button>
                <button type="button" className={`btn ${following ? '' : 'btn-primary'}`} style={{ borderRadius: 999 }} aria-pressed={following} onClick={toggleFollow} disabled={busy}>
                  {following ? 'Abonné' : 'Suivre'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="stack-s">
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{user.displayName}</h1>
          <p className="post-handle" style={{ fontSize: 14 }}>@{user.username}</p>
          {roleLine(user) && <p className="small muted">{roleLine(user)}</p>}
          {user.bio && <p>{user.bio}</p>}
          {user.githubUrl && (
            <a href={user.githubUrl} target="_blank" rel="noreferrer" className="row link-accent small" style={{ color: '#7cc4ff' }}>
              <Icon name="link" size={18} /> {user.githubUrl.replace(/^https:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
        {notice && <p className="alert info" role="status">{notice}</p>}
        {topics.length > 0 && (
          <div className="tags">
            {topics.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
        {mine && (
          <Link to="/saved" className="btn btn-block">
            <Icon name="bookmark" size={20} /> Sauvegardes
          </Link>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <Tabs
          label="Contenus du profil"
          value={tab}
          onChange={setTab}
          tabs={[
            ['posts', 'Publications'],
            ['projects', 'Projets'],
            ['contributions', 'Contributions'],
          ]}
        />
      </div>
      {tab === 'posts' && (
        <PostFeed
          load={loadPosts}
          empty={
            <Empty icon="edit" title={mine ? 'Tu n’as encore rien publié' : 'Aucune publication pour l’instant'} action={mine && <Link to="/publish" className="btn btn-primary">Publier</Link>}>
              {mine ? 'Présente un projet, pose une question ou partage une astuce.' : `${user.displayName} n’a encore rien publié.`}
            </Empty>
          }
        />
      )}
      {tab === 'projects' &&
        (projects.loading ? (
          <Loading />
        ) : owned.length ? (
          <div className="stack pad" style={{ paddingTop: 16 }}>
            {owned.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <Empty icon="branch" title="Aucun projet" action={mine && <Link to="/projects?tab=mine" className="btn">Ajouter un projet</Link>}>
            {mine ? 'Ajoute un projet pour trouver des contributeurs.' : `${user.displayName} n’a pas encore créé de projet.`}
          </Empty>
        ))}
      {tab === 'contributions' && (
        <Empty icon="fork" title="Contributions bientôt visibles">
          Le serveur ne liste pas encore les contributions d’un développeur.
        </Empty>
      )}
    </main>
  );
}

export function EditProfile() {
  const me = useMe();
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: me.displayName,
    username: me.username,
    bio: me.bio ?? '',
    github: me.githubUrl?.replace(/^https:\/\//, '') ?? '',
    specialty: me.specialty,
    experienceLevel: me.experienceLevel,
    interests: me.interests,
    technologies: me.technologies.join(', '),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const sig = await api.profileSignature();
      await uploadToCloudinary(sig, file, 'profile');
      const { avatarUrl } = await api.confirmProfile(sig.publicId);
      setUser({ ...me, avatarUrl });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const githubUrl = form.github.trim() ? `https://${form.github.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : null;
    if (!form.displayName.trim()) return setError('Le nom ne peut pas être vide.');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) return setError('Pseudo : de 3 à 20 caractères, lettres, chiffres et tiret bas.');
    if (githubUrl && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/?$/.test(githubUrl)) return setError('Lien GitHub : format attendu github.com/ton-pseudo.');
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateMe({
        displayName: form.displayName.trim(),
        username: form.username,
        bio: form.bio.trim(),
        githubUrl,
        specialty: form.specialty,
        experienceLevel: form.experienceLevel,
        interests: form.interests,
        technologies: [...new Set(form.technologies.split(',').map((t) => t.trim()).filter(Boolean))],
      });
      setUser(updated);
      navigate(`/u/${updated.username}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <form onSubmit={save} className="stack" noValidate style={{ flex: 1 }}>
        <TopBar back title="Modifier le profil" sub="Retour au profil" right={<button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>} />
        <div className="pad stack">
          <div className="row" style={{ gap: 16 }}>
            <Avatar user={me} size="xl" link={false} />
            <label className="icon-btn bordered" style={{ borderRadius: 10, cursor: 'pointer' }} aria-label="Changer la photo de profil">
              {uploading ? <span className="spinner" /> : <Icon name="camera" size={20} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadAvatar(f); }} />
            </label>
          </div>
          <div className="field">
            <label htmlFor="ep-name">Nom</label>
            <input id="ep-name" className="input" maxLength={80} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ep-username">Pseudo</label>
            <input id="ep-username" className="input mono" maxLength={20} value={form.username} onChange={(e) => set('username', e.target.value.replace(/^@/, ''))} />
          </div>
          <div className="field">
            <label htmlFor="ep-bio">Bio</label>
            <textarea id="ep-bio" className="textarea" maxLength={500} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ep-github">Profil GitHub</label>
            <input id="ep-github" className="input" inputMode="url" placeholder="github.com/ton-pseudo" value={form.github} onChange={(e) => set('github', e.target.value)} />
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>Spécialité</legend>
            <div className="choices">
              {(Object.keys(SPECIALTIES) as Specialty[]).map((key) => (
                <button key={key} type="button" className="choice" aria-pressed={form.specialty === key} onClick={() => set('specialty', key)}>
                  {SPECIALTIES[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>Niveau</legend>
            <div className="choices two">
              {(Object.keys(LEVELS) as Level[]).map((key) => (
                <button key={key} type="button" className="choice" aria-pressed={form.experienceLevel === key} onClick={() => set('experienceLevel', key)}>
                  {LEVELS[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>Centres d’intérêt</legend>
            <div className="choices two">
              {[...new Set([...INTERESTS, ...form.interests])].map((topic) => {
                const on = form.interests.includes(topic);
                return (
                  <button key={topic} type="button" className="choice" aria-pressed={on} onClick={() => set('interests', on ? form.interests.filter((t) => t !== topic) : [...form.interests, topic])}>
                    {topic}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="ep-tech">Technologies maîtrisées</label>
            <input id="ep-tech" className="input" placeholder="React, TypeScript, PostgreSQL" value={form.technologies} onChange={(e) => set('technologies', e.target.value)} />
            <p className="hint">Sépare-les par des virgules.</p>
          </div>
        </div>
        <div className="spacer" />
        <div className="footer-cta stack-s">
          {error && <p className="alert" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-label="Enregistrement" /> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  );
}

function Row({ title, sub, value, to }: { title: string; sub?: string; value?: string; to?: string }) {
  const content = (
    <>
      <div className="grow">
        <p className="small">{title}</p>
        {sub && <p className="xs muted">{sub}</p>}
      </div>
      <span className="xs muted">{value ?? (to ? '' : 'Bientôt')}</span>
      {to && <Icon name="chevron" size={20} />}
    </>
  );
  return to ? (
    <Link to={to} className="list-item">
      {content}
    </Link>
  ) : (
    <div className="list-item" aria-disabled="true" style={{ opacity: 0.6 }}>
      {content}
    </div>
  );
}

export function Settings() {
  const me = useMe();
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <main className="screen">
      <TopBar back title="Paramètres" sub="Retour au profil" />
      <div className="pad stack" style={{ paddingBottom: 32 }}>
        <section className="stack-s">
          <h2 className="section-title">Compte et sécurité</h2>
          <div className="group">
            <Row title="Identifiants et profil" sub={`${me.email ?? 'Compte Hello World'} · @${me.username}`} to="/profile/edit" />
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">Préférences du fil</h2>
          <div className="group">
            <Row title="Sujets suivis · Pour vous" sub={me.interests.join(' · ') || 'Aucun sujet choisi'} value={`${me.interests.length} sujet${me.interests.length > 1 ? 's' : ''}`} to="/profile/edit" />
            <Row title="Ordre du fil · Abonnements" sub="Les publications les plus récentes d’abord." value="Chronologique" />
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">Notifications</h2>
          <div className="group">
            <Row title="Réponses et mentions" />
            <Row title="Activité des projets suivis" />
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">Confidentialité et modération</h2>
          <div className="group">
            <Row title="Invitations de messages" />
            <Row title="Personnes masquées / bloquées" />
            <Row title="Signalements et règles de la communauté" />
          </div>
        </section>
        <button
          type="button"
          className="btn btn-danger btn-block"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => {
            signOut();
            navigate('/login');
          }}
        >
          <Icon name="logout" size={20} /> Se déconnecter
        </button>
        <p className="center xs muted">Les réglages marqués « Bientôt » ne sont pas encore pris en charge par le serveur.</p>
      </div>
    </main>
  );
}
