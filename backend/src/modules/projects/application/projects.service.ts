import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../../database/is-unique-violation.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import {
  ProjectContributionStatus,
  ProjectContributionType,
  ProjectMemberRole,
  ProjectStatus,
  type PublicProject,
  type PublicProjectContribution,
  type PublicProjectTask,
} from '../domain/project.types.js';
import { ProjectContributionEntity } from '../infrastructure/project-contribution.entity.js';
import { ProjectEntity } from '../infrastructure/project.entity.js';
import { ProjectMemberEntity } from '../infrastructure/project-member.entity.js';
import { ProjectTaskEntity } from '../infrastructure/project-task.entity.js';
import type {
  CreateProjectContributionDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  UpdateProjectDto,
  UpdateProjectTaskDto,
} from '../presentation/dto/create-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity)
    private readonly projectMembers: Repository<ProjectMemberEntity>,
    @InjectRepository(ProjectTaskEntity)
    private readonly projectTasks: Repository<ProjectTaskEntity>,
    @InjectRepository(ProjectContributionEntity)
    private readonly contributions: Repository<ProjectContributionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async list(): Promise<PublicProject[]> {
    const projects = await this.projects.find({
      relations: { owner: true },
      order: { createdAt: 'DESC' },
    });
    const memberCounts = await this.projectMembers
      .createQueryBuilder('member')
      .select('member.projectId', 'projectId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('member.projectId')
      .getRawMany<{ projectId: string; count: string }>();
    const countByProjectId = new Map(
      memberCounts.map((entry) => [entry.projectId, Number(entry.count)]),
    );
    return projects.map((project) =>
      toPublicProject(project, countByProjectId.get(project.id) ?? 0),
    );
  }

  async create(author: AuthUser, input: CreateProjectDto): Promise<PublicProject> {
    const project = this.projects.create({
      name: input.name.trim(),
      slug: toSlug(input.name),
      description: input.description?.trim() ?? '',
      repositoryUrl: normalizeRepositoryUrl(input.repositoryUrl),
      technologies: normalizeTags(input.technologies ?? []),
      isBeginnerFriendly: input.isBeginnerFriendly ?? false,
      status: input.status ?? ProjectStatus.PLANNING,
      ownerId: author.id,
    });
    const saved = await this.projects.save(project);
    await this.projectMembers.save(
      this.projectMembers.create({
        projectId: saved.id,
        userId: author.id,
        role: ProjectMemberRole.OWNER,
      }),
    );
    return this.getById(saved.id);
  }

  async getById(id: string): Promise<PublicProject> {
    const project = await this.projects.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (!project) throw this.projectNotFound();
    const memberCount = await this.projectMembers.count({ where: { projectId: id } });
    return toPublicProject(project, memberCount);
  }

  async updateProject(
    id: string,
    userId: string,
    input: UpdateProjectDto,
  ): Promise<PublicProject> {
    const project = await this.findProjectForOwner(id, userId);
    if (input.name !== undefined) {
      project.name = input.name.trim();
      project.slug = toSlug(input.name);
    }
    if (input.description !== undefined) project.description = input.description.trim();
    if (input.repositoryUrl !== undefined)
      project.repositoryUrl = normalizeRepositoryUrl(input.repositoryUrl);
    if (input.technologies !== undefined)
      project.technologies = normalizeTags(input.technologies);
    if (input.isBeginnerFriendly !== undefined)
      project.isBeginnerFriendly = input.isBeginnerFriendly;
    if (input.status !== undefined) project.status = input.status;
    const saved = await this.projects.save(project);
    return this.getById(saved.id);
  }

  async addMember(
    projectId: string,
    actorId: string,
    targetUserId: string,
    role: ProjectMemberRole,
  ): Promise<{ added: true }> {
    const project = await this.findProjectForOwner(projectId, actorId);
    const userExists = await this.users.exists({ where: { id: targetUserId } });
    if (!userExists) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    try {
      await this.projectMembers.save(
        this.projectMembers.create({
          projectId: project.id,
          userId: targetUserId,
          role,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'PROJECT_MEMBER_ALREADY_EXISTS',
          message: 'This user is already a team member.',
        });
      }
      throw error;
    }
    return { added: true };
  }

  async listTasks(projectId: string): Promise<PublicProjectTask[]> {
    await this.assertProjectExists(projectId);
    const tasks = await this.projectTasks.find({
      where: { projectId },
      relations: { assignedUser: true },
      order: { createdAt: 'DESC' },
    });
    return tasks.map(toPublicTask);
  }

  async createTask(
    projectId: string,
    userId: string,
    input: CreateProjectTaskDto,
  ): Promise<PublicProjectTask> {
    await this.assertProjectMember(projectId, userId);
    const task = this.projectTasks.create({
      projectId,
      title: input.title.trim(),
      description: input.description.trim(),
      acceptanceCriteria: normalizeTags(input.acceptanceCriteria ?? []),
      isBeginnerFriendly: input.isBeginnerFriendly ?? false,
      assignedUserId: null,
    });
    const saved = await this.projectTasks.save(task);
    return toPublicTask({ ...saved, assignedUser: null });
  }

  async updateTask(
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateProjectTaskDto,
  ): Promise<PublicProjectTask> {
    const project = await this.assertProjectMember(projectId, userId);
    const task = await this.projectTasks.findOne({
      where: { id: taskId, projectId: project.id },
      relations: { assignedUser: true },
    });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found.' });
    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description.trim();
    if (input.acceptanceCriteria !== undefined)
      task.acceptanceCriteria = normalizeTags(input.acceptanceCriteria);
    if (input.isBeginnerFriendly !== undefined)
      task.isBeginnerFriendly = input.isBeginnerFriendly;
    const saved = await this.projectTasks.save(task);
    return toPublicTask(saved);
  }

  async contribute(
    projectId: string,
    userId: string,
    input: CreateProjectContributionDto,
  ): Promise<PublicProjectContribution> {
    await this.assertProjectExists(projectId);
    const task = input.taskId
      ? await this.projectTasks.findOneBy({ id: input.taskId, projectId })
      : null;
    if (input.taskId && !task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found for this project.',
      });
    }
    const contribution = this.contributions.create({
      projectId,
      taskId: task?.id ?? null,
      userId,
      type: task ? ProjectContributionType.CONTRIBUTION : ProjectContributionType.HELP_OFFERED,
      message: input.message.trim(),
      status: ProjectContributionStatus.PENDING,
    });
    const saved = await this.contributions.save(contribution);
    return this.getContribution(saved.id);
  }

  async listContributions(projectId: string): Promise<PublicProjectContribution[]> {
    await this.assertProjectExists(projectId);
    const contributions = await this.contributions.find({
      where: { projectId },
      relations: { user: true, task: true },
      order: { createdAt: 'DESC' },
    });
    return contributions.map(toPublicContribution);
  }

  async getContribution(id: string): Promise<PublicProjectContribution> {
    const contribution = await this.contributions.findOne({
      where: { id },
      relations: { user: true, task: true },
    });
    if (!contribution) {
      throw new NotFoundException({
        code: 'CONTRIBUTION_NOT_FOUND',
        message: 'Contribution not found.',
      });
    }
    return toPublicContribution(contribution);
  }

  private async assertProjectExists(projectId: string): Promise<ProjectEntity> {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw this.projectNotFound();
    return project;
  }

  private async assertProjectMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.assertProjectExists(projectId);
    const member = await this.projectMembers.findOneBy({ projectId, userId });
    if (!member) {
      throw new ForbiddenException({
        code: 'PROJECT_ACCESS_DENIED',
        message: 'You are not a member of this project.',
      });
    }
    return project;
  }

  private async findProjectForOwner(
    projectId: string,
    userId: string,
  ): Promise<ProjectEntity> {
    const project = await this.assertProjectExists(projectId);
    const member = await this.projectMembers.findOneBy({ projectId, userId });
    if (!member || ![ProjectMemberRole.OWNER, ProjectMemberRole.MAINTAINER].includes(member.role)) {
      throw new ForbiddenException({
        code: 'PROJECT_ACCESS_DENIED',
        message: 'Only owners and maintainers can update this project.',
      });
    }
    return project;
  }

  private projectNotFound() {
    return new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found.',
    });
  }
}

function normalizeTags(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .slice(0, 20)
    .map((value) => value.toLowerCase());
  return cleaned;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'project';
}

function normalizeRepositoryUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function toPublicProject(project: ProjectEntity, memberCount: number): PublicProject {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    repositoryUrl: project.repositoryUrl,
    technologies: project.technologies,
    isBeginnerFriendly: project.isBeginnerFriendly,
    status: project.status,
    ownerId: project.ownerId,
    owner: {
      id: project.owner.id,
      username: project.owner.username,
      displayName: project.owner.displayName,
      avatarUrl: project.owner.avatarUrl,
    },
    memberCount,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function toPublicTask(task: ProjectTaskEntity): PublicProjectTask {
  if (!task.assignedUser && task.assignedUserId) {
    throw new Error('Assigned user must be loaded for task mapping');
  }
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    status: task.status,
    isBeginnerFriendly: task.isBeginnerFriendly,
    assignedUserId: task.assignedUserId,
    assignedUser: task.assignedUser
      ? {
          id: task.assignedUser.id,
          username: task.assignedUser.username,
          displayName: task.assignedUser.displayName,
          avatarUrl: task.assignedUser.avatarUrl,
        }
      : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function toPublicContribution(
  contribution: ProjectContributionEntity,
): PublicProjectContribution {
  return {
    id: contribution.id,
    projectId: contribution.projectId,
    taskId: contribution.taskId,
    userId: contribution.userId,
    user: {
      id: contribution.user.id,
      username: contribution.user.username,
      displayName: contribution.user.displayName,
      avatarUrl: contribution.user.avatarUrl,
    },
    type: contribution.type,
    message: contribution.message,
    status: contribution.status,
    createdAt: contribution.createdAt.toISOString(),
    updatedAt: contribution.updatedAt.toISOString(),
  };
}
