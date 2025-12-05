import { Controller, Post, Get, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}

    @Post()
    create() {
        return this.roomsService.createRoom();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.roomsService.getRoom(id);
    }
}
