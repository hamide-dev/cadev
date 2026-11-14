import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialNotificationTypes1710000011000
  implements MigrationInterface
{
  name = 'AddSocialNotificationTypes1710000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'LIKE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'COMMENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'REPLY'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" IN ('LIKE', 'COMMENT', 'REPLY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "notification_type_old" AS ENUM ('MENTION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "notification_type_old" USING "type"::text::"notification_type_old"`,
    );
    await queryRunner.query(`DROP TYPE "notification_type"`);
    await queryRunner.query(
      `ALTER TYPE "notification_type_old" RENAME TO "notification_type"`,
    );
  }
}
