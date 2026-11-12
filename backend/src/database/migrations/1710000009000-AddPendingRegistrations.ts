import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingRegistrations1710000009000
  implements MigrationInterface
{
  name = 'AddPendingRegistrations1710000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pending_registrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL,
        "username" varchar(20) NOT NULL,
        "displayName" varchar(80) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pending_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pending_registrations_email" UNIQUE ("email"),
        CONSTRAINT "UQ_pending_registrations_username" UNIQUE ("username"),
        CONSTRAINT "CHK_pending_registrations_attempts" CHECK ("attempts" >= 0 AND "attempts" <= 5)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pending_registrations_expires_at" ON "pending_registrations" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_pending_registrations_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE "pending_registrations"`);
  }
}
