import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment.js';

const environment = validateEnvironment(process.env);

export default new DataSource({
  type: 'postgres',
  url: environment.DATABASE_URL,
  ssl: environment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
  entities: ['dist/modules/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});
