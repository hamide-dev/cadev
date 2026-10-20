import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { ProjectsService } from './application/projects.service.js';
import { ProjectContributionEntity } from './infrastructure/project-contribution.entity.js';
import { ProjectEntity } from './infrastructure/project.entity.js';
import { ProjectMemberEntity } from './infrastructure/project-member.entity.js';
import { ProjectTaskEntity } from './infrastructure/project-task.entity.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectMemberEntity,
      ProjectTaskEntity,
      ProjectContributionEntity,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
