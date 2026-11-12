import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowPasswordResetPurpose1710000011000 implements MigrationInterface {
  name = 'AllowPasswordResetPurpose1710000011000';

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
      `ALTER TABLE "email_verifications" DROP CONSTRAINT "CHK_email_verifications_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD CONSTRAINT "CHK_email_verifications_purpose" CHECK ("purpose" IN ('registration', 'login'))`,
    );
  }
}
