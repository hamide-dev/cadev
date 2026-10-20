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
import { PostEntity } from './post.entity.js';

@Entity('question_follows')
@Unique('UQ_question_follows_user_post', ['userId', 'postId'])
export class QuestionFollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => PostEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
