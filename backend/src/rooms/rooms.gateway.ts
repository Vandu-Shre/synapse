import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

type JoinRoomMsg = { type: 'join-room'; roomId: string; userId: string };
type DiagramActionMsg = { type: 'diagram:action'; roomId: string; action: any };
type DiagramUndoMsg = { type: 'diagram:undo'; roomId: string; userId: string };
type DiagramRedoMsg = { type: 'diagram:redo'; roomId: string; userId: string };
type RoomStateMsg = { type: 'room:state'; nodes: any[]; edges: any[]; strokes: any[]; texts: any[] };

// Legacy types (kept for backwards compatibility, but ignored)
type NodeAddMsg = { type: 'node:add'; roomId: string; userId: string; node: any };
type NodeMoveMsg = { type: 'node:move'; roomId: string; userId: string; nodeId: string; x: number; y: number };
type EdgeAddMsg = { type: 'edge:add'; roomId: string; userId: string; edge: any };
type StrokeAddMsg = { type: 'stroke:add'; roomId: string; userId: string; stroke: any };
type StrokeDeleteMsg = { type: 'stroke:delete'; roomId: string; userId: string; strokeId: string };

type WSMessage =
  | JoinRoomMsg
  | DiagramActionMsg
  | DiagramUndoMsg
  | DiagramRedoMsg
  | RoomStateMsg
  | NodeAddMsg
  | NodeMoveMsg
  | EdgeAddMsg
  | StrokeAddMsg
  | StrokeDeleteMsg;

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000' },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientRoom = new Map<WebSocket, string>();
  private rooms = new Map<string, Set<WebSocket>>();
  private roomState = new Map<string, { nodes: any[]; edges: any[]; strokes: any[]; texts: any[] }>();
  private roomCleanupTimers = new Map<string, NodeJS.Timeout>();
  private undoStacks = new Map<string, Map<string, any[]>>();
  private redoStacks = new Map<string, Map<string, any[]>>();

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
      this.roomState.set(roomId, { nodes: [], edges: [], strokes: [], texts: [] });
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
      const stateMsg: RoomStateMsg = {
        type: 'room:state',
        nodes: state.nodes,
        edges: state.edges,
        strokes: state.strokes,
        texts: state.texts,
      };
      
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(stateMsg));
      }
    }
  }

  private broadcast(roomId: string, payload: WSMessage, except?: WebSocket) {
    const set = this.rooms.get(roomId);
    if (!set) return;

    const msg = JSON.stringify(payload);
    for (const c of set) {
      if (except && c === except) continue;
      if (c.readyState === c.OPEN) c.send(msg);
    }
  }

  private getUserStack(
    stacks: Map<string, Map<string, any[]>>,
    roomId: string,
    userId: string
  ): any[] {
    let roomMap = stacks.get(roomId);
    if (!roomMap) {
      roomMap = new Map();
      stacks.set(roomId, roomMap);
    }
    let stack = roomMap.get(userId);
    if (!stack) {
      stack = [];
      roomMap.set(userId, stack);
    }
    return stack;
  }

  private applyActionToRoomState(state: { nodes: any[]; edges: any[]; strokes: any[]; texts: any[] }, action: any) {
    if (action?.type === 'ADD_NODE') {
      const node = action.payload?.node;
      if (!node?.id) return;
      const idx = state.nodes.findIndex((n) => n.id === node.id);
      if (idx === -1) state.nodes.push(node);
      else state.nodes[idx] = node;
      return;
    }

    if (action?.type === 'MOVE_NODE') {
      const nodeId = action.payload?.nodeId;
      const to = action.payload?.to;
      if (!nodeId || !to) return;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.x = to.x;
        node.y = to.y;
      }
      return;
    }

    if (action?.type === 'DELETE_NODE') {
      const nodeId = action.payload?.node?.id;
      if (!nodeId) return;
      state.nodes = state.nodes.filter((n) => n.id !== nodeId);
      state.edges = state.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId);
      return;
    }

    if (action?.type === 'RESTORE_NODE') {
      const node = action.payload?.node;
      const edges = action.payload?.edges ?? [];

      if (node?.id) {
        const idx = state.nodes.findIndex((n) => n.id === node.id);
        if (idx === -1) state.nodes.push(node);
        else state.nodes[idx] = node;
      }

      for (const e of edges) {
        if (!e?.id) continue;
        const idx = state.edges.findIndex((x) => x.id === e.id);
        if (idx === -1) state.edges.push(e);
        else state.edges[idx] = e;
      }
      return;
    }

    if (action?.type === 'ADD_EDGE') {
      const edge = action.payload?.edge;
      if (!edge?.id) return;
      const idx = state.edges.findIndex((e) => e.id === edge.id);
      if (idx === -1) state.edges.push(edge);
      else state.edges[idx] = edge;
      return;
    }

    if (action?.type === 'DELETE_EDGE') {
      const edgeId = action.payload?.edge?.id;
      if (!edgeId) return;
      state.edges = state.edges.filter((e) => e.id !== edgeId);
      return;
    }

    if (action?.type === 'ADD_STROKE') {
      const stroke = action.payload?.stroke;
      if (!stroke?.id) return;
      const idx = state.strokes.findIndex((s) => s.id === stroke.id);
      if (idx === -1) state.strokes.push(stroke);
      else state.strokes[idx] = stroke;
      return;
    }

    if (action?.type === 'DELETE_STROKE') {
      const strokeId = action.payload?.stroke?.id;
      if (!strokeId) return;
      state.strokes = state.strokes.filter((s) => s.id !== strokeId);
      return;
    }

    if (action?.type === "ADD_TEXT") {
      const text = action.payload?.text;
      if (!text?.id) return;
      const idx = state.texts.findIndex((t: any) => t.id === text.id);
      if (idx === -1) state.texts.push(text);
      else state.texts[idx] = text;
      return;
    }

    if (action?.type === "MOVE_TEXT") {
      const textId = action.payload?.textId;
      const to = action.payload?.to;
      if (!textId || !to) return;

      const text = state.texts.find((t: any) => t.id === textId);
      if (text) {
        text.x = to.x;
        text.y = to.y;
      }
      return;
    }

    if (action?.type === "UPDATE_TEXT") {
      const textId = action.payload?.textId;
      const to = action.payload?.to;
      if (!textId || !to) return;

      const text = state.texts.find((t: any) => t.id === textId);
      if (text) {
        Object.assign(text, to);
      }
      return;
    }

    if (action?.type === "DELETE_TEXT") {
      const textId = action.payload?.text?.id;
      if (!textId) return;
      state.texts = state.texts.filter((t: any) => t.id !== textId);
      return;
    }
  }

  private invertAction(action: any, userId: string): any {
    const base = {
      id: randomUUID(),
      userId,
      ts: Date.now(),
    };

    if (action.type === 'ADD_NODE') {
      return { ...base, type: 'DELETE_NODE', payload: { node: action.payload.node, edges: [] } };
    }

    if (action.type === 'MOVE_NODE') {
      return {
        ...base,
        type: 'MOVE_NODE',
        payload: {
          nodeId: action.payload.nodeId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };
    }

    if (action.type === 'DELETE_NODE') {
      return {
        ...base,
        type: 'RESTORE_NODE',
        payload: {
          node: action.payload.node,
          edges: action.payload.edges ?? [],
        },
      };
    }

    if (action.type === 'ADD_EDGE') {
      return { ...base, type: 'DELETE_EDGE', payload: { edge: action.payload.edge } };
    }

    if (action.type === 'DELETE_EDGE') {
      return { ...base, type: 'ADD_EDGE', payload: { edge: action.payload.edge } };
    }

    if (action.type === 'ADD_STROKE') {
      return { ...base, type: 'DELETE_STROKE', payload: { stroke: action.payload.stroke } };
    }

    if (action.type === 'DELETE_STROKE') {
      return { ...base, type: 'ADD_STROKE', payload: { stroke: action.payload.stroke } };
    }

    if (action.type === "ADD_TEXT") {
      return { ...base, type: "DELETE_TEXT", payload: { text: action.payload.text } };
    }

    if (action.type === "MOVE_TEXT") {
      return {
        ...base,
        type: "MOVE_TEXT",
        payload: {
          textId: action.payload.textId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };
    }

    if (action.type === "UPDATE_TEXT") {
      return {
        ...base,
        type: "UPDATE_TEXT",
        payload: {
          textId: action.payload.textId,
          from: action.payload.to,
          to: action.payload.from,
        },
      };
    }

    if (action.type === "DELETE_TEXT") {
      return { ...base, type: "ADD_TEXT", payload: { text: action.payload.text } };
    }

    return null;
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

      this.applyActionToRoomState(state, action);

      // Push to undo stack, clear redo
      const authorId = action.userId;
      const undo = this.getUserStack(this.undoStacks, roomId, authorId);
      const redo = this.getUserStack(this.redoStacks, roomId, authorId);

      undo.push(action);
      redo.length = 0;

      console.log(`   ↳ ${action.type} | undo=${undo.length}, redo=${redo.length}`);

      this.broadcast(roomId, message, client);
      return;
    }

    if (message.type === 'diagram:undo') {
      console.log(`↩️ UNDO received for user ${message.userId} in room ${roomId}`);

      const undo = this.getUserStack(this.undoStacks, roomId, message.userId);
      const redo = this.getUserStack(this.redoStacks, roomId, message.userId);

      const last = undo.pop();
      if (!last) {
        console.log('   ↳ nothing to undo');
        return;
      }

      const inverse = this.invertAction(last, message.userId);
      if (!inverse) {
        console.log('   ↳ cannot invert', last?.type);
        return;
      }

      this.applyActionToRoomState(state, inverse);
      redo.push(last);

      console.log(`   ↳ inverse applied | undo=${undo.length}, redo=${redo.length}`);

      this.broadcast(roomId, { type: 'diagram:action', roomId, action: inverse } as any, client);
      return;
    }

    if (message.type === 'diagram:redo') {
      console.log(`↪️ REDO received for user ${message.userId} in room ${roomId}`);

      const undo = this.getUserStack(this.undoStacks, roomId, message.userId);
      const redo = this.getUserStack(this.redoStacks, roomId, message.userId);

      const next = redo.pop();
      if (!next) {
        console.log('   ↳ nothing to redo');
        return;
      }

      this.applyActionToRoomState(state, next);
      undo.push(next);

      console.log(`   ↳ action reapplied | undo=${undo.length}, redo=${redo.length}`);

      this.broadcast(roomId, { type: 'diagram:action', roomId, action: next } as any, client);
      return;
    }

    console.warn('⚠️ Unknown message type:', message.type);
  }
}
