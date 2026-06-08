import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { PresenceService } from '../presence/presence.service';
import { MessagesService } from '../messages/messages.service';

/**
 * Single WS gateway. JWT is validated during the handshake; unauthenticated
 * sockets are disconnected immediately.
 */
@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly presence: PresenceService,
    private readonly messages: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers.authorization?.replace('Bearer ', '') as string);
      const payload = this.jwt.verify(token);
      client.data.userId = payload.sub;
      await this.presence.addSocket(payload.sub, client.id);
      // join a personal room for direct addressing across nodes
      client.join(`user:${payload.sub}`);
      this.server.emit('presence:update', { userId: payload.sub, online: true });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const { userId, stillOnline } = await this.presence.removeSocket(client.id);
    if (userId && !stillOnline) {
      this.server.emit('presence:update', { userId, online: false });
    }
  }

  @SubscribeMessage('heartbeat')
  async onHeartbeat(@ConnectedSocket() client: Socket) {
    await this.presence.heartbeat(client.data.userId);
  }

  @SubscribeMessage('chat:join')
  onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { chatId: string }) {
    client.join(`chat:${body.chatId}`);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  async onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { chatId: string }) {
    await this.presence.setTyping(body.chatId, client.data.userId);
    client.to(`chat:${body.chatId}`).emit('typing', {
      chatId: body.chatId,
      userId: client.data.userId,
    });
  }

  /**
   * Receives ALREADY-ENCRYPTED payloads. The server only routes ciphertext.
   * Idempotency is enforced by (chatId, senderId, clientMsgId) in Postgres.
   */
  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      chatId: string;
      clientMsgId: string;
      ciphertext: string;
      cryptoEnvelope: Record<string, unknown>;
      kind?: 'text' | 'image' | 'file';
      replyToId?: string;
    },
  ) {
    const saved = await this.messages.persist({
      chatId: body.chatId,
      senderId: client.data.userId,
      clientMsgId: body.clientMsgId,
      ciphertext: body.ciphertext,
      cryptoEnvelope: body.cryptoEnvelope,
      kind: body.kind ?? 'text',
      replyToId: body.replyToId,
    });

    // Fan out ciphertext to the chat room (delivered to other devices/nodes via Redis adapter).
    this.server.to(`chat:${body.chatId}`).emit('message:new', saved);

    // Server ACK back to sender (Sent). Recipient devices send their own delivered/read ACKs.
    return { ack: true, id: saved.id, clientMsgId: body.clientMsgId, createdAt: saved.createdAt };
  }

  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string; messageId: string },
  ) {
    await this.messages.markRead(body.messageId, client.data.userId);
    client.to(`chat:${body.chatId}`).emit('message:read', {
      messageId: body.messageId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('message:react')
  async onReact(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string; messageId: string; reaction: string },
  ) {
    const res = await this.messages.react(body.messageId, client.data.userId, body.reaction);
    if (res) {
      this.server.to(`chat:${body.chatId}`).emit('message:reaction', {
        chatId: body.chatId,
        messageId: body.messageId,
        reactions: res.reactions,
      });
    }
  }

  @SubscribeMessage('message:edit')
  async onEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      chatId: string;
      messageId: string;
      ciphertext: string;
      cryptoEnvelope: Record<string, unknown>;
    },
  ) {
    const updated = await this.messages.edit(
      body.messageId,
      client.data.userId,
      body.ciphertext,
      body.cryptoEnvelope,
    );
    if (updated) {
      this.server.to(`chat:${body.chatId}`).emit('message:edit', updated);
    }
  }

  @SubscribeMessage('message:delete')
  async onDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string; messageId: string },
  ) {
    const res = await this.messages.delete(body.messageId, client.data.userId);
    if (res) {
      this.server.to(`chat:${body.chatId}`).emit('message:delete', {
        chatId: body.chatId,
        messageId: body.messageId,
      });
    }
  }
}

