import { io, type Socket } from 'socket.io-client';
import { API_URL, getToken, type Author } from './api';

// Contrat Socket.IO du namespace /messaging (docs/api-contracts.md du back).
export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  members: Array<Pick<Author, 'id' | 'username' | 'displayName'>>;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: Author;
  type: 'TEXT' | 'CODE' | 'LINK' | 'MEDIA';
  content: string;
  parentMessageId: string | null;
  createdAt: string;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/messaging`, { auth: { token: getToken() }, transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// Les handlers de la gateway renvoient leur résultat en accusé de réception.
// Une erreur de validation ou d'autorisation arrive par l'événement `exception`.
export function emit<T>(event: string, payload?: unknown): Promise<T> {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      s.off('exception', onException);
      s.off('connect_error', onConnectError);
    };
    const onException = (error: { message?: string }) => {
      cleanup();
      reject(new Error(error?.message ?? 'Action refusée par le serveur.'));
    };
    const onConnectError = () => {
      cleanup();
      reject(new Error('Connexion à la messagerie impossible. Reconnecte-toi ou réessaie plus tard.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Le serveur de messagerie ne répond pas. Réessaie dans un instant.'));
    }, 8000);
    s.once('exception', onException);
    s.once('connect_error', onConnectError);
    s.emit(event, payload ?? {}, (result: T) => {
      cleanup();
      resolve(result);
    });
  });
}
