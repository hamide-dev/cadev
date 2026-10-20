import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DeveloperSpecialty,
  ExperienceLevel,
} from '../domain/user.types.js';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 80 })
  displayName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  googleId!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  githubId!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  githubUrl!: string | null;

  @Column({
    type: 'enum',
    enum: DeveloperSpecialty,
    enumName: 'developer_specialty',
    nullable: true,
  })
  specialty!: DeveloperSpecialty | null;

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    enumName: 'experience_level',
    nullable: true,
  })
  experienceLevel!: ExperienceLevel | null;

  @Column({
    type: 'varchar',
    array: true,
    default: () => 'ARRAY[]::varchar[]',
  })
  interests!: string[];

  @Column({
    type: 'varchar',
    array: true,
    default: () => 'ARRAY[]::varchar[]',
  })
  technologies!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
