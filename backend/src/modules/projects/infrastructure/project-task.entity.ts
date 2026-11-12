import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { ProjectTaskStatus } from '../domain/project.types.js';
import { ProjectEntity } from './project.entity.js';

@Entity('project_tasks')
@Index('IDX_project_tasks_project_status', ['projectId', 'status'])
export class ProjectTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Relation<ProjectEntity>;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', array: true, default: () => 'ARRAY[]::varchar[]' })
  acceptanceCriteria!: string[];

  @Column({
    type: 'enum',
    enum: ProjectTaskStatus,
    enumName: 'project_task_status',
    default: ProjectTaskStatus.OPEN,
  })
  status!: ProjectTaskStatus;

  @Column({ type: 'boolean', default: false })
  isBeginnerFriendly!: boolean;

  @Column({ type: 'uuid', nullable: true })
  assignedUserId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser!: UserEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
