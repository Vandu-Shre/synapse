import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

type JoinRoomMsg = { type: 'join-room'; roomId: string; userId: string };
type NodeAddMsg = { type: 'node:add'; roomId: string; userId: string; node: any };
type NodeMoveMsg = { type: 'node:move'; roomId: string; userId: string; nodeId: string; x: number; y: number };
type EdgeAddMsg = { type: 'edge:add'; roomId: string; userId: string; edge: any };
type RoomStateMsg = { type: 'room:state'; nodes: any[]; edges: any[] };

type WSMessage = JoinRoomMsg | NodeAddMsg | NodeMoveMsg | EdgeAddMsg | RoomStateMsg;

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000' },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientRoom = new Map<WebSocket, string>();
  private rooms = new Map<string, Set<WebSocket>>();
  private roomState = new Map<string, { nodes: any[]; edges: any[] }>();

  handleConnection(client: WebSocket) {
    console.log('🔌 Client connected');

    client.on('message', (data) => {
      this.handleMessage(client, data.toString());
    });
  }

  handleDisconnect(client: WebSocket) {
    const roomId = this.clientRoom.get(client);
    if (roomId) {
      this.clientRoom.delete(client);
      const set = this.rooms.get(roomId);
      if (set) {
        set.delete(client);
        if (set.size === 0) {
          this.rooms.delete(roomId);
          this.roomState.delete(roomId);
        }
      }
    }
    console.log('❌ Client disconnected');
  }

  private joinRoom(client: WebSocket, roomId: string) {
    const oldRoom = this.clientRoom.get(client);
    if (oldRoom && oldRoom !== roomId) {
      const oldSet = this.rooms.get(oldRoom);
      oldSet?.delete(client);
      if (oldSet && oldSet.size === 0) {
        this.rooms.delete(oldRoom);
        this.roomState.delete(oldRoom);
      }
    }

    this.clientRoom.set(client, roomId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomState.set(roomId, { nodes: [], edges: [] });
    }
    this.rooms.get(roomId)!.add(client);

    // Send current room state to the joining client
    const state = this.roomState.get(roomId);
    if (state) {
      console.log(`📤 Sending room state to client: ${state.nodes.length} nodes, ${state.edges.length} edges`);
      console.log(`   Nodes: ${state.nodes.map((n) => n.id).join(", ") || "none"}`);
      console.log(`   Edges: ${state.edges.map((e) => e.id).join(", ") || "none"}`);
      
      const stateMsg: RoomStateMsg = {
        type: 'room:state',
        nodes: state.nodes,
        edges: state.edges,
      };
      
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(stateMsg));
        console.log(`✅ Room state sent successfully`);
      } else {
        console.warn(`⚠️ Client not in OPEN state when sending room state`);
      }
    }
  }

  private broadcast(roomId: string, payload: WSMessage, except?: WebSocket) {
    const set = this.rooms.get(roomId);
    if (!set) return;

    const msg = JSON.stringify(payload);
    for (const c of set) {
      // Temporarily broadcast to all clients including sender for debugging
      if (c.readyState === c.OPEN) c.send(msg);
    }
  }

  private handleMessage(client: WebSocket, raw: string) {
    let message: WSMessage;

    try {
      message = JSON.parse(raw);
    } catch {
      console.error('Invalid WS JSON:', raw);
      return;
    }

    if (message.type === 'join-room') {
      this.joinRoom(client, message.roomId);
      console.log(`👤 User ${message.userId} joined room ${message.roomId}`);
      return;
    }

    const roomId = this.clientRoom.get(client);
    if (!roomId) {
      console.warn('⚠️ Message before join-room:', message.type, (message as any).roomId);
      return;
    }

    const state = this.roomState.get(roomId);
    if (!state) return;

    if (message.type === 'node:add') {
      console.log(`📦 Broadcasting node:add in room ${roomId}`, message.node.id);
      console.log(`   Before: ${state.nodes.length} nodes`);
      
      // Deduplicate: upsert instead of push
      const idx = state.nodes.findIndex((n) => n.id === message.node.id);
      if (idx === -1) {
        state.nodes.push(message.node);
      } else {
        state.nodes[idx] = message.node;
      }
      
      console.log(`   After: ${state.nodes.length} nodes`);
      console.log(`   All nodes: ${state.nodes.map((n) => n.id).join(", ")}`);
      this.broadcast(roomId, message);
      return;
    }

    if (message.type === 'node:move') {
      console.log(`🔄 Broadcasting node:move in room ${roomId}`);
      const node = state.nodes.find((n) => n.id === message.nodeId);
      if (node) {
        node.x = message.x;
        node.y = message.y;
      }
      this.broadcast(roomId, message);
      return;
    }

    if (message.type === 'edge:add') {
      console.log(`🔗 Broadcasting edge:add in room ${roomId}`, message.edge.id);
      
      // Deduplicate: upsert instead of push
      const idx = state.edges.findIndex((e) => e.id === message.edge.id);
      if (idx === -1) {
        state.edges.push(message.edge);
      } else {
        state.edges[idx] = message.edge;
      }
      
      this.broadcast(roomId, message);
      return;
    }

    console.warn('⚠️ Unknown message type:', message.type);
  }
}
