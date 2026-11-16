import { Link } from 'react-router-dom';
import { AnimatedLogo } from '../../components/AnimatedLogo';
import { Icon } from '../../components/Icon';
import { Credits } from '../legal/Legal';

// Ce que l'app apporte, en quatre points : utile aux visiteurs comme aux moteurs de recherche.
const FEATURES = [
  { icon: 'code', title: 'Un fil fait pour le code', text: 'Publie tes astuces, tes retours d’expérience et tes extraits de code, colorés et copiables en un geste.' },
  { icon: 'chat', title: 'De l’entraide entre développeurs', text: 'Pose une question technique : les réponses les plus utiles remontent en premier.' },
  { icon: 'branch', title: 'Des projets open source pour progresser', text: 'Trouve des projets ouverts aux débutants et des tâches concrètes pour contribuer.' },
  { icon: 'mail', title: 'Une messagerie pour ton équipe', text: 'Discute en direct, partage du code et des liens, et reçois une notification à chaque message.' },
];

export function Welcome() {
  return (
    <main className="screen welcome">
      <section className="welcome-hero">
        <div className="welcome-logo">
          <AnimatedLogo size={112} replay alt="Logo de Hello World" />
          <span className="mono">Hello World</span>
        </div>
        <h1>
          Le réseau social
          <br />
          des bâtisseurs.
        </h1>
        <p className="lead">Partage ce que tu codes, trouve ton équipe et fais-toi repérer en Afrique.</p>
        <div className="welcome-cta">
          <Link to="/signup" className="btn btn-primary btn-block">
            Créer mon compte
          </Link>
          <p className="center small muted">
            Déjà membre ?{' '}
            <Link to="/login" className="link">
              Se connecter
            </Link>
          </p>
        </div>
      </section>
      <section className="welcome-features" aria-label="Ce que propose Hello World">
        {FEATURES.map((feature) => (
          <article key={feature.title}>
            <span className="welcome-icon" aria-hidden="true">
              <Icon name={feature.icon} size={20} />
            </span>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
        <p className="welcome-note">Gratuit, installable sur iPhone et Android, sans publicité.</p>
      </section>
      <Credits className="center" />
    </main>
  );
}
