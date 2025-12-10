import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class RoomsService {
    createRoom() {
        const roomId = randomUUID();
        return { roomId };
    }

    getRoom(id: string) {
        // temporary implementation (no DB yet)
        return { roomId: id, exists: true }
    }
}
