import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshSessions1710000011000 implements MigrationInterface {
  name = 'AddRefreshSessions1710000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "refresh_sessions" (
      "id" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "tokenHash" character varying(64) NOT NULL,
      "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_expires_at" ON "refresh_sessions" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_refresh_sessions_expires_at"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_refresh_sessions_user_id"`);
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
  }
}
