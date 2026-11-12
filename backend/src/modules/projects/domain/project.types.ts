export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  MEMBER = 'MEMBER',
}

export enum ProjectTaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum ProjectContributionType {
  HELP_OFFERED = 'HELP_OFFERED',
  CONTRIBUTION = 'CONTRIBUTION',
}

export enum ProjectContributionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface PublicProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  repositoryUrl: string | null;
  technologies: string[];
  isBeginnerFriendly: boolean;
  status: ProjectStatus;
  ownerId: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: ProjectTaskStatus;
  isBeginnerFriendly: boolean;
  assignedUserId: string | null;
  assignedUser: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProjectContribution {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  type: ProjectContributionType;
  message: string;
  status: ProjectContributionStatus;
  createdAt: string;
  updatedAt: string;
}
