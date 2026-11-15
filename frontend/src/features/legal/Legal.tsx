import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../../components/TopBar';

// Éditeur et contact affichés dans les pages légales et en pied de page.
export const PUBLISHER = 'Viso Studio';
export const CONTACT_EMAIL = 'contact@hello-world.ci';
const UPDATED = '16 novembre 2026';

export function Credits({ className = '' }: { className?: string }) {
  return (
    <p className={`credits ${className}`}>
      Hello World · by <strong>{PUBLISHER}</strong>
      <span aria-hidden="true"> · </span>
      <Link to="/conditions">Conditions</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/confidentialite">Confidentialité</Link>
    </p>
  );
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="screen legal">
      <TopBar back title={title} sub={`Mise à jour le ${UPDATED}`} />
      <article className="legal-body">{children}</article>
      <Credits />
    </main>
  );
}

export function Terms() {
  return (
    <LegalPage title="Conditions d’utilisation">
      <p>
        Hello World est un réseau social pour les personnes qui développent ou apprennent à développer, édité par <strong>{PUBLISHER}</strong> (Côte d’Ivoire). En créant un compte ou en utilisant l’application, tu acceptes ces conditions.
      </p>

      <h2>1. Ton compte</h2>
      <ul>
        <li>Tu dois avoir au moins 13 ans. Entre 13 et 18 ans, l’accord d’un parent ou tuteur est nécessaire.</li>
        <li>Les informations que tu donnes à l’inscription doivent être exactes. Un seul compte par personne.</li>
        <li>Tu es responsable de ton mot de passe et de ce qui est fait depuis ton compte. Préviens-nous sans attendre en cas d’accès suspect.</li>
      </ul>

      <h2>2. Ce que tu publies</h2>
      <ul>
        <li>Tu restes propriétaire de tes publications, questions, projets, commentaires et messages.</li>
        <li>Tu nous autorises à les héberger, les afficher et les diffuser dans Hello World, uniquement pour faire fonctionner le service.</li>
        <li>Le code que tu partages reste soumis à la licence que tu choisis. Sans licence indiquée, les autres membres peuvent le lire, pas le réutiliser comme le leur.</li>
        <li>Tu peux supprimer tes contenus à tout moment.</li>
      </ul>

      <h2>3. Règles de la communauté</h2>
      <ul>
        <li>Respect : pas de harcèlement, d’insultes, de discrimination ni de menaces.</li>
        <li>Pas de spam, d’arnaque, de logiciel malveillant ni de liens piégés.</li>
        <li>Pas de contenu illégal, ni de données personnelles d’autrui publiées sans accord.</li>
        <li>Pas de code ou de contenu copié sans en avoir le droit.</li>
        <li>Partage de failles : décris-les de façon responsable, sans exploit prêt à l’emploi visant des systèmes réels.</li>
      </ul>
      <p>Nous pouvons retirer un contenu ou suspendre un compte qui ne respecte pas ces règles. Quand c’est possible, nous expliquons pourquoi.</p>

      <h2>4. Le service</h2>
      <ul>
        <li>Hello World est gratuit. Nous l’améliorons en continu et certaines fonctions peuvent évoluer ou disparaître.</li>
        <li>Nous faisons de notre mieux pour qu’il reste disponible et sûr, sans pouvoir garantir l’absence totale d’interruption.</li>
        <li>Les conseils techniques échangés entre membres n’engagent que leurs auteurs. Vérifie le code avant de l’utiliser en production.</li>
      </ul>

      <h2>5. Fermer ton compte</h2>
      <p>Tu peux nous demander la suppression de ton compte à tout moment. Tes données sont alors supprimées, sauf ce que la loi nous oblige à conserver.</p>

      <h2>6. Droit applicable et contact</h2>
      <p>
        Ces conditions relèvent du droit ivoirien. Pour toute question : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Si elles changent de façon importante, nous te prévenons dans l’application.
      </p>
      <p className="muted small">Voir aussi la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Confidentialité">
      <p>
        Cette page explique quelles données Hello World utilise, pourquoi, et comment tu gardes la main dessus. Responsable du traitement : <strong>{PUBLISHER}</strong>. Nous appliquons la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel et, pour les membres situés dans l’Union européenne, le RGPD.
      </p>

      <h2>Ce que nous collectons</h2>
      <ul>
        <li><strong>Compte</strong> : nom affiché, pseudo, adresse e-mail, mot de passe (stocké chiffré, jamais lisible), ou l’identifiant Google / GitHub si tu te connectes ainsi.</li>
        <li><strong>Profil</strong> : spécialité, niveau, bio, lien GitHub, centres d’intérêt, photo et bannière si tu en ajoutes.</li>
        <li><strong>Contenus</strong> : publications, questions, commentaires, projets, tâches, messages, images envoyées.</li>
        <li><strong>Activité</strong> : abonnements, j’aime, sauvegardes, notifications.</li>
        <li><strong>Technique</strong> : cookies de session pour rester connecté, et l’abonnement aux notifications si tu les actives.</li>
      </ul>
      <p>Ton adresse e-mail n’est jamais affichée sur ton profil.</p>

      <h2>Pourquoi</h2>
      <ul>
        <li>Faire fonctionner ton compte, ton fil, la messagerie et les notifications.</li>
        <li>T’envoyer les codes de vérification et de connexion par e-mail.</li>
        <li>Te proposer des contenus et des développeurs selon tes centres d’intérêt.</li>
        <li>Protéger la communauté (sécurité, lutte contre le spam et les abus).</li>
      </ul>
      <p>Pas de publicité ciblée, et nous ne vendons pas tes données.</p>

      <h2>Qui les traite pour nous</h2>
      <ul>
        <li>Hébergement de l’application et de la base de données.</li>
        <li>Stockage des images et vidéos (Cloudinary).</li>
        <li>Envoi des e-mails (Brevo).</li>
        <li>Connexion avec Google ou GitHub, si tu la choisis.</li>
      </ul>
      <p>Ces prestataires n’utilisent tes données que pour nous rendre ce service.</p>

      <h2>Combien de temps</h2>
      <p>Tant que ton compte existe. À sa suppression, tes données sont effacées dans un délai raisonnable, hors obligations légales. Les codes e-mail expirent en quelques minutes.</p>

      <h2>Tes droits</h2>
      <p>
        Tu peux consulter, corriger, exporter ou supprimer tes données, et t’opposer à certains traitements. Écris-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Tu peux aussi saisir l’ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d’Ivoire).
      </p>

      <h2>Sécurité</h2>
      <p>Connexions chiffrées (HTTPS), mots de passe hachés, sessions limitées dans le temps, accès restreints. Aucun système n’est infaillible : préviens-nous si tu remarques quelque chose d’anormal.</p>
      <p className="muted small">Voir aussi les <Link to="/conditions">conditions d’utilisation</Link>.</p>
    </LegalPage>
  );
}
