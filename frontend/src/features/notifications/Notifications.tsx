import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { api, ApiError } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';

export function Notifications() {
  // Tant que le back n'expose pas GET /notifications (404), on le dit au lieu d'afficher une erreur.
  const notifications = useLoad(
    () => api.notifications().catch((err) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err))),
    [],
  );
  const [tab, setTab] = useState<'all' | 'mentions' | 'projects'>('all');
  const items = notifications.data?.filter((item) => tab === 'all' || (tab === 'mentions') === (item.type === 'MENTION')) ?? [];
  return (
    <main className="screen">
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
      {notifications.error ? (
        <ErrorState message={notifications.error} onRetry={notifications.reload} />
      ) : notifications.loading ? (
        <Loading />
      ) : notifications.data === null ? (
        <Empty icon="bell" title="Les notifications arrivent bientôt">
          Le serveur ne fournit pas encore cette fonctionnalité. Cet écran se remplira dès qu’elle sera disponible.
        </Empty>
      ) : items.length === 0 ? (
        <Empty icon="bell" title="Aucune notification" action={<Link to="/feed" className="btn">Retour au fil</Link>}>
          {tab === 'projects' ? 'L’activité de tes projets apparaîtra ici.' : 'Quand quelqu’un te mentionne, tu le verras ici.'}
        </Empty>
      ) : (
        <div className="list">
          {items.map((item) => (
            <Link key={item.id} to={item.postId ? `/post/${item.postId}` : `/u/${item.actor.username}`} className="list-item" style={{ alignItems: 'flex-start' }}>
              <Avatar user={item.actor} link={false} />
              <div className="grow">
                <p className="small">{item.message}</p>
                <p className="xs muted">
                  <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                </p>
              </div>
              {!item.readAt && <span className="unread-dot" aria-label="Non lue" />}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
