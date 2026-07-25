import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { NewUser, users } from '../db/schema';

@Injectable()
export class UsersService {
  async findByVerificationToken(token: string) {
    return db.query.users.findFirst({
      where: eq(users.verificationToken, token),
    });
  }

  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async update(id: string, data: Partial<NewUser>) {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async findAll() {
    return db.query.users.findMany();
  }

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}
