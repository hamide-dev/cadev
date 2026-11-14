export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const BASE = `${API_URL}/api/v1`;
export const FRONTEND_API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? 'b4f7b88eff2a716ce8c2b0f045c38a37c00cc6959a2df30f970f9c5a2e487d9b';
const LEGACY_TOKEN_KEY = 'hw.token';

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
  API_KEY_INVALID: "La clé d'application du frontend ne correspond pas à celle du serveur.",
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  ACCOUNT_TEMPORARILY_LOCKED: 'Compte temporairement bloqué pendant 2 minutes suite à 5 tentatives infructueuses.',
  INVALID_VERIFICATION_CODE: 'Ce code ne correspond pas ou a expiré. Vérifie-le ou demande-en un nouveau.',
  VERIFICATION_ATTEMPTS_EXCEEDED: 'Trop de tentatives. Demande un nouveau code.',
  EMAIL_ALREADY_VERIFIED: 'Cette adresse est déjà vérifiée, tu peux te connecter.',
  EMAIL_VERIFICATION_REQUIRED: "Ton adresse n'est pas encore vérifiée. Termine l'inscription avec le code reçu.",
  EMAIL_PROVIDER_NOT_CONFIGURED: "L'envoi d'e-mails n'est pas encore configuré sur ce serveur. Connecte-toi avec ton mot de passe.",
  EMAIL_PROVIDER_AUTH_FAILED: "Brevo a refusé les identifiants SMTP. Vérifie BREVO_SMTP_LOGIN et BREVO_SMTP_KEY.",
  EMAIL_PROVIDER_IP_NOT_AUTHORIZED: "Le serveur SMTP n'autorise pas cette machine. Vérifie sa liste d'accès réseau.",
  EMAIL_PROVIDER_UNAVAILABLE: "Impossible de joindre le serveur SMTP. Vérifie son adresse, son port et son état.",
  EMAIL_PROVIDER_RATE_LIMITED: "Le serveur SMTP limite temporairement l'envoi. Patiente avant de redemander un code.",
  EMAIL_PROVIDER_SEND_FAILED: "Le serveur SMTP a refusé l'envoi. Vérifie l'adresse expéditrice autorisée.",
  EMAIL_ALREADY_EXISTS: 'Cet e-mail est déjà associé à un compte.',
  USERNAME_ALREADY_EXISTS: 'Ce pseudo est déjà pris.',
  REGISTRATION_CONFLICT: 'Cet e-mail ou ce pseudo est déjà associé à un compte.',
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

export function clearLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Le stockage peut être indisponible, le cookie reste la source d'authentification.
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

let refreshRequest: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
      headers: { 'x-api-key': FRONTEND_API_KEY },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    const requestOptions: RequestInit = {
      method,
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'x-api-key': FRONTEND_API_KEY,
        ...(import.meta.env.VITE_API_KEY
          ? { 'x-api-key': import.meta.env.VITE_API_KEY }
          : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
    response = await fetch(`${BASE}${path}`, requestOptions);
    if (response.status === 401 && !path.startsWith('/auth/')) {
      await refreshSession();
      response = await fetch(`${BASE}${path}`, requestOptions);
      if (response.status === 401) onUnauthorized();
    }
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
    const serverMsg = typeof data?.message === 'string' && data.message.length > 0 ? data.message : null;
    throw new ApiError(
      response.status,
      code,
      serverMsg ?? MESSAGES[code] ?? BY_STATUS[response.status] ?? 'Une erreur est survenue. Réessaie dans un instant.',
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
