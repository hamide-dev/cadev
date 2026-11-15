import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Ajustements de schéma sans risque, rejoués à chaque démarrage.
// La base de production n'a pas toutes ses migrations enregistrées dans la table « migrations »
// (certaines ont été appliquées à la main) : lancer « migration:run » la rejouerait et échouerait.
// Chaque requête ici est idempotente : elle ne fait rien si le changement existe déjà.
const IDEMPOTENT_CHANGES = [
  `ALTER TYPE "developer_specialty" ADD VALUE IF NOT EXISTS 'VIBE_CODING'`,
];

@Injectable()
export class SchemaGuardService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchemaGuardService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const sql of IDEMPOTENT_CHANGES) {
      try {
        await this.dataSource.query(sql);
      } catch (error) {
        // Le démarrage de l'API ne doit jamais dépendre de ces ajustements.
        this.logger.warn(`Schema adjustment skipped: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
  }
}
