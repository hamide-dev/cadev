import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { PostFeed } from '../posts/PostFeed';
import { ProjectCard } from '../projects/ProjectCard';
import { api, type User } from '../../lib/api';
import { errorMessage, roleLine, SPECIALTIES } from '../../lib/format';
import { useMe } from '../../lib/session';
import { type Conversation, emit } from '../../lib/socket';
import { useLoad } from '../../lib/useLoad';

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
  const [friend, setFriend] = useState(false);
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
      const result = following
        ? await api.unfollow(user.username)
        : await api.follow(user.username);
      setFollowing(!following);
      if (!following && result.friend) {
        setFriend(true);
        setNotice('Vous êtes maintenant amis. Une conversation a été ajoutée à vos messages.');
      }
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
    <main className="screen">
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
                  {friend ? 'Message' : 'Message'}
                </button>
                <button type="button" className={`btn ${following ? '' : 'btn-primary'}`} style={{ borderRadius: 999 }} aria-pressed={following} onClick={toggleFollow} disabled={busy}>
                  {friend ? 'Ami' : following ? 'Abonné' : 'Suivre'}
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
