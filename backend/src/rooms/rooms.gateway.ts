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
type StrokeAddMsg = { type: 'stroke:add'; roomId: string; userId: string; stroke: any };
type StrokeDeleteMsg = { type: 'stroke:delete'; roomId: string; userId: string; strokeId: string };
type RoomStateMsg = { type: 'room:state'; nodes: any[]; edges: any[]; strokes: any[] };
type DiagramActionMsg = { type: 'diagram:action'; roomId: string; action: any };

type WSMessage =
  | JoinRoomMsg
  | DiagramActionMsg
  | NodeAddMsg
  | NodeMoveMsg
  | EdgeAddMsg
  | StrokeAddMsg
  | StrokeDeleteMsg
  | RoomStateMsg;

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000' },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientRoom = new Map<WebSocket, string>();
  private rooms = new Map<string, Set<WebSocket>>();
  private roomState = new Map<string, { nodes: any[]; edges: any[]; strokes: any[] }>();
  private roomCleanupTimers = new Map<string, NodeJS.Timeout>();

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
          // Schedule cleanup with 60s grace period
          const timer = setTimeout(() => {
            const stillEmpty = this.rooms.get(roomId)?.size === 0;
            if (stillEmpty) {
              this.rooms.delete(roomId);
              this.roomState.delete(roomId);
              console.log(`🧹 Cleaned up room ${roomId} after TTL`);
            }
            this.roomCleanupTimers.delete(roomId);
          }, 60_000);

          this.roomCleanupTimers.set(roomId, timer);
          console.log(`⏳ Scheduled cleanup for room ${roomId} in 60s`);
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
        const timer = setTimeout(() => {
          const stillEmpty = this.rooms.get(oldRoom)?.size === 0;
          if (stillEmpty) {
            this.rooms.delete(oldRoom);
            this.roomState.delete(oldRoom);
            console.log(`🧹 Cleaned up room ${oldRoom} after TTL`);
          }
          this.roomCleanupTimers.delete(oldRoom);
        }, 60_000);

        this.roomCleanupTimers.set(oldRoom, timer);
        console.log(`⏳ Scheduled cleanup for room ${oldRoom} in 60s`);
      }
    }

    this.clientRoom.set(client, roomId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomState.set(roomId, { nodes: [], edges: [], strokes: [] });
    } else {
      // Cancel scheduled cleanup if room is being rejoined
      const t = this.roomCleanupTimers.get(roomId);
      if (t) {
        clearTimeout(t);
        this.roomCleanupTimers.delete(roomId);
        console.log(`✅ Cancelled cleanup for room ${roomId}`);
      }
    }

    this.rooms.get(roomId)!.add(client);

    // Send current room state to the joining client
    const state = this.roomState.get(roomId);
    if (state) {
      console.log(`📤 Sending room state to client: ${state.nodes.length} nodes, ${state.edges.length} edges, ${state.strokes.length} strokes`);
      console.log(`   Nodes: ${state.nodes.map((n) => n.id).join(", ") || "none"}`);
      console.log(`   Edges: ${state.edges.map((e) => e.id).join(", ") || "none"}`);
      console.log(`   Strokes: ${state.strokes.map((s) => s.id).join(", ") || "none"}`);
      
      const stateMsg: RoomStateMsg = {
        type: 'room:state',
        nodes: state.nodes,
        edges: state.edges,
        strokes: state.strokes,
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

    // ✅ Action-authoritative mode: ignore legacy mutators
    if (
      message.type === 'node:add' ||
      message.type === 'node:move' ||
      message.type === 'edge:add' ||
      message.type === 'stroke:add' ||
      message.type === 'stroke:delete'
    ) {
      console.warn('⚠️ Ignoring legacy message (action mode):', message.type);
      return;
    }

    if (message.type === 'diagram:action') {
      console.log(`🎨 Broadcasting diagram:action in room ${roomId}`);
      const action = (message as any).action;

      if (action?.type === 'ADD_NODE') {
        const node = action.payload?.node;
        if (node?.id) {
          console.log(`   ↳ ADD_NODE: ${node.id}`);
          const idx = state.nodes.findIndex((n) => n.id === node.id);
          if (idx === -1) state.nodes.push(node);
          else state.nodes[idx] = node;
        }
      }

      if (action?.type === 'MOVE_NODE') {
        const nodeId = action.payload?.nodeId;
        const to = action.payload?.to;
        if (nodeId && to) {
          console.log(`   ↳ MOVE_NODE: ${nodeId} to (${to.x}, ${to.y})`);
          const node = state.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.x = to.x;
            node.y = to.y;
          }
        }
      }

      if (action?.type === 'ADD_EDGE') {
        const edge = action.payload?.edge;
        if (edge?.id) {
          console.log(`   ↳ ADD_EDGE: ${edge.id}`);
          const idx = state.edges.findIndex((e) => e.id === edge.id);
          if (idx === -1) state.edges.push(edge);
          else state.edges[idx] = edge;
        }
      }

      if (action?.type === 'DELETE_EDGE') {
        const edgeId = action.payload?.edge?.id;
        if (edgeId) {
          console.log(`   ↳ DELETE_EDGE: ${edgeId}`);
          console.log(`      edges before=${state.edges.length}`);
          state.edges = state.edges.filter((e) => e.id !== edgeId);
          console.log(`      edges after=${state.edges.length}`);
        }
      }

      if (action?.type === 'ADD_STROKE') {
        const stroke = action.payload?.stroke;
        if (stroke?.id) {
          console.log(`   ↳ ADD_STROKE: ${stroke.id}`);
          const idx = state.strokes.findIndex((s) => s.id === stroke.id);
          if (idx === -1) state.strokes.push(stroke);
          else state.strokes[idx] = stroke;
        }
      }

      if (action?.type === 'DELETE_STROKE') {
        const strokeId = action.payload?.stroke?.id;
        if (strokeId) {
          console.log(`   ↳ DELETE_STROKE: ${strokeId}`);
          state.strokes = state.strokes.filter((s) => s.id !== strokeId);
        }
      }

      if (action?.type === 'DELETE_NODE') {
        const nodeId = action.payload?.node?.id;
        if (nodeId) {
          console.log(`   ↳ DELETE_NODE: ${nodeId}`);
          state.nodes = state.nodes.filter((n) => n.id !== nodeId);
          state.edges = state.edges.filter(
            (e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId
          );
        }
      }

      this.broadcast(roomId, message);
      return;
    }

    console.warn('⚠️ Unknown message type:', message.type);
  }
}
