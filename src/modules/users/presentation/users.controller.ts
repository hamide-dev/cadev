import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import { UsersService } from '../application/users.service.js';
import type { PublicUser } from '../domain/user.types.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

class UserListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated developer profile' })
  async getMyProfile(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const profile = await this.usersService.findById(user.id);
    return this.usersService.toPublic(profile, true);
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get followed developer usernames' })
  async getFollowing(@CurrentUser() user: AuthUser): Promise<{ usernames: string[] }> {
    return { usernames: await this.usersService.followingUsernames(user.id) };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search and paginate public developer profiles' })
  list(@CurrentUser() user: AuthUser, @Query() query: UserListQueryDto) {
    return this.usersService.listUsers({
      excludeUserId: user.id,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get a public developer profile' })
  getPublicProfile(@Param('username') username: string): Promise<PublicUser> {
    return this.usersService.findPublicByUsername(username.toLowerCase());
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated developer profile' })
  updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateProfileDto,
  ): Promise<PublicUser> {
    return this.usersService.updateProfile(user.id, input);
  }

  @Put(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a developer by handle' })
  async follow(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<{ following: true }> {
    await this.usersService.follow(user.id, username);
    return { following: true };
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a developer by handle' })
  async unfollow(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ): Promise<{ following: false }> {
    await this.usersService.unfollow(user.id, username);
    return { following: false };
  }
}
