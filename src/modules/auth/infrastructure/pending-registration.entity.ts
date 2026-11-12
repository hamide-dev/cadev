import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pending_registrations')
export class PendingRegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  /** Rempli lors de l'étape 2 (après vérification e-mail). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 80 })
  displayName!: string;

  /** Rempli lors de l'étape 2 (après vérification e-mail). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  /** Hash HMAC du code OTP envoyé par e-mail. Null = OTP déjà vérifié. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  codeHash!: string | null;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  /** Vrai une fois que l'OTP de l'étape 1 a été validé avec succès. */
  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
