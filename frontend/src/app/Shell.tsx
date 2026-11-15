import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../lib/session';
import { Aside } from './Aside';
import { Nav } from './Nav';
import { InstallPrompt } from '../features/install/InstallPrompt';
import { LightboxHost } from '../components/Lightbox';

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

  // La colonne de suggestions n'apparaît que là où elle aide à découvrir : pas pendant qu'on écrit ou règle son compte.
  const focus = /^\/(publish|settings|profile\/edit|signup\/oauth)/.test(pathname);
  const layout = pathname.startsWith('/messages') ? 'full' : pathname === '/projects' ? 'wide' : focus ? 'focus' : 'aside';
  return (
    <div className={`shell shell-${layout} ${MAIN_SCREENS.test(pathname) ? 'has-mobile-nav' : ''}`}>
      <Nav />
      {/* Clé par écran : chaque changement d'écran rejoue l'animation d'entrée. La messagerie garde sa liste en place. */}
      <div key={pathname.startsWith('/messages') ? '/messages' : pathname} className="shell-main screen-enter">
        <Outlet />
      </div>
      {layout === 'aside' && <Aside />}
      <InstallPrompt />
      <LightboxHost />
    </div>
  );
}
