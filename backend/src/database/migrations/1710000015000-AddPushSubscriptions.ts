import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptions1710000015000 implements MigrationInterface {
  name = 'AddPushSubscriptions1710000015000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "endpoint" varchar(2048) NOT NULL,
        "p256dh" varchar(255) NOT NULL,
        "auth" varchar(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_subscriptions_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_push_subscriptions_endpoint"
      ON "push_subscriptions" ("endpoint")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_push_subscriptions_userId"
      ON "push_subscriptions" ("userId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
  }
}
