import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { PostType } from '../domain/post.types.js';

@Entity('posts')
@Index('IDX_posts_created_id', ['createdAt', 'id'])
@Index('IDX_posts_author_created', ['authorId', 'createdAt'])
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PostType, enumName: 'post_type' })
  type!: PostType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  codeSnippet!: string | null;

  @Column({ type: 'varchar', array: true, default: () => 'ARRAY[]::varchar[]' })
  tags!: string[];

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
