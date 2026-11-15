import type { MigrationInterface, QueryRunner } from 'typeorm';

// « Vibe coding » : développer en pilotant des outils d'IA.
// ADD VALUE est accepté dans une transaction depuis PostgreSQL 12 (la valeur n'est simplement pas utilisée ici).
export class AddVibeCodingSpecialty1710000016000 implements MigrationInterface {
  name = 'AddVibeCodingSpecialty1710000016000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "developer_specialty" ADD VALUE IF NOT EXISTS 'VIBE_CODING'`);
  }

  async down(): Promise<void> {
    // PostgreSQL ne sait pas retirer une valeur d'un type énuméré : la valeur reste, inutilisée.
  }
}
