import type { MigrationInterface, QueryRunner } from 'typeorm';

// Notification « X s'est abonné à toi ».
export class AddFollowNotificationType1710000017000 implements MigrationInterface {
  name = 'AddFollowNotificationType1710000017000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'FOLLOW'`);
  }

  async down(): Promise<void> {
    // PostgreSQL ne sait pas retirer une valeur d'un type énuméré.
  }
}
