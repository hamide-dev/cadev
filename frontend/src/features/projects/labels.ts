import { type Project, type TaskStatus } from '../../lib/api';

export const PROJECT_STATUS: Record<Project['status'], string> = { PLANNING: 'en préparation', ACTIVE: 'actif', MAINTENANCE: 'maintenance', ARCHIVED: 'archivé' };
export const TASK_STATUS: Record<TaskStatus, string> = { OPEN: 'ouverte', IN_PROGRESS: 'en cours', REVIEW: 'en revue', DONE: 'terminée' };

export const repoName = (project: Project) => project.repositoryUrl?.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '') ?? project.slug;
