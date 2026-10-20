import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import { UsersService } from '../application/users.service.js';
import type { PublicUser } from '../domain/user.types.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

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
}
