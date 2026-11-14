import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBanner1710000014000 implements MigrationInterface {
  name = 'AddUserBanner1710000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "bannerUrl" varchar(2048)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_value"`,
    );
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
        ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL AND "postId" IS NULL)
        OR
        ("purpose" = 'BANNER' AND "conversationId" IS NULL AND "messageId" IS NULL AND "postId" IS NULL)
        OR
        ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL AND "postId" IS NULL)
        OR
        ("purpose" = 'POST' AND "conversationId" IS NULL AND "messageId" IS NULL)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_value"
      CHECK ("purpose" IN ('PROFILE', 'BANNER', 'CHAT', 'POST'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "bannerUrl" = NULL WHERE "bannerUrl" IS NOT NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "media_assets" WHERE "purpose" = 'BANNER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_value"`,
    );
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
        ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL AND "postId" IS NULL)
        OR
        ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL AND "postId" IS NULL)
        OR
        ("purpose" = 'POST' AND "conversationId" IS NULL AND "messageId" IS NULL)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_value"
      CHECK ("purpose" IN ('PROFILE', 'CHAT', 'POST'))
    `);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "bannerUrl"`,
    );
  }
}
