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
import { PostType } from '../domain/post.types.js';
import { PostLikeEntity } from './post-like.entity.js';
import { PostMentionEntity } from './post-mention.entity.js';

@Entity('posts')
@Index('IDX_posts_created_id', ['createdAt', 'id'])
@Index('IDX_posts_author_created', ['authorId', 'createdAt'])
@Index('IDX_posts_author_pinned', ['authorId', 'isPinned'])
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

  @Column({ type: 'boolean', default: false })
  isDraft!: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @OneToMany(() => PostLikeEntity, (like) => like.post)
  likes!: PostLikeEntity[];

  @OneToMany(() => PostMentionEntity, (mention) => mention.post)
  mentions!: PostMentionEntity[];

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
