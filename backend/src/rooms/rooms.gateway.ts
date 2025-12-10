import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket) {
    console.log("🔌 Client connected");

    client.on('message', (data) => {
      this.handleMessage(client, data.toString());
    });
  }

  handleDisconnect(client: WebSocket) {
    console.log("❌ Client disconnected");
  }

  handleMessage(client: WebSocket, data: string) {
    try {
      const message = JSON.parse(data);

      if (message.type === "join-room") {
        console.log(`👤 User ${message.userId} joined room ${message.roomId}`);
      }
    } catch (e) {
      console.error("Invalid WS message:", data);
    }
  }
}
