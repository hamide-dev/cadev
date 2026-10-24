import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { ProjectMemberRole } from '../domain/project.types.js';
import { ProjectEntity } from './project.entity.js';

@Entity('project_members')
@Index('IDX_project_members_project_user', ['projectId', 'userId'], { unique: true })
export class ProjectMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Relation<ProjectEntity>;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: ProjectMemberRole,
    enumName: 'project_member_role',
    default: ProjectMemberRole.MEMBER,
  })
  role!: ProjectMemberRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
