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
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { ProjectStatus } from '../domain/project.types.js';
import { ProjectContributionEntity } from './project-contribution.entity.js';
import { ProjectMemberEntity } from './project-member.entity.js';
import { ProjectTaskEntity } from './project-task.entity.js';

@Entity('projects')
@Index('IDX_projects_owner_created', ['ownerId', 'createdAt'])
@Index('IDX_projects_slug', ['slug'], { unique: true })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  repositoryUrl!: string | null;

  @Column({ type: 'varchar', array: true, default: () => 'ARRAY[]::varchar[]' })
  technologies!: string[];

  @Column({ type: 'boolean', default: false })
  isBeginnerFriendly!: boolean;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status',
    default: ProjectStatus.PLANNING,
  })
  status!: ProjectStatus;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity;

  @OneToMany(() => ProjectTaskEntity, (task) => task.project)
  tasks!: ProjectTaskEntity[];

  @OneToMany(() => ProjectMemberEntity, (member) => member.project)
  members!: ProjectMemberEntity[];

  @OneToMany(() => ProjectContributionEntity, (contribution) => contribution.project)
  contributions!: ProjectContributionEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
