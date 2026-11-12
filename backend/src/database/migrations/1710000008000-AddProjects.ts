import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjects1710000008000 implements MigrationInterface {
  name = 'AddProjects1710000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "project_status" AS ENUM ('PLANNING', 'ACTIVE', 'MAINTENANCE', 'ARCHIVED')
    `);
    await queryRunner.query(`
      CREATE TYPE "project_member_role" AS ENUM ('OWNER', 'MAINTAINER', 'MEMBER')
    `);
    await queryRunner.query(`
      CREATE TYPE "project_task_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'REVIEW', 'DONE')
    `);
    await queryRunner.query(`
      CREATE TYPE "project_contribution_type" AS ENUM ('HELP_OFFERED', 'CONTRIBUTION')
    `);
    await queryRunner.query(`
      CREATE TYPE "project_contribution_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED')
    `);

    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(80) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "repositoryUrl" varchar(2048),
        "technologies" varchar[] NOT NULL DEFAULT ARRAY[]::varchar[],
        "isBeginnerFriendly" boolean NOT NULL DEFAULT false,
        "status" "project_status" NOT NULL DEFAULT 'PLANNING',
        "ownerId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_projects_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_projects_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_projects_owner_created" ON "projects" ("ownerId", "createdAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "project_member_role" NOT NULL DEFAULT 'MEMBER',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_members_project_user" UNIQUE ("projectId", "userId"),
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "title" varchar(120) NOT NULL,
        "description" text NOT NULL,
        "acceptanceCriteria" varchar[] NOT NULL DEFAULT ARRAY[]::varchar[],
        "status" "project_task_status" NOT NULL DEFAULT 'OPEN',
        "isBeginnerFriendly" boolean NOT NULL DEFAULT false,
        "assignedUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_tasks_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_tasks_assigned_user" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_project_tasks_project_status" ON "project_tasks" ("projectId", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_contributions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "taskId" uuid,
        "userId" uuid NOT NULL,
        "type" "project_contribution_type" NOT NULL DEFAULT 'HELP_OFFERED',
        "message" text NOT NULL,
        "status" "project_contribution_status" NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_contributions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_contributions_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_contributions_task" FOREIGN KEY ("taskId") REFERENCES "project_tasks"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_project_contributions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_project_contributions_project_user" ON "project_contributions" ("projectId", "userId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_project_contributions_project_user"`);
    await queryRunner.query(`DROP TABLE "project_contributions"`);
    await queryRunner.query(`DROP INDEX "IDX_project_tasks_project_status"`);
    await queryRunner.query(`DROP TABLE "project_tasks"`);
    await queryRunner.query(`DROP TABLE "project_members"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_owner_created"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "project_contribution_status"`);
    await queryRunner.query(`DROP TYPE "project_contribution_type"`);
    await queryRunner.query(`DROP TYPE "project_task_status"`);
    await queryRunner.query(`DROP TYPE "project_member_role"`);
    await queryRunner.query(`DROP TYPE "project_status"`);
  }
}
