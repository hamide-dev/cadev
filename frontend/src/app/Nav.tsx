import { Link, NavLink } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LogoMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useMe } from '../lib/session';

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
