import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../db';
import { and, eq } from 'drizzle-orm';
import { tasks } from '../db/schema';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  async findAllForUser(userId: string) {
    return db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
    });
  }

  async create(userId: string, dto: CreateTaskDto) {
    const [task] = await db
      .insert(tasks)
      .values({ ...dto, userId })
      .returning();
    return task;
  }

  async update(id: string, userId: string, dto: Partial<CreateTaskDto>) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('You donot own this task');
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    return updatedTask;
  }

  async delete(id: string, userId: string) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    return { message: 'Task deleted successfully' };
  }
}
