import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowPasswordResetVerificationPurpose1710000012000
  implements MigrationInterface
{
  name = 'AllowPasswordResetVerificationPurpose1710000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verifications" DROP CONSTRAINT "CHK_email_verifications_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD CONSTRAINT "CHK_email_verifications_purpose" CHECK ("purpose" IN ('registration', 'login', 'password-reset'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "email_verifications" WHERE "purpose" = 'password-reset'`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" DROP CONSTRAINT "CHK_email_verifications_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD CONSTRAINT "CHK_email_verifications_purpose" CHECK ("purpose" IN ('registration', 'login'))`,
    );
  }
}
