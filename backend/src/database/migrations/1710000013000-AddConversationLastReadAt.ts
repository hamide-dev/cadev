import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationLastReadAt1710000013000
  implements MigrationInterface
{
  name = 'AddConversationLastReadAt1710000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD "lastReadAt" timestamptz`,
    );
    await queryRunner.query(
      `UPDATE "conversation_members" SET "lastReadAt" = now()`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP COLUMN "lastReadAt"`,
    );
  }
}
