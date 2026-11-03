import { ApiError, type Level, type Specialty } from './api';

export const SPECIALTIES: Record<Specialty, string> = {
  FRONT_END: 'Front-end',
  BACK_END: 'Back-end',
  FULL_STACK: 'Full-stack',
  MOBILE: 'Mobile',
  DATA_AI: 'Data/IA',
  DEVOPS: 'DevOps',
};
export const LEVELS: Record<Level, string> = {
  LEARNING: 'En apprentissage',
  JUNIOR: 'Junior',
  CONFIRMED: 'Confirmé',
  SENIOR: 'Senior',
};
export const INTERESTS = ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Data/IA', 'DevOps', 'Accessibilité', 'Open source'];

export function roleLine(user: { specialty: Specialty | null; experienceLevel: Level | null }): string {
  return [user.specialty && SPECIALTIES[user.specialty], user.experienceLevel && LEVELS[user.experienceLevel]]
    .filter(Boolean)
    .join(' · ');
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return rtf.format(-Math.floor(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short' });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

// Premier dépôt GitHub cité dans un texte, pour l'aperçu du projet.
export function findRepoUrl(text: string): string | null {
  return text.match(/https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/)?.[0].replace(/[.,)]+$/, '') ?? null;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
