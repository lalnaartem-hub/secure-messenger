import { Controller, Get, Param, Req, UseGuards, Patch, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() body: { displayName?: string; avatarUrl?: string }) {
    return this.users.updateProfile(req.user.userId, body);
  }

  @Get()
  list(@Req() req: any) {
    return this.users.listAll(req.user.userId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.getPublicProfile(id);
  }
}
