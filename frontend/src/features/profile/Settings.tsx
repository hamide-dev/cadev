import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { PushSettings } from '../notifications/PushSettings';
import { useMe, useSession } from '../../lib/session';
import { openInstallPrompt } from '../../lib/install';
import { Credits } from '../legal/Legal';

function Row({ title, sub, value, to }: { title: string; sub?: string; value?: string; to?: string }) {
  const content = (
    <>
      <div className="grow">
        <p className="small">{title}</p>
        {sub && <p className="xs muted">{sub}</p>}
      </div>
      <span className="xs muted">{value ?? (to ? '' : 'Bientôt')}</span>
      {to && <Icon name="chevron" size={20} />}
    </>
  );
  return to ? (
    <Link to={to} className="list-item">
      {content}
    </Link>
  ) : (
    <div className="list-item" aria-disabled="true" style={{ opacity: 0.6 }}>
      {content}
    </div>
  );
}

export function Settings() {
  const me = useMe();
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <main className="screen">
      <TopBar back title="Paramètres" />
      <div className="pad stack" style={{ paddingBottom: 32 }}>
        <section className="stack-s">
          <h2 className="section-title">Compte et sécurité</h2>
          <div className="group">
            <Row title="Identifiants et profil" sub={`${me.email ?? 'Compte Hello World'} · @${me.username}`} to="/profile/edit" />
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">Préférences du fil</h2>
          <div className="group">
            <Row title="Sujets suivis · Pour vous" sub={me.interests.join(' · ') || 'Aucun sujet choisi'} value={`${me.interests.length} sujet${me.interests.length > 1 ? 's' : ''}`} to="/profile/edit" />
            <Row title="Mes sauvegardes" sub="Publications, questions et projets gardés" to="/saved" />
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">Notifications</h2>
          <PushSettings />
        </section>
        <section className="stack-s">
          <h2 className="section-title">Application</h2>
          <div className="group">
            <button type="button" className="list-item" onClick={openInstallPrompt}>
              <div className="grow">
                <p className="small">Installer sur mon téléphone</p>
                <p className="xs muted">iPhone et Android, depuis l’écran d’accueil</p>
              </div>
              <Icon name="chevron" size={20} />
            </button>
          </div>
        </section>
        <section className="stack-s">
          <h2 className="section-title">À propos</h2>
          <div className="group">
            <Row title="Conditions d’utilisation" to="/conditions" />
            <Row title="Politique de confidentialité" to="/confidentialite" />
          </div>
        </section>
        <button
          type="button"
          className="btn btn-danger btn-block"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => {
            signOut();
            navigate('/login');
          }}
        >
          <Icon name="logout" size={20} /> Se déconnecter
        </button>
        <Credits className="center" />
      </div>
    </main>
  );
}
