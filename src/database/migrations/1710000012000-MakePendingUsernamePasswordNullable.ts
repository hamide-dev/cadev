import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePendingUsernamePasswordNullable1710000012000
  implements MigrationInterface
{
  name = 'MakePendingUsernamePasswordNullable1710000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on username (it may be NULL now)
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" DROP CONSTRAINT IF EXISTS "UQ_pending_registrations_username"`,
    );
    // Make username nullable
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ALTER COLUMN "username" DROP NOT NULL`,
    );
    // Make passwordHash nullable
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
    // Re-add unique constraint on username, but only for non-null values (partial index)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pending_registrations_username" ON "pending_registrations" ("username") WHERE "username" IS NOT NULL`,
    );
    // Add emailVerified column to track OTP confirmation within pending flow
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" DROP COLUMN IF EXISTS "emailVerified"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_pending_registrations_username"`,
    );
    // Restore NOT NULL (this may fail if there are NULL rows, acceptable for rollback)
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ALTER COLUMN "username" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_registrations" ADD CONSTRAINT "UQ_pending_registrations_username" UNIQUE ("username")`,
    );
  }
}
