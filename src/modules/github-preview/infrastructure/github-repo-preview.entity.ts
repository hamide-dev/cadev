import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('github_repo_previews')
@Index('UQ_github_repo_previews_full_name', ['fullName'], { unique: true })
@Index('IDX_github_repo_previews_expires_at', ['expiresAt'])
export class GitHubRepoPreviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  owner!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 201 })
  fullName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  language!: string | null;

  @Column({ type: 'integer' })
  stars!: number;

  @Column({ type: 'integer' })
  forks!: number;

  @Column({ type: 'integer' })
  openIssues!: number;

  @Column({ type: 'varchar', length: 2048 })
  htmlUrl!: string;

  @Column({ type: 'varchar', length: 2048 })
  ogImageUrl!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  etag!: string | null;

  @Column({ type: 'timestamptz' })
  fetchedAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
