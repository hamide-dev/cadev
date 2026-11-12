export interface GitHubRepoPreview {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  htmlUrl: string;
  ogImageUrl: string;
  fetchedAt: string;
  expiresAt: string;
}
