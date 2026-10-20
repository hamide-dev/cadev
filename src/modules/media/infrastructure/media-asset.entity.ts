import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { ConversationEntity } from '../../messaging/infrastructure/conversation.entity.js';
import { MessageEntity } from '../../messaging/infrastructure/message.entity.js';
import { PostEntity } from '../../posts/infrastructure/post.entity.js';
import { MediaPurpose, MediaResourceType } from '../domain/media.types.js';

@Entity('media_assets')
@Index('UQ_media_assets_cloud_public_id', ['cloudPublicId'], { unique: true })
@Index('IDX_media_assets_chat_owner', [
  'conversationId',
  'ownerId',
  'messageId',
])
@Index('IDX_media_assets_post_owner', ['postId', 'ownerId'])
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity;

  @Column({ type: 'varchar', length: 20 })
  purpose!: MediaPurpose;

  @Column({
    type: 'enum',
    enum: MediaResourceType,
    enumName: 'media_resource_type',
  })
  resourceType!: MediaResourceType;

  @Column({ type: 'varchar', length: 512, unique: true })
  cloudPublicId!: string;

  @Column({ type: 'varchar', length: 20 })
  format!: string;

  @Column({ type: 'integer' })
  bytes!: number;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  publicUrl!: string | null;

  @Column({ type: 'uuid', nullable: true })
  conversationId!: string | null;

  @ManyToOne(() => ConversationEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: ConversationEntity | null;

  @Column({ type: 'uuid', nullable: true })
  messageId!: string | null;

  @ManyToOne(() => MessageEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'messageId' })
  message!: MessageEntity | null;

  @Column({ type: 'uuid', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
