import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';

export function Notifications() {
  const notifications = useLoad(() => api.notifications(), []);
  const [tab, setTab] = useState<'all' | 'mentions' | 'projects'>('all');
  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;

  // Ouvrir l'écran vaut lecture : les pastilles restent visibles le temps de la visite, le compteur du menu tombe à zéro.
  useEffect(() => {
    if (!unread) return;
    api.markNotificationsRead().then(() => window.dispatchEvent(new Event('hw:notifications-read'))).catch(() => {});
  }, [unread]);

  const items = notifications.data?.filter((item) => tab === 'all' || (tab === 'mentions') === (item.type === 'MENTION')) ?? [];
  return (
    <main className="screen">
      <TopBar avatar title="Notifications" sub={unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : undefined} right={<Link to="/settings" className="icon-btn" aria-label="Paramètres"><Icon name="gear" /></Link>} />
      <Tabs
        label="Filtrer les notifications"
        value={tab}
        onChange={setTab}
        tabs={[
          ['all', 'Tout'],
          ['mentions', 'Mentions'],
          ['projects', 'Interactions'],
        ]}
      />
      {notifications.error ? (
        <ErrorState message={notifications.error} onRetry={notifications.reload} />
      ) : notifications.loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon="bell" title="Aucune notification" action={<Link to="/feed" className="btn">Retour au fil</Link>}>
          {tab === 'projects' ? 'Les likes, commentaires et réponses apparaîtront ici.' : 'Les mentions apparaîtront ici.'}
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
