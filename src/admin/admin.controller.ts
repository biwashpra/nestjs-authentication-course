import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decoratoes/roles.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private usersService: UsersService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users - by admin only' })
  findAll() {
    return this.usersService.findAll();
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete users - by admin only' })
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
