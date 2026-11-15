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
import { openLightbox } from '../../components/Lightbox';
import { Linkify } from '../posts/RichText';

// Image choisie par l'utilisateur, sinon bannière décorative écrite à partir des vraies données du profil.
export function Banner({ user }: { user: User }) {
  if (user.bannerUrl)
    return <img className="banner banner-img zoomable" src={user.bannerUrl} alt={`Bannière de ${user.displayName}`} onClick={() => openLightbox({ src: user.bannerUrl!, alt: `Bannière de ${user.displayName}` })} />;
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
  // null = on suit ce que dit le serveur ; sinon, le dernier choix fait sur cet écran.
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [friendOverride, setFriend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mine = username.toLowerCase() === me.username.toLowerCase();
  // Toujours la fiche serveur, même pour soi : elle porte les compteurs d'abonnés et l'état « suivi ».
  const profile = useLoad(() => api.user(username), [username, me]);
  const projects = useLoad(() => api.projects(), []);
  const loadPosts = useCallback((cursor?: string | null) => api.userPosts(username, cursor), [username]);

  if (profile.error) return <main className="screen"><TopBar back title="Profil" /><ErrorState message={profile.error} onRetry={profile.reload} /></main>;
  if (!profile.data) return <main className="screen"><TopBar back title="Profil" /><Loading /></main>;
  const user = mine ? { ...profile.data, ...me } : profile.data;
  const serverFollowing = !!profile.data.isFollowing;
  const following = followOverride ?? serverFollowing;
  const friend = friendOverride || (following && !!profile.data.followsYou);
  const followers = (profile.data.followerCount ?? 0) + (following === serverFollowing ? 0 : following ? 1 : -1);
  const setFollowing = setFollowOverride;
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
      if (following) setFriend(false);
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
        <div className="profile-bar">
          {!mine && (
            <button type="button" className="icon-btn glass" aria-label="Retour" onClick={() => navigate(-1)}>
              <Icon name="back" />
            </button>
          )}
          <span className="grow" />
          <button type="button" className="icon-btn glass" aria-label="Partager le profil" onClick={share}>
            <Icon name="share" size={20} />
          </button>
          {mine && (
            <Link to="/settings" className="icon-btn glass" aria-label="Paramètres">
              <Icon name="gear" />
            </Link>
          )}
        </div>
      </div>
      <div className="pad stack" style={{ marginTop: -48, position: 'relative' }}>
        <div className="row-between wrap" style={{ alignItems: 'flex-end' }}>
          {user.avatarUrl ? (
            <button type="button" className="avatar-zoom" aria-label={`Voir la photo de ${user.displayName}`} onClick={() => openLightbox({ src: user.avatarUrl!, alt: user.displayName })}>
              <Avatar user={user} size="xl" link={false} />
            </button>
          ) : (
            <Avatar user={user} size="xl" link={false} />
          )}
          <div className="row">
            {mine ? (
              <>
                <Link to="/saved" className="icon-btn bordered" aria-label="Mes sauvegardes">
                  <Icon name="bookmark" size={20} />
                </Link>
                <Link to="/profile/edit" className="btn btn-primary pill">
                  <Icon name="edit" size={18} /> Modifier le profil
                </Link>
              </>
            ) : (
              <>
                <button type="button" className="btn pill" onClick={message} disabled={busy}>
                  <Icon name="mail" size={18} /> Message
                </button>
                <button type="button" className={`btn pill ${following ? '' : 'btn-primary'}`} aria-pressed={following} onClick={toggleFollow} disabled={busy}>
                  {friend ? 'Ami' : following ? 'Abonné' : 'Suivre'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="stack-s">
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{user.displayName}</h1>
          <p className="post-handle" style={{ fontSize: 14 }}>
            @{user.username}
            {!mine && profile.data.followsYou && <span className="follows-you">Vous suit</span>}
          </p>
          {roleLine(user) && <p className="small muted">{roleLine(user)}</p>}
          {user.bio && <p className="post-text"><Linkify text={user.bio} /></p>}
          {user.githubUrl && (
            <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="row link-accent small">
              <Icon name="link" size={18} /> {user.githubUrl.replace(/^https:\/\/(www\.)?/, '')}
            </a>
          )}
          <p className="profile-counts">
            <span><strong>{followers}</strong> abonné{followers > 1 ? 's' : ''}</span>
            <span><strong>{profile.data.followingCount ?? 0}</strong> abonnement{(profile.data.followingCount ?? 0) > 1 ? 's' : ''}</span>
          </p>
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
      </div>
      <div style={{ marginTop: 16 }}>
        <Tabs
          label="Contenus du profil"
          value={tab}
          onChange={setTab}
          tabs={[
            ['posts', 'Publications'],
            ['projects', 'Projets'],
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
    </main>
  );
}
