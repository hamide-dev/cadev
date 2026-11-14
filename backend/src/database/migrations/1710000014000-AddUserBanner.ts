import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBanner1710000014000 implements MigrationInterface {
  name = 'AddUserBanner1710000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "bannerUrl" varchar(2048)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bannerUrl"`);
  }
}
