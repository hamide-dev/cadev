export enum DeveloperSpecialty {
  FRONT_END = 'FRONT_END',
  BACK_END = 'BACK_END',
  FULL_STACK = 'FULL_STACK',
  MOBILE = 'MOBILE',
  DATA_AI = 'DATA_AI',
  DEVOPS = 'DEVOPS',
}

export enum ExperienceLevel {
  LEARNING = 'LEARNING',
  JUNIOR = 'JUNIOR',
  CONFIRMED = 'CONFIRMED',
  SENIOR = 'SENIOR',
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  githubUrl: string | null;
  specialty: DeveloperSpecialty | null;
  experienceLevel: ExperienceLevel | null;
  interests: string[];
  technologies: string[];
  createdAt: string;
}
