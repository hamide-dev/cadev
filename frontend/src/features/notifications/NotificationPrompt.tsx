import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { api } from '../../lib/api';
import { shouldShowAfterSignup } from '../../lib/install';
import { pushSupported, subscribePush } from '../../lib/push';

// Demande d'activation des notifications, au bon moment :
// - à l'ouverture de l'app quand elle peut en recevoir (installée sur iPhone, ou Android / ordinateur),
// - ou quand un message arrive (événement « hw:push-ask »).
// Jamais pendant la fenêtre d'installation, et pas plus d'une fois par semaine si l'utilisateur dit « Plus tard ».
const ASKED_KEY = 'hw.push.asked';
const WEEK = 7 * 24 * 60 * 60 * 1000;
export const ASK_PUSH_EVENT = 'hw:push-ask';

function recentlyAsked() {
  try {
    return Date.now() - Number(localStorage.getItem(ASKED_KEY) ?? 0) < WEEK;
  } catch {
    return true;
  }
}
function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible : on redemandera simplement plus tard.
  }
}

export function NotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'denied' | 'unavailable' | null>(null);

  useEffect(() => {
    if (!pushSupported() || Notification.permission !== 'default') return;
    let alive = true;
    const ask = async () => {
      if (!alive || recentlyAsked() || shouldShowAfterSignup()) return;
      const config = await api.pushConfiguration().catch(() => null);
      if (alive && config?.configured && Notification.permission === 'default') setOpen(true);
    };
    const timer = setTimeout(() => void ask(), 3500);
    const onAsk = () => void ask();
    window.addEventListener(ASK_PUSH_EVENT, onAsk);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener(ASK_PUSH_EVENT, onAsk);
    };
  }, []);

  if (!open) return null;
  const close = () => {
    markAsked();
    setOpen(false);
  };
  const enable = async () => {
    setBusy(true);
    try {
      const outcome = await subscribePush();
      if (outcome === 'enabled') close();
      else setResult(outcome);
    } catch {
      setResult('unavailable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Ne rate aucun message" onClose={close}>
      <p className="small" style={{ color: 'var(--text-2)' }}>
        Sois prévenu quand quelqu’un t’écrit, répond à ta question, aime ta publication ou s’abonne à toi. Le contenu de tes messages privés n’apparaît jamais dans la notification.
      </p>
      <div className="notif-preview" aria-hidden="true">
        <img src="/icon-192.png" alt="" width={40} height={40} />
        <div className="grow">
          <p className="notif-preview-head">
            <strong>Awa Diop</strong>
            <span>maintenant</span>
          </p>
          <p>t’a envoyé un message</p>
        </div>
      </div>
      {result === 'denied' && (
        <p className="alert info">Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du téléphone ou du navigateur, puis reviens dans Paramètres.</p>
      )}
      {result === 'unavailable' && <p className="alert info">Les notifications ne peuvent pas être activées pour le moment. Réessaie plus tard depuis Paramètres.</p>}
      {!result && (
        <button type="button" className="btn btn-primary btn-block" onClick={enable} disabled={busy}>
          {busy ? <span className="spinner" aria-label="Activation" /> : <><Icon name="bell" size={18} /> Activer les notifications</>}
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-block" onClick={close}>
        {result ? 'Fermer' : 'Plus tard'}
      </button>
    </Sheet>
  );
}
