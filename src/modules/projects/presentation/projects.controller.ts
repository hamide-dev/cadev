import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import {
  ProjectMemberRole,
  type PublicProject,
  type PublicProjectContribution,
  type PublicProjectTask,
} from '../domain/project.types.js';
import { ProjectsService } from '../application/projects.service.js';
import {
  CreateProjectContributionDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  UpdateProjectDto,
  UpdateProjectTaskDto,
} from './dto/create-project.dto.js';

class AddProjectMemberDto {
  @IsUUID('4')
  userId!: string;

  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;
}

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List open source projects' })
  list(): Promise<PublicProject[]> {
    return this.projectsService.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateProjectDto,
  ): Promise<PublicProject> {
    return this.projectsService.create(user, input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one project' })
  getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.projectsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(id, user.id, input);
  }

  @Put(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a member to a project' })
  addMember(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(id, user.id, input.userId, input.role);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List project tasks' })
  listTasks(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicProjectTask[]> {
    return this.projectsService.listTasks(id);
  }

  @Post(':id/tasks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task for a project' })
  createTask(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: CreateProjectTaskDto,
  ): Promise<PublicProjectTask> {
    return this.projectsService.createTask(id, user.id, input);
  }

  @Patch(':id/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task' })
  updateTask(
    @Param('id', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateProjectTaskDto,
  ): Promise<PublicProjectTask> {
    return this.projectsService.updateTask(projectId, taskId, user.id, input);
  }

  @Get(':id/contributions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List project contributions' })
  listContributions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicProjectContribution[]> {
    return this.projectsService.listContributions(id);
  }

  @Post(':id/contributions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Offer help or propose a contribution' })
  contribute(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: CreateProjectContributionDto,
  ): Promise<PublicProjectContribution> {
    return this.projectsService.contribute(id, user.id, input);
  }
}
