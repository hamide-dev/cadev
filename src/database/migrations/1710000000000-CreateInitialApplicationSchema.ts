import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialApplicationSchema1710000000000 implements MigrationInterface {
  name = 'CreateInitialApplicationSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "post_type" AS ENUM ('ARTICLE', 'QUESTION', 'PROJECT_LAUNCH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "conversation_type" AS ENUM ('DIRECT', 'GROUP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "message_type" AS ENUM ('TEXT', 'CODE', 'LINK')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL,
        "username" varchar(30) NOT NULL,
        "displayName" varchar(80) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "bio" text,
        "avatarUrl" varchar(2048),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "post_type" NOT NULL,
        "content" text NOT NULL,
        "codeSnippet" text,
        "tags" varchar[] NOT NULL DEFAULT ARRAY[]::varchar[],
        "authorId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_posts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_posts_author" FOREIGN KEY ("authorId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_created_id" ON "posts" ("createdAt", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_author_created" ON "posts" ("authorId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "postId" uuid NOT NULL,
        "parentCommentId" uuid,
        "content" text NOT NULL,
        "authorId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_post" FOREIGN KEY ("postId")
          REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parentCommentId")
          REFERENCES "comments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_comments_author" FOREIGN KEY ("authorId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_comments_post_created" ON "comments" ("postId", "createdAt", "id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "conversation_type" NOT NULL,
        "name" varchar(100),
        "directKey" varchar(73),
        "createdById" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_conversations_direct_key" UNIQUE ("directKey"),
        CONSTRAINT "FK_conversations_creator" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "conversation_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "isAdmin" boolean NOT NULL DEFAULT false,
        "joinedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_conversation_members_pair" UNIQUE ("conversationId", "userId"),
        CONSTRAINT "FK_conversation_members_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversation_members_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_members_user" ON "conversation_members" ("userId", "joinedAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "parentMessageId" uuid,
        "type" "message_type" NOT NULL,
        "content" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_parent" FOREIGN KEY ("parentMessageId")
          REFERENCES "messages"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_created" ON "messages" ("conversationId", "createdAt", "id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversation_members"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "message_type"`);
    await queryRunner.query(`DROP TYPE "conversation_type"`);
    await queryRunner.query(`DROP TYPE "post_type"`);
  }
}
