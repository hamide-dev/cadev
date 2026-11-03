import { Outlet } from 'react-router-dom';
import { Brand } from '../../components/Brand';

// Écrans d'accueil, de connexion et d'inscription. Sur desktop, un panneau de
// marque occupe la moitié gauche et le formulaire reste à une largeur lisible.
export function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-hero" aria-hidden="true">
        <Brand />
        <pre className="auth-code">
          <span className="muted">{'// Hello World\n'}</span>
          {'partager(ceQueJeCode);\nposer(uneQuestionTechnique);\ntrouver(monEquipe);\nechanger({ enDirect: true });'}
          <span className="cursor">_</span>
        </pre>
        <p className="muted">Le réseau social des développeurs, en Afrique d’abord.</p>
      </aside>
      <div className="auth-main">
        <Outlet />
      </div>
    </div>
  );
}
