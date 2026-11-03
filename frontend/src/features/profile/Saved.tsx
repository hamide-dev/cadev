import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty } from '../../components/states';

const SOON = 'Le serveur ne fournit pas encore cette fonctionnalité. Cet écran se remplira dès qu’elle sera disponible.';

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
