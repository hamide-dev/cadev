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
import { MessageType } from '../domain/messaging.types.js';
import { ConversationEntity } from './conversation.entity.js';

@Entity('messages')
@Index('IDX_messages_conversation_created', [
  'conversationId',
  'createdAt',
  'id',
])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => ConversationEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: ConversationEntity;

  @Column({ type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  parentMessageId!: string | null;

  @ManyToOne(() => MessageEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage!: MessageEntity | null;

  @Column({ type: 'enum', enum: MessageType, enumName: 'message_type' })
  type!: MessageType;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
