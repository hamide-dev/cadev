import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { PostCard } from '../posts/PostCard';
import { RichText } from '../posts/RichText';
import { api, type Post } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useMe } from '../../lib/session';
import { useLoad } from '../../lib/useLoad';

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
    <main className="screen">
      <TopBar
        avatar
        title="Explorer"
        right={
          <Link to="/publish" className="btn btn-primary mobile-only">
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
