import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { CryptoModule } from './crypto/crypto.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
    CryptoModule,
    RealtimeModule,
  ],
})
export class AppModule {}
