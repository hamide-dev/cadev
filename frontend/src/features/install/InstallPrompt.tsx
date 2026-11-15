import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { LogoMark } from '../../components/Brand';
import { Sheet } from '../../components/Sheet';
import { canPromptInstall, closeInstallPrompt, detectPlatform, isInstalled, onInstallOpen, promptInstall, shouldShowAfterSignup } from '../../lib/install';

// Fenêtre « Installer l'application » : ouverte une fois après l'inscription, et à la demande depuis Paramètres.
// Chaque plateforme a ses étapes exactes, avec les libellés tels qu'ils apparaissent à l'écran.
export function InstallPrompt() {
  const [open, setOpen] = useState(() => shouldShowAfterSignup());
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const platform = detectPlatform();

  useEffect(() => onInstallOpen(() => setOpen(true)), []);

  if (!open) return null;
  const close = () => {
    closeInstallPrompt();
    setOpen(false);
  };

  const install = async () => {
    setInstalling(true);
    const accepted = await promptInstall();
    setInstalling(false);
    if (accepted) close();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.origin);
      setCopied(true);
    } catch {
      // Copie refusée : l'adresse reste affichée à l'écran.
    }
  };

  const oneTap = canPromptInstall();

  return (
    <Sheet title="Installe Hello World" onClose={close}>
      <div className="install">
        <div className="install-head">
          <LogoMark size={56} />
          <p className="small" style={{ color: 'var(--text-2)' }}>
            {isInstalled()
              ? 'L’application est déjà installée sur cet appareil.'
              : 'Ouvre Hello World en un geste depuis ton écran d’accueil, en plein écran, comme une vraie app. Aucun store, ça prend 10 secondes.'}
          </p>
        </div>

        {!isInstalled() && (
          <>
            {platform === 'ios-safari' && (
              <ol className="install-steps">
                <li>
                  Touche le bouton <strong>Partager</strong> <span className="install-glyph"><Icon name="share" size={16} /></span> en bas de Safari.
                  <span className="hint"> Tu ne le vois pas ? Touche d’abord <strong>•••</strong> à côté de l’adresse.</span>
                </li>
                <li>
                  Fais défiler et touche <strong>Sur l’écran d’accueil</strong> <span className="install-glyph"><Icon name="plus" size={16} /></span>.
                </li>
                <li>
                  Laisse <strong>Ouvrir en tant qu’app web</strong> activé, puis touche <strong>Ajouter</strong> en haut à droite.
                </li>
                <li>Ferme Safari et ouvre Hello World depuis ton écran d’accueil.</li>
              </ol>
            )}

            {platform === 'ios-other' && (
              <div className="stack-s">
                <p className="small">Sur iPhone, l’installation se fait depuis <strong>Safari</strong>. Copie l’adresse, ouvre Safari, colle-la, puis touche Partager → <strong>Sur l’écran d’accueil</strong>.</p>
                <button type="button" className="btn btn-block" onClick={copyLink}>
                  <Icon name={copied ? 'check' : 'link'} size={18} /> {copied ? 'Adresse copiée' : location.host}
                </button>
              </div>
            )}

            {platform === 'android' &&
              (oneTap ? (
                <p className="small">Touche <strong>Installer</strong> ci-dessous, puis confirme. L’icône apparaît sur ton écran d’accueil.</p>
              ) : (
                <ol className="install-steps">
                  <li>
                    Touche le menu <strong>⋮</strong> en haut à droite de Chrome.
                  </li>
                  <li>
                    Touche <strong>Installer l’application</strong> (ou <strong>Ajouter à l’écran d’accueil</strong>).
                  </li>
                  <li>
                    Confirme avec <strong>Installer</strong>.
                  </li>
                </ol>
              ))}

            {platform === 'desktop' && (
              <div className="stack-s">
                <p className="small">
                  {oneTap
                    ? 'Installe-la sur cet ordinateur en un clic, et sur ton téléphone en ouvrant cette adresse :'
                    : 'Sur ton téléphone, ouvre cette adresse puis suis les étapes qui s’afficheront :'}
                </p>
                <p className="install-url mono">{location.host}</p>
              </div>
            )}

            {oneTap && (
              <button type="button" className="btn btn-primary btn-block" onClick={install} disabled={installing}>
                {installing ? <span className="spinner" aria-label="Installation" /> : 'Installer'}
              </button>
            )}
          </>
        )}

        <button type="button" className="btn btn-ghost btn-block" onClick={close}>
          {isInstalled() ? 'Fermer' : oneTap ? 'Plus tard' : 'C’est noté'}
        </button>
      </div>
    </Sheet>
  );
}
