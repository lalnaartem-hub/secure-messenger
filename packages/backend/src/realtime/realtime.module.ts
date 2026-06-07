import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { PresenceService } from '../presence/presence.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    MessagesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-prod',
    }),
  ],
  providers: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
