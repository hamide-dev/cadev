import { Link } from 'react-router-dom';
import { Brand } from '../../components/Brand';

export function Welcome() {
  return (
    <main className="screen">
      <div className="auth">
        <div className="center" style={{ paddingTop: 24 }}>
          <Brand />
        </div>
        <div className="spacer" />
        <div className="stack center" style={{ gap: 8 }}>
          <h1>
            Le réseau social
            <br />
            des bâtisseurs.
          </h1>
          <p className="lead">Partage ce que tu codes, trouve ton équipe et fais-toi repérer en Afrique.</p>
        </div>
        <div className="footer-cta" style={{ padding: '0 0 32px' }}>
          <Link to="/signup" className="btn btn-primary btn-block">
            Continuer
          </Link>
          <p className="center small muted" style={{ marginTop: 16 }}>
            Déjà membre ?{' '}
            <Link to="/login" className="link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
