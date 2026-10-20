import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { CommentEntity } from './comment.entity.js';

@Entity('comment_mentions')
@Unique('UQ_comment_mentions_user_comment', ['userId', 'commentId'])
export class CommentMentionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'uuid' })
  commentId!: string;

  @ManyToOne(() => CommentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment!: CommentEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
