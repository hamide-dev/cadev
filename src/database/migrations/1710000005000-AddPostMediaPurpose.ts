import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostMediaPurpose1710000005000 implements MigrationInterface {
  name = 'AddPostMediaPurpose1710000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ALTER COLUMN "purpose" TYPE varchar(20)
      USING "purpose"::text
    `);
    await queryRunner.query(`DROP TYPE "media_purpose"`);
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
        ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL)
        OR ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
    );
    await queryRunner.query(
      `CREATE TYPE "media_purpose" AS ENUM ('PROFILE', 'CHAT')`,
    );
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ALTER COLUMN "purpose" TYPE "media_purpose"
      USING "purpose"::text::"media_purpose"
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
        ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL)
        OR ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL)
      )
    `);
  }
}
