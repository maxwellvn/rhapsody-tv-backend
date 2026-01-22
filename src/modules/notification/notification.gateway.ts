import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { WsJwtPayload } from '../../common/guards/ws-jwt-auth.guard';

interface AuthenticatedSocket extends Socket {
  data: {
    user: WsJwtPayload;
  };
}

// WebSocket event names for notifications
export const NOTIFICATION_WS_EVENTS = {
  // Server -> Client
  NEW_NOTIFICATION: 'newNotification',
  NOTIFICATION_READ: 'notificationRead',
  ALL_NOTIFICATIONS_READ: 'allNotificationsRead',
  NOTIFICATION_DELETED: 'notificationDeleted',
  UNREAD_COUNT: 'unreadCount',
  ERROR: 'error',
} as const;

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  
  // Map of userId to socket IDs (a user can have multiple connections)
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.emit(NOTIFICATION_WS_EVENTS.ERROR, { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<WsJwtPayload>(token);
      client.data.user = payload;

      // Track user socket
      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room for targeted notifications
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
      client.emit(NOTIFICATION_WS_EVENTS.ERROR, { message: 'Invalid authentication token' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data?.user?.sub;

    if (userId) {
      // Remove socket from tracking
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  // ==================== Methods for sending notifications ====================

  /**
   * Send a new notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_WS_EVENTS.NEW_NOTIFICATION, notification);
    this.logger.log(`Sent notification to user ${userId}`);
  }

  /**
   * Send updated unread count to a specific user
   */
  sendUnreadCountToUser(userId: string, count: number): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_WS_EVENTS.UNREAD_COUNT, { count });
  }

  /**
   * Notify user that a notification was marked as read
   */
  sendNotificationReadToUser(userId: string, notificationId: string): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_WS_EVENTS.NOTIFICATION_READ, { notificationId });
  }

  /**
   * Notify user that all notifications were marked as read
   */
  sendAllNotificationsReadToUser(userId: string): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_WS_EVENTS.ALL_NOTIFICATIONS_READ, {});
  }

  /**
   * Notify user that a notification was deleted
   */
  sendNotificationDeletedToUser(userId: string, notificationId: string): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_WS_EVENTS.NOTIFICATION_DELETED, { notificationId });
  }

  /**
   * Broadcast notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: any): void {
    for (const userId of userIds) {
      this.sendNotificationToUser(userId, notification);
    }
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification: any): void {
    this.server.emit(NOTIFICATION_WS_EVENTS.NEW_NOTIFICATION, notification);
    this.logger.log(`Broadcast notification to all connected users`);
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
