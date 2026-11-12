import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationAndOAuth1710000002000 implements MigrationInterface {
  name = 'AddEmailVerificationAndOAuth1710000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "googleId" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "githubId" varchar(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_google_id" ON "users" ("googleId") WHERE "googleId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_github_id" ON "users" ("githubId") WHERE "githubId" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "email_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "expiresAt" timestamptz NOT NULL,
        CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_email_verifications_user" UNIQUE ("userId"),
        CONSTRAINT "FK_email_verifications_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_email_verifications_attempts" CHECK ("attempts" >= 0 AND "attempts" <= 5)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_verifications"`);
    await queryRunner.query(`DROP INDEX "UQ_users_github_id"`);
    await queryRunner.query(`DROP INDEX "UQ_users_google_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "githubId", DROP COLUMN "googleId", DROP COLUMN "emailVerified"`,
    );
    await queryRunner.query(`
      UPDATE "users"
      SET "passwordHash" = 'oauth-disabled:' || "id"::text
      WHERE "passwordHash" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
  }
}
