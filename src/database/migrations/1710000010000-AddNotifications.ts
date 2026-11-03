import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1710000010000 implements MigrationInterface {
  name = 'AddNotifications1710000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type" AS ENUM ('MENTION')`);
    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "recipientId" uuid NOT NULL,
      "actorId" uuid NOT NULL,
      "type" "notification_type" NOT NULL,
      "postId" uuid,
      "commentId" uuid,
      "readAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
      CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_notifications_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_created" ON "notifications" ("recipientId", "createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_recipient_created"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type"`);
  }
}
