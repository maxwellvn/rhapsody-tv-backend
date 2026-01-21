import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  WsJwtAuthGuard,
  WsJwtPayload,
} from '../../../common/guards/ws-jwt-auth.guard';
import {
  LivestreamChatService,
  CommentWithUser,
} from '../services/livestream-chat.service';
import { LivestreamViewerService } from '../services/livestream-viewer.service';
import {
  SendCommentDto,
  BanUserDto,
  JoinLivestreamDto,
  DeleteCommentDto,
} from '../dto';
import { Role } from '../../../shared/enums/role.enum';

interface AuthenticatedSocket extends Socket {
  data: {
    user: WsJwtPayload;
    currentLivestreamId?: string;
  };
}

// WebSocket event names
const WS_EVENTS = {
  // Client -> Server
  JOIN_LIVESTREAM: 'joinLivestream',
  LEAVE_LIVESTREAM: 'leaveLivestream',
  SEND_COMMENT: 'sendComment',
  DELETE_COMMENT: 'deleteComment',
  BAN_USER: 'banUser',
  UNBAN_USER: 'unbanUser',

  // Server -> Client
  NEW_COMMENT: 'newComment',
  COMMENT_DELETED: 'commentDeleted',
  VIEWER_COUNT: 'viewerCount',
  COMMENT_HISTORY: 'commentHistory',
  USER_BANNED: 'userBanned',
  USER_UNBANNED: 'userUnbanned',
  ERROR: 'error',
} as const;

@WebSocketGateway({
  namespace: '/livestream',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class LivestreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LivestreamGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: LivestreamChatService,
    private readonly viewerService: LivestreamViewerService,
  ) {}

  /**
   * Handle new WebSocket connection
   * Authenticate the user via JWT from handshake
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connection rejected: No token provided`,
        );
        client.emit(WS_EVENTS.ERROR, { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<WsJwtPayload>(token);
      client.data.user = payload;

      this.logger.log(`Client ${client.id} connected as user ${payload.sub}`);
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} connection rejected: Invalid token`,
      );
      client.emit(WS_EVENTS.ERROR, { message: 'Invalid authentication token' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   * Clean up viewer tracking
   */
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data?.user?.sub;
    const livestreamId = client.data?.currentLivestreamId;

    if (userId && livestreamId) {
      const viewerCount = await this.viewerService.removeViewer(
        livestreamId,
        userId,
      );
      this.broadcastViewerCount(livestreamId, viewerCount);
      this.logger.log(
        `User ${userId} disconnected from livestream ${livestreamId}`,
      );
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Join a livestream room
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.JOIN_LIVESTREAM)
  async handleJoinLivestream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinLivestreamDto,
  ): Promise<void> {
    const userId = client.data.user.sub;
    const { livestreamId } = data;

    // Validate livestream exists and chat is enabled
    const livestreamInfo =
      await this.chatService.isLivestreamValid(livestreamId);

    if (!livestreamInfo.exists) {
      throw new WsException('Livestream not found');
    }

    if (!livestreamInfo.chatEnabled) {
      throw new WsException('Chat is disabled for this livestream');
    }

    // Check if user is banned
    const isBanned = await this.chatService.isUserBanned(livestreamId, userId);
    if (isBanned) {
      throw new WsException('You are banned from this livestream chat');
    }

    // Leave previous livestream if any
    if (
      client.data.currentLivestreamId &&
      client.data.currentLivestreamId !== livestreamId
    ) {
      await this.handleLeaveLivestream(client, {
        livestreamId: client.data.currentLivestreamId,
      });
    }

    // Join the room
    const roomName = this.getRoomName(livestreamId);
    await client.join(roomName);
    client.data.currentLivestreamId = livestreamId;

    // Add to viewer tracking
    const viewerCount = await this.viewerService.addViewer(
      livestreamId,
      userId,
    );

    // Broadcast updated viewer count to all in room
    this.broadcastViewerCount(livestreamId, viewerCount);

    // Send recent comment history to the joining user
    const recentComments = await this.chatService.getRecentComments(
      livestreamId,
      50,
    );
    client.emit(WS_EVENTS.COMMENT_HISTORY, { comments: recentComments });

    this.logger.log(`User ${userId} joined livestream ${livestreamId}`);
  }

  /**
   * Leave a livestream room
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.LEAVE_LIVESTREAM)
  async handleLeaveLivestream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinLivestreamDto,
  ): Promise<void> {
    const userId = client.data.user.sub;
    const { livestreamId } = data;

    const roomName = this.getRoomName(livestreamId);
    await client.leave(roomName);

    if (client.data.currentLivestreamId === livestreamId) {
      client.data.currentLivestreamId = undefined;
    }

    // Remove from viewer tracking
    const viewerCount = await this.viewerService.removeViewer(
      livestreamId,
      userId,
    );
    this.broadcastViewerCount(livestreamId, viewerCount);

    this.logger.log(`User ${userId} left livestream ${livestreamId}`);
  }

  /**
   * Send a comment to a livestream
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.SEND_COMMENT)
  async handleSendComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendCommentDto,
  ): Promise<void> {
    const userId = client.data.user.sub;
    const { livestreamId, content, parentCommentId } = data;

    // Validate livestream
    const livestreamInfo =
      await this.chatService.isLivestreamValid(livestreamId);

    if (!livestreamInfo.exists) {
      throw new WsException('Livestream not found');
    }

    if (!livestreamInfo.chatEnabled) {
      throw new WsException('Chat is disabled for this livestream');
    }

    // Check if user is banned
    const isBanned = await this.chatService.isUserBanned(livestreamId, userId);
    if (isBanned) {
      throw new WsException('You are banned from this livestream chat');
    }

    // Create the comment
    const comment = await this.chatService.createComment(
      livestreamId,
      userId,
      content,
      parentCommentId,
    );

    // Broadcast to all users in the room
    this.broadcastNewComment(livestreamId, comment);

    this.logger.log(
      `User ${userId} sent comment in livestream ${livestreamId}`,
    );
  }

  /**
   * Delete a comment (admin/moderator only)
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.DELETE_COMMENT)
  async handleDeleteComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: DeleteCommentDto,
  ): Promise<void> {
    const { commentId } = data;
    const userRoles = client.data.user.roles;

    // Only admins can delete comments
    if (!userRoles.includes(Role.ADMIN)) {
      throw new WsException('Only administrators can delete comments');
    }

    // Get the comment to find the livestream ID
    const comment = await this.chatService.getCommentById(commentId);
    if (!comment) {
      throw new WsException('Comment not found');
    }

    // Delete the comment
    await this.chatService.deleteComment(commentId);

    // Broadcast deletion to all users in the room
    const livestreamId = comment.liveStreamId.toString();
    this.broadcastCommentDeleted(livestreamId, commentId);

    this.logger.log(
      `Comment ${commentId} deleted by admin ${client.data.user.sub}`,
    );
  }

  /**
   * Ban a user from a livestream chat (admin only)
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.BAN_USER)
  async handleBanUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: BanUserDto,
  ): Promise<void> {
    const { livestreamId, userId: targetUserId } = data;
    const userRoles = client.data.user.roles;
    const adminUserId = client.data.user.sub;

    // Only admins can ban users
    if (!userRoles.includes(Role.ADMIN)) {
      throw new WsException('Only administrators can ban users');
    }

    // Ban the user
    await this.chatService.banUser(livestreamId, targetUserId, adminUserId);

    // Notify the banned user
    this.notifyUserBanned(livestreamId, targetUserId);

    // Force disconnect the banned user from the room
    await this.disconnectUserFromRoom(livestreamId, targetUserId);

    this.logger.log(
      `User ${targetUserId} banned from livestream ${livestreamId} by admin ${adminUserId}`,
    );
  }

  /**
   * Unban a user from a livestream chat (admin only)
   */
  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WS_EVENTS.UNBAN_USER)
  async handleUnbanUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: BanUserDto,
  ): Promise<void> {
    const { livestreamId, userId: targetUserId } = data;
    const userRoles = client.data.user.roles;

    // Only admins can unban users
    if (!userRoles.includes(Role.ADMIN)) {
      throw new WsException('Only administrators can unban users');
    }

    // Unban the user
    await this.chatService.unbanUser(livestreamId, targetUserId);

    this.logger.log(
      `User ${targetUserId} unbanned from livestream ${livestreamId} by admin ${client.data.user.sub}`,
    );
  }

  // ==================== Helper Methods ====================

  /**
   * Get room name for a livestream
   */
  private getRoomName(livestreamId: string): string {
    return `livestream:${livestreamId}`;
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try auth object first (recommended approach)
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Fallback to query parameter
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    // Fallback to Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Broadcast viewer count to all users in a livestream room
   */
  private broadcastViewerCount(livestreamId: string, count: number): void {
    const roomName = this.getRoomName(livestreamId);
    this.server.to(roomName).emit(WS_EVENTS.VIEWER_COUNT, { count });
  }

  /**
   * Broadcast a new comment to all users in a livestream room
   */
  private broadcastNewComment(
    livestreamId: string,
    comment: CommentWithUser,
  ): void {
    const roomName = this.getRoomName(livestreamId);
    this.server.to(roomName).emit(WS_EVENTS.NEW_COMMENT, comment);
  }

  /**
   * Broadcast comment deletion to all users in a livestream room
   */
  private broadcastCommentDeleted(
    livestreamId: string,
    commentId: string,
  ): void {
    const roomName = this.getRoomName(livestreamId);
    this.server.to(roomName).emit(WS_EVENTS.COMMENT_DELETED, { commentId });
  }

  /**
   * Notify a specific user that they have been banned
   */
  private notifyUserBanned(livestreamId: string, userId: string): void {
    // Find sockets belonging to this user in the room
    const roomName = this.getRoomName(livestreamId);
    const room = this.server.sockets.adapter.rooms.get(roomName);

    if (room) {
      for (const socketId of room) {
        const socket = this.server.sockets.sockets.get(socketId) as
          | AuthenticatedSocket
          | undefined;
        if (socket && socket.data?.user?.sub === userId) {
          socket.emit(WS_EVENTS.USER_BANNED, { livestreamId });
        }
      }
    }
  }

  /**
   * Disconnect a user from a specific room
   */
  private async disconnectUserFromRoom(
    livestreamId: string,
    userId: string,
  ): Promise<void> {
    const roomName = this.getRoomName(livestreamId);
    const room = this.server.sockets.adapter.rooms.get(roomName);

    if (room) {
      for (const socketId of room) {
        const socket = this.server.sockets.sockets.get(socketId) as
          | AuthenticatedSocket
          | undefined;
        if (socket && socket.data?.user?.sub === userId) {
          await socket.leave(roomName);
          socket.data.currentLivestreamId = undefined;

          // Remove from viewer tracking
          const viewerCount = await this.viewerService.removeViewer(
            livestreamId,
            userId,
          );
          this.broadcastViewerCount(livestreamId, viewerCount);
        }
      }
    }
  }
}
