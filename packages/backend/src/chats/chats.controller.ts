import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatsService } from './chats.service';

@Controller('chats')
@UseGuards(AuthGuard('jwt'))
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  list(@Req() req: any) {
    return this.chats.listForUser(req.user.userId);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: { type: 'direct' | 'group' | 'channel'; title?: string; memberIds: string[] },
  ) {
    return this.chats.create(req.user.userId, body);
  }
}
