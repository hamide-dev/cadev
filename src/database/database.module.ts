import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Environment } from '../config/environment.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL', { infer: true }),
        ssl: config.get('DATABASE_SSL', { infer: true })
          ? { rejectUnauthorized: true }
          : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        retryAttempts: 5,
        retryDelay: 2000,
        logging: false,
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
  ],
})
export class DatabaseModule {}
