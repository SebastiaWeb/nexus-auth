import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NexusAuthGuard, CurrentUser, CurrentUserId } from '@nexusauth/nestjs-helpers';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(NexusAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUserId() userId: string, @Body() data: any) {
    const updated = await this.usersService.updateProfile(userId, data);
    return { user: updated };
  }
}
