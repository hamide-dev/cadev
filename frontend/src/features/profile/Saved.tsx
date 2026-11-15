import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty } from '../../components/states';
import { PostCard } from '../posts/PostCard';
import { useSaved } from '../../lib/saved';

const FILTERS = { all: null, posts: 'ARTICLE', questions: 'QUESTION', projects: 'PROJECT_LAUNCH' } as const;

export function Saved() {
  const [tab, setTab] = useState<keyof typeof FILTERS>('all');
  const saved = useSaved();
  const items = saved.filter((post) => !FILTERS[tab] || post.type === FILTERS[tab]);
  return (
    <main className="screen">
      <TopBar back title="Sauvegardes" sub={`${saved.length} élément${saved.length > 1 ? 's' : ''} gardé${saved.length > 1 ? 's' : ''}`} />
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
      {items.length ? (
        items.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <Empty icon="bookmark" title="Rien de sauvegardé ici" action={<Link to="/feed" className="btn btn-primary">Parcourir le fil</Link>}>
          Touche l’icône signet sous une publication pour la retrouver ici plus tard.
        </Empty>
      )}
    </main>
  );
}
