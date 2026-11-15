import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { decodeVapidPublicKey, toPushSubscriptionInput } from '../../lib/push';

type PushState =
  | 'loading'
  | 'unavailable'
  | 'unsupported'
  | 'enabled'
  | 'disabled'
  | 'denied'
  | 'error';

// Notifications push, dans les Paramètres : sur la page Notifications, ce bloc changeait
// de hauteur en se chargeant et poussait les onglets et la liste.
export function PushSettings() {
  const [pushState, setPushState] = useState<PushState>('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const checkPushState = async () => {
      if (
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        if (active) setPushState('unsupported');
        return;
      }
      try {
        const config = await api.pushConfiguration();
        if (!config.configured || !config.publicKey) {
          if (active) setPushState('unavailable');
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription && Notification.permission === 'granted') {
          await api.savePushSubscription(toPushSubscriptionInput(subscription));
          if (active) setPushState('enabled');
        } else if (active) {
          setPushState(
            Notification.permission === 'denied' ? 'denied' : 'disabled',
          );
        }
      } catch (error) {
        if (active) {
          if (isPushUnavailable(error)) {
            setPushError(null);
            setPushState('unavailable');
          } else {
            setPushError(errorMessage(error));
            setPushState('error');
          }
        }
      }
    };
    void checkPushState();
    return () => {
      active = false;
    };
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('denied');
        return;
      }
      const config = await api.pushConfiguration();
      if (!config.configured || !config.publicKey) {
        setPushState('unavailable');
        return;
      }
      await navigator.serviceWorker.register('/service-worker.js');
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(config.publicKey),
        }));
      await api.savePushSubscription(toPushSubscriptionInput(subscription));
      setPushState('enabled');
    } catch (error) {
      if (isPushUnavailable(error)) {
        setPushError(null);
        setPushState('unavailable');
      } else {
        setPushError(errorMessage(error));
        setPushState('error');
      }
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api.removePushSubscription(subscription.endpoint);
        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) {
          throw new Error('Le navigateur n’a pas pu désactiver les notifications.');
        }
      }
      setPushState('disabled');
    } catch (error) {
      setPushError(
        isPushUnavailable(error)
          ? 'Les notifications ne peuvent pas être modifiées pour le moment.'
          : errorMessage(error),
      );
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="group stack-s" style={{ padding: 'var(--space-4)' }} aria-live="polite">
      <p className="small">Notifications hors de l’application</p>
      <p className="xs muted">
        Reçois les likes, commentaires, réponses, mentions et nouveaux messages
        sur cet appareil, même lorsque Hello World n’est pas ouvert. Le texte
        des messages privés n’est jamais affiché dans une notification.
      </p>
      {pushState === 'loading' && <p className="xs muted">Vérification de ce navigateur…</p>}
      {pushState === 'unavailable' && (
        <p className="xs muted">Les notifications hors de l’application ne sont pas disponibles pour le moment.</p>
      )}
      {pushState === 'unsupported' && (
        <p className="xs muted">
          Ce navigateur ne prend pas en charge les notifications push. Sur
          iPhone/iPad, ajoute d’abord le site à l’écran d’accueil (iOS 16.4+).
        </p>
      )}
      {pushState === 'enabled' && <p className="xs">Les notifications sont activées sur ce navigateur.</p>}
      {pushState === 'disabled' && <p className="xs muted">Les notifications ne sont pas activées sur ce navigateur.</p>}
      {pushState === 'denied' && (
        <p className="xs muted">Les notifications sont bloquées dans ce navigateur. Autorise-les dans les paramètres du site, puis réessaie.</p>
      )}
      {pushError && <p className="xs error" role="alert">{pushError}</p>}
      {(pushState === 'disabled' || pushState === 'enabled') && (
        <button
          type="button"
          className="btn"
          disabled={pushBusy}
          onClick={() => void (pushState === 'enabled' ? disablePush() : enablePush())}
        >
          {pushBusy
            ? 'Mise à jour…'
            : pushState === 'enabled'
              ? 'Désactiver sur cet appareil'
              : 'Activer les notifications'}
        </button>
      )}
    </div>
  );
}

function isPushUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.code === 'PUSH_NOT_CONFIGURED')
  );
}
