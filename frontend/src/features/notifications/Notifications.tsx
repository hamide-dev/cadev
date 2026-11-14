import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Tabs } from '../../components/Tabs';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { api, ApiError } from '../../lib/api';
import { errorMessage, timeAgo } from '../../lib/format';
import type { PushSubscriptionInput } from '../../lib/api/types';
import { useLoad } from '../../lib/useLoad';

type PushState =
  | 'loading'
  | 'unavailable'
  | 'unsupported'
  | 'enabled'
  | 'disabled'
  | 'denied'
  | 'error';

export function Notifications() {
  const notifications = useLoad(() => api.notifications(), []);
  const [tab, setTab] = useState<'all' | 'mentions' | 'projects'>('all');
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

  const items = notifications.data?.filter((item) => tab === 'all' || (tab === 'mentions') === (item.type === 'MENTION')) ?? [];
  return (
    <main className="screen">
      <TopBar avatar title="Notifications" right={<Link to="/settings" className="icon-btn" aria-label="Paramètres"><Icon name="gear" /></Link>} />
      <section className="pad stack-s" aria-live="polite">
        <h2 className="section-title">Notifications hors de l’application</h2>
        <p className="small muted">
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
          <p className="xs muted">Les notifications sont bloquées dans Chrome. Autorise-les dans les paramètres du site, puis réessaie.</p>
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
      </section>
      <Tabs
        label="Filtrer les notifications"
        value={tab}
        onChange={setTab}
        tabs={[
          ['all', 'Tout'],
          ['mentions', 'Mentions'],
          ['projects', 'Interactions'],
        ]}
      />
      {notifications.error ? (
        <ErrorState message={notifications.error} onRetry={notifications.reload} />
      ) : notifications.loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty icon="bell" title="Aucune notification" action={<Link to="/feed" className="btn">Retour au fil</Link>}>
          {tab === 'projects' ? 'Les likes, commentaires et réponses apparaîtront ici.' : 'Les mentions apparaîtront ici.'}
        </Empty>
      ) : (
        <div className="list">
          {items.map((item) => (
            <Link key={item.id} to={item.postId ? `/post/${item.postId}` : `/u/${item.actor.username}`} className="list-item" style={{ alignItems: 'flex-start' }}>
              <Avatar user={item.actor} link={false} />
              <div className="grow">
                <p className="small">{item.message}</p>
                <p className="xs muted">
                  <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                </p>
              </div>
              {!item.readAt && <span className="unread-dot" aria-label="Non lue" />}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function toPushSubscriptionInput(
  subscription: PushSubscription,
): PushSubscriptionInput {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('L’abonnement du navigateur est incomplet.');
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

function decodeVapidPublicKey(publicKey: string): ArrayBuffer {
  const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = Uint8Array.from(window.atob(padded), (character) =>
    character.charCodeAt(0),
  );
  const buffer = new ArrayBuffer(decoded.length);
  new Uint8Array(buffer).set(decoded);
  return buffer;
}

function isPushUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.code === 'PUSH_NOT_CONFIGURED')
  );
}
