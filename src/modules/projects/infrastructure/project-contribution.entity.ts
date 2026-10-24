import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import {
  ProjectContributionStatus,
  ProjectContributionType,
} from '../domain/project.types.js';
import { ProjectEntity } from './project.entity.js';
import { ProjectTaskEntity } from './project-task.entity.js';

@Entity('project_contributions')
@Index('IDX_project_contributions_project_user', ['projectId', 'userId'])
export class ProjectContributionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Relation<ProjectEntity>;

  @Column({ type: 'uuid', nullable: true })
  taskId!: string | null;

  @ManyToOne(() => ProjectTaskEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'taskId' })
  task!: ProjectTaskEntity | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: ProjectContributionType,
    enumName: 'project_contribution_type',
    default: ProjectContributionType.HELP_OFFERED,
  })
  type!: ProjectContributionType;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: ProjectContributionStatus,
    enumName: 'project_contribution_status',
    default: ProjectContributionStatus.PENDING,
  })
  status!: ProjectContributionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
