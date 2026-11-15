import { api } from './api';
import type { PushSubscriptionInput } from './api/types';

// Notifications push : helpers partagés entre Paramètres et la fenêtre « Active les notifications ».

export function pushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** À appeler depuis un geste de l'utilisateur (bouton) : iOS refuse sinon. */
export async function subscribePush(): Promise<'enabled' | 'denied' | 'unavailable'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const config = await api.pushConfiguration();
  if (!config.configured || !config.publicKey) return 'unavailable';
  await navigator.serviceWorker.register('/service-worker.js');
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidPublicKey(config.publicKey) }));
  await api.savePushSubscription(toPushSubscriptionInput(subscription));
  return 'enabled';
}

export function toPushSubscriptionInput(
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

export function decodeVapidPublicKey(publicKey: string): ArrayBuffer {
  const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = Uint8Array.from(window.atob(padded), (character) =>
    character.charCodeAt(0),
  );
  const buffer = new ArrayBuffer(decoded.length);
  new Uint8Array(buffer).set(decoded);
  return buffer;
}

