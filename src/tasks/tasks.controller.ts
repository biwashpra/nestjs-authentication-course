import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decoratoes/current-user.decorator';
import type { User } from '../db/schema';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for current user' })
  findAll(@CurrentUser() user: User) {
    return this.taskService.findAllForUser(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task' })
  create(@CurrentUser() user: User, @Body() dto: CreateTaskDto) {
    return this.taskService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaskDto>,
  ) {
    return this.taskService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.taskService.delete(id, user.id);
  }
}
