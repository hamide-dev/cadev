import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';

export enum NotificationType {
  MENTION = 'MENTION',
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient!: UserEntity;

  @Column({ type: 'uuid' })
  actorId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor!: UserEntity;

  @Column({ type: 'enum', enum: NotificationType, enumName: 'notification_type' })
  type!: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  postId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  commentId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
