// Installation de l'app sur le téléphone.
// - Android / Chrome : le navigateur propose sa propre fenêtre d'installation (beforeinstallprompt).
//   Elle n'est envoyée qu'une fois au chargement : on la garde pour le bouton « Installer ».
// - iPhone : pas d'installation automatique, on guide l'utilisateur pas à pas vers « Sur l'écran d'accueil ».

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PENDING = 'hw.install.pending';
const DONE = 'hw.install.done';
const OPEN_EVENT = 'hw:install-open';
let deferred: InstallPromptEvent | null = null;

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : la fenêtre se reposera simplement plus tard.
  }
}
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    store(DONE, '1');
  });
}

export type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // L'iPad se présente comme un Mac : on le reconnaît à l'écran tactile.
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|GSA|FBAN|FBAV|Instagram/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function canPromptInstall() {
  return deferred !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') store(DONE, '1');
  return outcome === 'accepted';
}

/** À appeler à la fin de l'inscription : la fenêtre s'ouvre à l'arrivée sur le fil. */
export function markInstallPending() {
  store(PENDING, '1');
}

export function shouldShowAfterSignup() {
  return read(PENDING) === '1' && read(DONE) !== '1' && !isInstalled();
}

export function closeInstallPrompt() {
  store(PENDING, null);
}

/** Ouvre la fenêtre depuis n'importe quel écran (ex. Paramètres). */
export function openInstallPrompt() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onInstallOpen(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}
