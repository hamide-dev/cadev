import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeveloperProfilesAndFollows1710000004000
  implements MigrationInterface
{
  name = 'AddDeveloperProfilesAndFollows1710000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "developer_specialty" AS ENUM ('FRONT_END', 'BACK_END', 'FULL_STACK', 'MOBILE', 'DATA_AI', 'DEVOPS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "experience_level" AS ENUM ('LEARNING', 'JUNIOR', 'CONFIRMED', 'SENIOR')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "githubUrl" varchar(2048),
        ADD COLUMN "specialty" "developer_specialty",
        ADD COLUMN "experienceLevel" "experience_level",
        ADD COLUMN "interests" varchar[] NOT NULL DEFAULT ARRAY[]::varchar[],
        ADD COLUMN "technologies" varchar[] NOT NULL DEFAULT ARRAY[]::varchar[]
    `);
    await queryRunner.query(`
      CREATE TABLE "user_follows" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "followerId" uuid NOT NULL,
        "followedId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_follows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_follows_pair" UNIQUE ("followerId", "followedId"),
        CONSTRAINT "CHK_user_follows_not_self" CHECK ("followerId" <> "followedId"),
        CONSTRAINT "FK_user_follows_follower" FOREIGN KEY ("followerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_follows_followed" FOREIGN KEY ("followedId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_follows_followed" ON "user_follows" ("followedId", "createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_follows_followed"`);
    await queryRunner.query(`DROP TABLE "user_follows"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "technologies",
        DROP COLUMN "interests",
        DROP COLUMN "experienceLevel",
        DROP COLUMN "specialty",
        DROP COLUMN "githubUrl"
    `);
    await queryRunner.query(`DROP TYPE "experience_level"`);
    await queryRunner.query(`DROP TYPE "developer_specialty"`);
  }
}
