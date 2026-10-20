import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../../common/auth/auth-user.js';
import type { Environment } from '../../../config/environment.js';
import { MessagingService } from '../application/messaging.service.js';
import type {
  PublicConversation,
  PublicMessage,
} from '../domain/messaging.types.js';
import { MediaService } from '../../media/application/media.service.js';
import type {
  PublicMessageMedia,
  UploadSignature,
} from '../../media/domain/media.types.js';
import { ChatUploadDto } from '../../media/presentation/dto/chat-upload.dto.js';
import { ConfirmChatUploadDto } from '../../media/presentation/dto/confirm-chat-upload.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { ConversationIdDto } from './dto/conversation-id.dto.js';
import { MessageHistoryDto } from './dto/message-history.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

type AuthenticatedSocket = Socket & {
  data: { userId: string; email: string };
};

@WebSocketGateway({
  namespace: '/messaging',
  cors: { origin: true, credentials: false },
})
export class MessagingGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const origin = socket.handshake.headers.origin;
      const allowedOrigins = this.config
        .get('CORS_ORIGINS', { infer: true })
        .split(',')
        .map((item) => item.trim());
      if (origin && !allowedOrigins.includes(origin)) {
        next(new Error('ORIGIN_NOT_ALLOWED'));
        return;
      }
      const token = socket.handshake.auth.token;
      if (typeof token !== 'string') {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      void this.jwtService
        .verifyAsync<AccessTokenPayload>(token)
        .then(async (payload) => {
          if (!payload.sub || !payload.email) {
            next(new Error('UNAUTHENTICATED'));
            return;
          }
          socket.data.userId = payload.sub;
          socket.data.email = payload.email;
          await socket.join(`user:${payload.sub}`);
          next();
        })
        .catch(() => next(new Error('UNAUTHENTICATED')));
    });
  }

  @SubscribeMessage('conversation:create')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: CreateConversationDto,
  ): Promise<PublicConversation> {
    const conversation = await this.messagingService.createConversation(
      socket.data.userId,
      input,
    );
    await socket.join(`conversation:${conversation.id}`);
    for (const member of conversation.members) {
      if (member.id !== socket.data.userId) {
        this.server
          .to(`user:${member.id}`)
          .emit('conversation:created', conversation);
      }
    }
    return conversation;
  }

  @SubscribeMessage('media:upload-signature')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createChatUploadSignature(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ChatUploadDto,
  ): Promise<UploadSignature> {
    return this.mediaService.createChatUploadSignature(
      socket.data.userId,
      input.conversationId,
      input.resourceType,
    );
  }

  @SubscribeMessage('media:confirm')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async confirmChatUpload(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ConfirmChatUploadDto,
  ): Promise<PublicMessageMedia> {
    const media = await this.mediaService.confirmChatUpload(
      socket.data.userId,
      input.conversationId,
      input.publicId,
      input.resourceType,
    );
    socket.emit('media:uploaded', media);
    return media;
  }

  @SubscribeMessage('conversation:list')
  async listConversations(
    @ConnectedSocket() socket: AuthenticatedSocket,
  ): Promise<PublicConversation[]> {
    return this.messagingService.listConversations(socket.data.userId);
  }

  @SubscribeMessage('conversation:join')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async joinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ConversationIdDto,
  ): Promise<{ joined: true; conversationId: string }> {
    await this.messagingService.assertMember(
      input.conversationId,
      socket.data.userId,
    );
    await socket.join(`conversation:${input.conversationId}`);
    return { joined: true, conversationId: input.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async leaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ConversationIdDto,
  ): Promise<{ left: true; conversationId: string }> {
    await this.messagingService.assertMember(
      input.conversationId,
      socket.data.userId,
    );
    await socket.leave(`conversation:${input.conversationId}`);
    return { left: true, conversationId: input.conversationId };
  }

  @SubscribeMessage('message:history')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  history(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: MessageHistoryDto,
  ): Promise<PublicMessage[]> {
    return this.messagingService.history(socket.data.userId, input);
  }

  @SubscribeMessage('message:send')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async send(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: SendMessageDto,
  ): Promise<PublicMessage> {
    const message = await this.messagingService.send(socket.data.userId, input);
    this.server
      .to(`conversation:${input.conversationId}`)
      .emit('message:created', message);
    return message;
  }

  @SubscribeMessage('typing:start')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async typingStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ConversationIdDto,
  ): Promise<{ typing: true }> {
    await this.messagingService.assertMember(
      input.conversationId,
      socket.data.userId,
    );
    socket
      .to(`conversation:${input.conversationId}`)
      .emit('typing:started', { userId: socket.data.userId });
    return { typing: true };
  }

  @SubscribeMessage('typing:stop')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async typingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() input: ConversationIdDto,
  ): Promise<{ typing: false }> {
    await this.messagingService.assertMember(
      input.conversationId,
      socket.data.userId,
    );
    socket
      .to(`conversation:${input.conversationId}`)
      .emit('typing:stopped', { userId: socket.data.userId });
    return { typing: false };
  }
}
