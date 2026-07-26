import { User } from '../../db/schema';
import { SetMetadata } from '@nestjs/common';

export type Role = User['role'];

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
