import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LogoMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useMe } from '../lib/session';
import { api } from '../lib/api';
import { emit, getSocket, type Conversation } from '../lib/socket';

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
  const [mentionCount, setMentionCount] = useState(0);
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
    const socket = getSocket();
    socket.on('message:created', updateMessageCount);
    socket.on('message:unread', updateMessageCount);
    socket.on('conversation:read', updateMessageCount);
    updateMessageCount();
    return () => {
      active = false;
      socket.off('message:created', updateMessageCount);
      socket.off('message:unread', updateMessageCount);
      socket.off('conversation:read', updateMessageCount);
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;
    void api.notifications().then((items) => {
      if (active) setMentionCount(items.filter((item) => !item.readAt && item.type === 'MENTION').length);
    }).catch(() => {
      if (active) setMentionCount(0);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <nav className="nav" aria-label="Navigation principale">
      <Link to="/feed" className="nav-brand" aria-label="Hello World, accueil">
        <LogoMark size={36} />
        <span className="nav-text mono">Hello World</span>
      </Link>
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className="nav-item">
          <Icon name={item.icon} />
          <span className="nav-short">{item.label}</span>
          <span className="nav-text">{item.long}</span>
          {item.to === '/notifications' && mentionCount > 0 && <span className="nav-badge" aria-label={`${mentionCount} mention${mentionCount > 1 ? 's' : ''} non lue${mentionCount > 1 ? 's' : ''}`}>{mentionCount > 99 ? '99+' : mentionCount}</span>}
          {item.to === '/messages' && messageCount > 0 && <span className="nav-badge" aria-label={`${messageCount} message${messageCount > 1 ? 's' : ''} non lu${messageCount > 1 ? 's' : ''}`}>{messageCount > 99 ? '99+' : messageCount}</span>}
        </NavLink>
      ))}
      <Link to="/publish" className="btn btn-primary nav-publish" aria-label="Publier">
        <Icon name="plus" size={20} />
        <span className="nav-text">Publier</span>
      </Link>
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
