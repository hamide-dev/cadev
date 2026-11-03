import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../lib/session';
import { Aside } from './Aside';
import { Nav } from './Nav';

// Écrans principaux : la barre du bas n'apparaît que sur eux, sur mobile.
const MAIN_SCREENS = /^\/(feed|explore|projects|notifications|messages)\/?$|^\/u\//;

// Coque des écrans réservés aux membres connectés.
// - mobile : une colonne, barre de navigation en bas sur les écrans principaux
// - tablette : rail d'icônes à gauche
// - desktop : barre latérale, colonne centrale et colonne de suggestions
export function Shell() {
  const { user } = useSession();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/welcome" replace />;

  const layout = pathname.startsWith('/messages') ? 'full' : pathname === '/projects' ? 'wide' : 'aside';
  return (
    <div className={`shell shell-${layout} ${MAIN_SCREENS.test(pathname) ? 'has-mobile-nav' : ''}`}>
      <Nav />
      <div className="shell-main">
        <Outlet />
      </div>
      {layout === 'aside' && <Aside />}
    </div>
  );
}
