export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const BASE = `${API_URL}/api/v1`;
const TOKEN_KEY = 'hw.token';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Messages lisibles par un humain, par code métier ou statut HTTP.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  INVALID_VERIFICATION_CODE: 'Ce code ne correspond pas ou a expiré. Vérifie-le ou demande-en un nouveau.',
  VERIFICATION_ATTEMPTS_EXCEEDED: 'Trop de tentatives. Demande un nouveau code.',
  EMAIL_ALREADY_VERIFIED: 'Cette adresse est déjà vérifiée, tu peux te connecter.',
  EMAIL_VERIFICATION_REQUIRED: "Ton adresse n'est pas encore vérifiée. Termine l'inscription avec le code reçu.",
  EMAIL_PROVIDER_NOT_CONFIGURED: "L'envoi d'e-mails n'est pas encore configuré sur ce serveur. Connecte-toi avec ton mot de passe.",
  EMAIL_PROVIDER_AUTH_FAILED: "Le serveur SMTP a refusé les identifiants configurés. Vérifie SMTP_USER et SMTP_PASSWORD.",
  EMAIL_PROVIDER_IP_NOT_AUTHORIZED: "Le serveur SMTP n'autorise pas cette machine. Vérifie sa liste d'accès réseau.",
  EMAIL_PROVIDER_UNAVAILABLE: "Impossible de joindre le serveur SMTP. Vérifie son adresse, son port et son état.",
  EMAIL_PROVIDER_RATE_LIMITED: "Le serveur SMTP limite temporairement l'envoi. Patiente avant de redemander un code.",
  EMAIL_PROVIDER_SEND_FAILED: "Le serveur SMTP a refusé l'envoi. Vérifie l'adresse expéditrice autorisée.",
  ACCOUNT_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail ou ce pseudo.',
  CANNOT_FOLLOW_SELF: 'Tu ne peux pas te suivre toi-même.',
  USER_NOT_FOUND: "Ce développeur n'existe pas.",
  OAUTH_PROVIDER_NOT_CONFIGURED: "Cette connexion n'est pas encore configurée sur ce serveur.",
  MEDIA_PROVIDER_NOT_CONFIGURED: "L'envoi d'images n'est pas encore configuré sur ce serveur.",
  MEDIA_FORMAT_NOT_ALLOWED: "Ce format de fichier n'est pas accepté.",
  MEDIA_TOO_LARGE: 'Ce fichier est trop lourd.',
  POST_ATTACHMENT_LIMIT: 'Cinq pièces jointes maximum par publication.',
  POST_CONTENT_REQUIRED: 'Écris quelque chose avant de publier.',
  INVALID_GITHUB_REPOSITORY_URL: 'Ce lien ne ressemble pas à un dépôt GitHub (github.com/owner/repo).',
  GITHUB_API_UNAVAILABLE: "GitHub ne répond pas pour l'instant.",
  PROJECT_ACCESS_DENIED: 'Seuls les responsables du projet peuvent faire ça.',
  PASSWORD_TOO_LONG: 'Ce mot de passe est trop long (72 octets maximum).',
};
const BY_STATUS: Record<number, string> = {
  400: 'Certains champs ne sont pas valides. Vérifie-les et réessaie.',
  401: 'Ta session a expiré. Reconnecte-toi.',
  403: "Tu n'as pas le droit de faire cette action.",
  404: "Ce contenu n'existe pas ou a été supprimé.",
  409: 'Cette valeur est déjà utilisée.',
  429: 'Trop de tentatives en peu de temps. Patiente une minute.',
  503: "Ce service n'est pas disponible sur le serveur pour le moment.",
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : la session reste en mémoire le temps de l'onglet.
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code: string = data?.code ?? data?.error ?? 'HTTP_ERROR';
    if (import.meta.env.DEV) {
      console.error(`[API] ${method} ${path} failed`, {
        status: response.status,
        code,
        message: data?.message,
      });
    }
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(
      response.status,
      code,
      MESSAGES[code] ?? BY_STATUS[response.status] ?? 'Une erreur est survenue. Réessaie dans un instant.',
    );
  }
  return data as T;
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value != null) search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};
