import {
  CreateDateColumn,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity.js';

@Entity('user_follows')
@Unique('UQ_user_follows_pair', ['followerId', 'followedId'])
export class UserFollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  followerId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower!: UserEntity;

  @Column({ type: 'uuid' })
  followedId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followedId' })
  followed!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
