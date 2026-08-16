import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  restaurantId?: string;
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173'], credentials: true },
  namespace: '/pos',
})
export class PosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(PosGateway.name);

  handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    const restaurantId = client.handshake.auth?.restaurantId as string | undefined;
    if (!token || !restaurantId) {
      this.logger.warn('WS rejected - no token/restaurantId');
      client.disconnect(true);
      return;
    }
    client.restaurantId = restaurantId;
    client.userId = client.handshake.auth?.userId;
    client.join(`restaurant:${restaurantId}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  notifyNewAppOrder(restaurantId: string, payload: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('new-app-order', payload);
  }

  notifyOrderUpdate(restaurantId: string, payload: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('order-updated', payload);
  }

  @SubscribeMessage('ping')
  handlePing() { return { event: 'pong', data: Date.now() }; }
}
