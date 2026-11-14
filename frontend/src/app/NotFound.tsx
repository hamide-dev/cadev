import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useSession } from '../lib/session';

// Page 404 à l'image du produit : un terminal qui répond comme à un `cd` raté,
// avec le vrai chemin demandé, puis une sortie claire vers le fil ou l'accueil.
export function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const home = user ? { to: '/feed', label: 'Retour au fil' } : { to: '/welcome', label: 'Revenir à l’accueil' };
  // history.state.idx vient de React Router : 0 = page ouverte directement, pas de retour possible.
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <main className="screen notfound">
      <Link to={home.to} className="brand notfound-brand" aria-label="Hello World, accueil">
        <Brand />
      </Link>

      <div className="notfound-body">
        <p className="notfound-code mono" aria-hidden="true">404</p>

        <div className="notfound-term mono" aria-hidden="true">
          <p>
            <span className="prompt">~/hello-world $</span> cd {pathname}
          </p>
          <p className="err">cd: {pathname}: aucun fichier ou dossier de ce type</p>
          <p>
            <span className="prompt">~/hello-world $</span> <span className="cursor">_</span>
          </p>
        </div>

        <h1>Cette page n’existe pas, ou plus.</h1>
        <p className="notfound-text">
          Le lien est peut-être mal copié, ou la page a été supprimée. Rien de cassé de ton côté, on te ramène en terrain connu.
        </p>

        <div className="notfound-actions">
          <Link to={home.to} className="btn btn-primary btn-block">
            {home.label}
          </Link>
          {canGoBack && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate(-1)}>
              Page précédente
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
