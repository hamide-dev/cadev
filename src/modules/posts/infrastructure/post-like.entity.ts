import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { PostEntity } from './post.entity.js';

@Entity('post_likes')
@Unique('UQ_post_likes_user_post', ['userId', 'postId'])
export class PostLikeEntity {
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
  post!: Relation<PostEntity>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
