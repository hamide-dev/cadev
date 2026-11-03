import { Link } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { OAuthButtons } from './OAuthButtons';

export function SignupChoice() {
  return (
    <main className="screen">
      <div className="auth">
        <div className="stack center" style={{ paddingTop: 24, gap: 24 }}>
          <Brand />
          <div className="stack-s">
            <h1>Créez votre compte</h1>
            <p className="lead">Rejoignez le réseau social des développeurs pour partager vos projets, trouver une équipe et faire grandir votre carrière.</p>
          </div>
        </div>
        <div className="stack" style={{ paddingTop: 16 }}>
          <Link to="/signup/email" className="btn btn-primary btn-block">
            <Icon name="mail" size={20} /> Continuer avec e-mail
          </Link>
          <div className="divider">Ou</div>
          <OAuthButtons />
          <p className="center small muted">
            Déjà membre ?{' '}
            <Link to="/login" className="strong" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              Se connecter
            </Link>
          </p>
          <p className="center xs muted">En continuant, vous acceptez les Conditions et la Politique de confidentialité.</p>
        </div>
      </div>
    </main>
  );
}
