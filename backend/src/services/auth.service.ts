import prisma from '../config/database.config';
import { hashPassword } from '../utils/password.utils';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

interface UserResponse {
  id: number;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

/**
 * Check if a user exists by email or name
 * @param email - User email
 * @param name - User name
 * @returns Existing user or null
 */
export async function findExistingUser(email: string, name: string) {
  return await prisma.user.findFirst({
    where: {
      OR: [{ email }, { name }]
    }
  });
}

/**
 * Create a new user in the database
 * @param userData - User registration data
 * @returns Created user (without password)
 */
export async function createUser(userData: CreateUserData): Promise<UserResponse> {
  const hashedPassword = await hashPassword(userData.password);

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      updatedAt: new Date(),
      lastLogin: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
    }
  });

  return user;
}
