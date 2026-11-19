import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedLogo } from '../../components/AnimatedLogo';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Credits } from '../legal/Legal';

// Ce que l'app apporte, en quatre points : rangé derrière le petit bouton (i), dans une fenêtre.
const FEATURES = [
  { icon: 'code', title: 'Un fil fait pour le code', text: 'Publie tes astuces, tes retours d’expérience et tes extraits de code, colorés et copiables en un geste.' },
  { icon: 'chat', title: 'De l’entraide entre développeurs', text: 'Pose une question technique : les réponses les plus utiles remontent en premier.' },
  { icon: 'branch', title: 'Des projets open source pour progresser', text: 'Trouve des projets ouverts aux débutants et des tâches concrètes pour contribuer.' },
  { icon: 'mail', title: 'Une messagerie pour ton équipe', text: 'Discute en direct, partage du code et des liens, et reçois une notification à chaque message.' },
];

// Accueil : le logo en haut, la promesse et les deux boutons en bas.
export function Welcome() {
  const [about, setAbout] = useState(false);
  return (
    <main className="screen welcome">
      <button type="button" className="icon-btn welcome-info" aria-label="Ce que propose Hello World" onClick={() => setAbout(true)}>
        <Icon name="info" size={20} />
      </button>
      {/* Le logo en haut ; le titre et les boutons en bas, sous le pouce. */}
      <div className="welcome-logo">
        <AnimatedLogo size={112} replay alt="Logo de Hello World" />
        <span className="mono">Hello World</span>
      </div>
      <section className="welcome-hero">
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
        <Credits className="center" />
      </section>
      {about && (
        <Sheet title="Ce que propose Hello World" onClose={() => setAbout(false)}>
          <div className="welcome-features">
            {FEATURES.map((feature) => (
              <article key={feature.title}>
                <span className="welcome-icon" aria-hidden="true">
                  <Icon name={feature.icon} size={20} />
                </span>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </article>
            ))}
            <p className="welcome-note">Installable sur iPhone et Android, sans publicité.</p>
          </div>
        </Sheet>
      )}
    </main>
  );
}
