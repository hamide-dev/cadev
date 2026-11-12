import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCloudinaryMedia1710000001000 implements MigrationInterface {
  name = 'AddCloudinaryMedia1710000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "message_type" ADD VALUE 'MEDIA'`);
    await queryRunner.query(
      `CREATE TYPE "media_purpose" AS ENUM ('PROFILE', 'CHAT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "media_resource_type" AS ENUM ('image', 'video')`,
    );
    await queryRunner.query(`
      CREATE TABLE "media_assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerId" uuid NOT NULL,
        "purpose" "media_purpose" NOT NULL,
        "resourceType" "media_resource_type" NOT NULL,
        "cloudPublicId" varchar(512) NOT NULL,
        "format" varchar(20) NOT NULL,
        "bytes" integer NOT NULL,
        "publicUrl" varchar(2048),
        "conversationId" uuid,
        "messageId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_assets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_media_assets_cloud_public_id" UNIQUE ("cloudPublicId"),
        CONSTRAINT "FK_media_assets_owner" FOREIGN KEY ("ownerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_media_assets_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_media_assets_message" FOREIGN KEY ("messageId")
          REFERENCES "messages"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_media_assets_bytes" CHECK ("bytes" > 0),
        CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
          ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL)
          OR
          ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_media_assets_chat_owner" ON "media_assets" ("conversationId", "ownerId", "messageId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "media_assets"`);
    await queryRunner.query(`DROP TYPE "media_resource_type"`);
    await queryRunner.query(`DROP TYPE "media_purpose"`);
    await queryRunner.query(
      `ALTER TYPE "message_type" RENAME TO "message_type_with_media"`,
    );
    await queryRunner.query(
      `CREATE TYPE "message_type" AS ENUM ('TEXT', 'CODE', 'LINK')`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "type" TYPE "message_type" USING "type"::text::"message_type"`,
    );
    await queryRunner.query(`DROP TYPE "message_type_with_media"`);
  }
}
