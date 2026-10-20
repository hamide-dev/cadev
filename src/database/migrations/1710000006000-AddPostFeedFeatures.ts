import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostFeedFeatures1710000006000 implements MigrationInterface {
  name = 'AddPostFeedFeatures1710000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" ADD COLUMN "isDraft" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD COLUMN "isPinned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_author_pinned" ON "posts" ("authorId", "isPinned")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_posts_one_pin_per_author" ON "posts" ("authorId") WHERE "isPinned" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" ADD COLUMN "postId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
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
      ADD CONSTRAINT "FK_media_assets_post" FOREIGN KEY ("postId")
      REFERENCES "posts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_value"
      CHECK ("purpose" IN ('PROFILE', 'CHAT', 'POST'))
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_media_assets_post_owner" ON "media_assets" ("postId", "ownerId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "post_likes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "postId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_post_likes_user_post" UNIQUE ("userId", "postId"),
        CONSTRAINT "FK_post_likes_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_likes_post" FOREIGN KEY ("postId")
          REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_post_likes_post" ON "post_likes" ("postId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "post_mentions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "postId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_mentions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_post_mentions_user_post" UNIQUE ("userId", "postId"),
        CONSTRAINT "FK_post_mentions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_mentions_post" FOREIGN KEY ("postId")
          REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_post_mentions_user" ON "post_mentions" ("userId", "createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_post_mentions_user"`);
    await queryRunner.query(`DROP TABLE "post_mentions"`);
    await queryRunner.query(`DROP INDEX "IDX_post_likes_post"`);
    await queryRunner.query(`DROP TABLE "post_likes"`);
    await queryRunner.query(`DROP INDEX "IDX_media_assets_post_owner"`);
    await queryRunner.query(
      `DELETE FROM "media_assets" WHERE "purpose" = 'POST'`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "FK_media_assets_post"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_purpose_scope"`,
    );
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD CONSTRAINT "CHK_media_assets_purpose_scope" CHECK (
        ("purpose" = 'PROFILE' AND "conversationId" IS NULL AND "messageId" IS NULL)
        OR ("purpose" = 'CHAT' AND "conversationId" IS NOT NULL)
      )
    `);
    await queryRunner.query(`ALTER TABLE "media_assets" DROP COLUMN "postId"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_author_pinned"`);
    await queryRunner.query(`DROP INDEX "UQ_posts_one_pin_per_author"`);
    await queryRunner.query(
      `ALTER TABLE "posts" DROP COLUMN "isPinned", DROP COLUMN "isDraft"`,
    );
  }
}
