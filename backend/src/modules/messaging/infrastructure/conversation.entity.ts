import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { ConversationType } from '../domain/messaging.types.js';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    enumName: 'conversation_type',
  })
  type!: ConversationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 73, nullable: true, unique: true })
  directKey!: string | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @OneToMany(() => ConversationMemberEntity, (member) => member.conversation)
  members!: ConversationMemberEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('conversation_members')
@Index('UQ_conversation_members_pair', ['conversationId', 'userId'], {
  unique: true,
})
export class ConversationMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Relation<ConversationEntity>;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
