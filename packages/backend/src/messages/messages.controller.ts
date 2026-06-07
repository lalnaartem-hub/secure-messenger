import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';

@Controller('chats/:chatId/messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** Keyset pagination: pass ?beforeAt=&beforeId= cursor for infinite scroll. */
  @Get()
  history(
    @Param('chatId') chatId: string,
    @Query('beforeAt') beforeAt?: string,
    @Query('beforeId') beforeId?: string,
    @Query('limit') limit?: string,
  ) {
    const before = beforeAt && beforeId ? { createdAt: beforeAt, id: beforeId } : undefined;
    return this.messages.history(chatId, before, limit ? Number(limit) : 50);
  }
}
