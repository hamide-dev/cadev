import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionsAndGitHubPreview1710000007000
  implements MigrationInterface
{
  name = 'AddQuestionsAndGitHubPreview1710000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "comment_votes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "commentId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_votes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_comment_votes_user_comment" UNIQUE ("userId", "commentId"),
        CONSTRAINT "FK_comment_votes_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_votes_comment" FOREIGN KEY ("commentId")
          REFERENCES "comments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_comment_votes_comment" ON "comment_votes" ("commentId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "comment_mentions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "commentId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_mentions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_comment_mentions_user_comment" UNIQUE ("userId", "commentId"),
        CONSTRAINT "FK_comment_mentions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_mentions_comment" FOREIGN KEY ("commentId")
          REFERENCES "comments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_comment_mentions_user" ON "comment_mentions" ("userId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "question_follows" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "postId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_follows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_question_follows_user_post" UNIQUE ("userId", "postId"),
        CONSTRAINT "FK_question_follows_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_question_follows_post" FOREIGN KEY ("postId")
          REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_question_follows_post" ON "question_follows" ("postId", "createdAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "github_repo_previews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner" varchar(100) NOT NULL,
        "name" varchar(100) NOT NULL,
        "fullName" varchar(201) NOT NULL,
        "description" text,
        "language" varchar(100),
        "stars" integer NOT NULL,
        "forks" integer NOT NULL,
        "openIssues" integer NOT NULL,
        "htmlUrl" varchar(2048) NOT NULL,
        "ogImageUrl" varchar(2048) NOT NULL,
        "etag" varchar(255),
        "fetchedAt" timestamptz NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_github_repo_previews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_github_repo_previews_full_name" UNIQUE ("fullName"),
        CONSTRAINT "CHK_github_repo_previews_counts" CHECK ("stars" >= 0 AND "forks" >= 0 AND "openIssues" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_github_repo_previews_expires_at" ON "github_repo_previews" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_github_repo_previews_expires_at"`);
    await queryRunner.query(`DROP TABLE "github_repo_previews"`);
    await queryRunner.query(`DROP INDEX "IDX_question_follows_post"`);
    await queryRunner.query(`DROP TABLE "question_follows"`);
    await queryRunner.query(`DROP INDEX "IDX_comment_mentions_user"`);
    await queryRunner.query(`DROP TABLE "comment_mentions"`);
    await queryRunner.query(`DROP INDEX "IDX_comment_votes_comment"`);
    await queryRunner.query(`DROP TABLE "comment_votes"`);
  }
}
