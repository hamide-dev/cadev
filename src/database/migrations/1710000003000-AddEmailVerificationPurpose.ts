import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationPurpose1710000003000
  implements MigrationInterface
{
  name = 'AddEmailVerificationPurpose1710000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD COLUMN "purpose" varchar(20) NOT NULL DEFAULT 'registration'`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD CONSTRAINT "CHK_email_verifications_purpose" CHECK ("purpose" IN ('registration', 'login'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verifications" DROP CONSTRAINT "CHK_email_verifications_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" DROP COLUMN "purpose"`,
    );
  }
}
