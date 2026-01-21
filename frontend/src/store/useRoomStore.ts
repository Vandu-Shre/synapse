import { create } from "zustand";

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface RoomState {
    userId: string;
    roomId: string | null;
    socketStatus: SocketStatus;

    setRoomId: (id: string) => void;
    setSocketStatus: (status: SocketStatus ) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
    roomId: null,
    userId: crypto.randomUUID(),
    socketStatus: 'idle',

    setRoomId: (id) => set({ roomId: id }),
    setSocketStatus: (status) => set({ socketStatus: status })
}))