import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LogoMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useMe } from '../lib/session';
import { api } from '../lib/api';
import { emit, getSocket, type Conversation } from '../lib/socket';
import { showToast } from '../components/Toast';
import { conversationTitle } from '../features/messages/format';
import { ASK_PUSH_EVENT } from '../features/notifications/NotificationPrompt';

const NAV = [
  { to: '/feed', label: 'Fil', long: 'Fil d’actualité', icon: 'home' },
  { to: '/explore', label: 'Explorer', long: 'Explorer', icon: 'search' },
  { to: '/projects', label: 'Projets', long: 'Projets', icon: 'branch' },
  { to: '/notifications', label: 'Notifs', long: 'Notifications', icon: 'bell' },
  { to: '/messages', label: 'Messages', long: 'Messages', icon: 'mail' },
];

// Une seule navigation, trois formes selon la largeur (layout.css) :
// barre du bas sur mobile, rail d'icônes sur tablette, barre latérale complète sur desktop.
export function Nav() {
  const me = useMe();
  const { pathname } = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    let active = true;
    const updateMessageCount = () => {
      void emit<Conversation[]>('conversation:list').then((items) => {
        if (active) {
          setMessageCount(items.reduce((count, item) => count + item.unreadCount, 0));
        }
      }).catch(() => {
        if (active) setMessageCount(0);
      });
    };
    // Message reçu ailleurs que dans la conversation ouverte : bannière en haut de l'écran.
    const announce = ({ conversationId }: { conversationId?: string }) => {
      if (!conversationId || pathname === `/messages/${conversationId}`) return;
      void emit<Conversation[]>('conversation:list').then((items) => {
        const conversation = items.find((item) => item.id === conversationId);
        if (!active || !conversation) return;
        const other = conversation.members.find((member) => member.id !== me.id) ?? conversation.members[0];
        showToast({
          title: conversationTitle(conversation, me.id),
          body: conversation.type === 'GROUP' ? 'Nouveau message dans le groupe' : 't’a envoyé un message',
          to: `/messages/${conversationId}`,
          user: other ? { username: other.username, displayName: other.displayName, avatarUrl: other.avatarUrl ?? null } : undefined,
        });
        window.dispatchEvent(new Event(ASK_PUSH_EVENT));
      }).catch(() => {});
    };
    const socket = getSocket();
    socket.on('message:created', updateMessageCount);
    socket.on('message:unread', updateMessageCount);
    socket.on('message:unread', announce);
    socket.on('conversation:read', updateMessageCount);
    updateMessageCount();
    return () => {
      active = false;
      socket.off('message:created', updateMessageCount);
      socket.off('message:unread', updateMessageCount);
      socket.off('message:unread', announce);
      socket.off('conversation:read', updateMessageCount);
    };
  }, [pathname, me.id]);

  // Recompté à chaque changement d'écran, remis à zéro dès que l'écran Notifications les marque comme lues.
  useEffect(() => {
    let active = true;
    void api.notifications().then((items) => {
      if (active) {
        setNotificationCount(items.filter((item) => !item.readAt).length);
      }
    }).catch(() => {
      if (active) setNotificationCount(0);
    });
    const reset = () => setNotificationCount(0);
    window.addEventListener('hw:notifications-read', reset);
    return () => {
      active = false;
      window.removeEventListener('hw:notifications-read', reset);
    };
  }, [pathname]);

  return (
    <nav className="nav" aria-label="Navigation principale">
      <Link to="/feed" className="nav-brand" aria-label="Hello World, retour au fil">
        <LogoMark size={36} />
        <span className="nav-text mono">Hello World</span>
      </Link>
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className="nav-item">
          <Icon name={item.icon} />
          <span className="nav-short">{item.label}</span>
          <span className="nav-text">{item.long}</span>
          {item.to === '/notifications' && notificationCount > 0 && <span className="nav-badge" aria-label={`${notificationCount} notification${notificationCount > 1 ? 's' : ''} non lue${notificationCount > 1 ? 's' : ''}`}>{notificationCount > 99 ? '99+' : notificationCount}</span>}
          {item.to === '/messages' && messageCount > 0 && <span className="nav-badge" aria-label={`${messageCount} message${messageCount > 1 ? 's' : ''} non lu${messageCount > 1 ? 's' : ''}`}>{messageCount > 99 ? '99+' : messageCount}</span>}
        </NavLink>
      ))}
      {/* Un seul bouton Publier : caché quand on est déjà sur l'écran de publication. */}
      {pathname !== '/publish' && (
        <Link to="/publish" className="btn btn-primary nav-publish" aria-label="Publier">
          <Icon name="plus" size={22} />
          <span className="nav-text">Publier</span>
        </Link>
      )}
      <NavLink to={`/u/${me.username}`} className="nav-me" aria-label="Mon profil">
        <Avatar user={me} size="s" link={false} />
        <span className="nav-text grow">
          <span className="strong small">{me.displayName}</span>
          <span className="post-handle">@{me.username}</span>
        </span>
      </NavLink>
    </nav>
  );
}
