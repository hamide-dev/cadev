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
import { PostEntity } from './post.entity.js';

@Entity('comments')
@Index('IDX_comments_post_created', ['postId', 'createdAt', 'id'])
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => PostEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId!: string | null;

  @ManyToOne(() => CommentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment!: CommentEntity | null;

  @Column({ type: 'text' })
  content!: string;

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
