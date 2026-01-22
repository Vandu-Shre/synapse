import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Exported so external modules (e.g., controller) can name this type
export interface RoomResponse {
  roomId: string;
  exists?: boolean;
}

/**
 * Service for managing collaborative rooms
 * Temporary implementation without database persistence
 */
@Injectable()
export class RoomsService {
  /**
   * Creates a new room with a unique identifier
   * @returns Object containing the new roomId
   */
  createRoom(): RoomResponse {
    const roomId = randomUUID();
    return { roomId };
  }

  /**
   * Retrieves room information by ID
   * @param id - The room identifier
   * @returns Object containing roomId and exists flag
   * @note Temporary implementation - always returns exists: true
   */
  getRoom(id: string): RoomResponse {
    // TODO: Replace with actual database lookup
    return { roomId: id, exists: true };
  }
}
