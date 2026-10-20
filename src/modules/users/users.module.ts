import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { UsersService } from './application/users.service.js';
import { UserEntity } from './infrastructure/user.entity.js';
import { UserFollowEntity } from './infrastructure/user-follow.entity.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserFollowEntity]),
    SecurityModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
