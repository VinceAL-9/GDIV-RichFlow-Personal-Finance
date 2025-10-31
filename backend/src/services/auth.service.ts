import prisma from '../config/database.config';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateRefreshToken, getRefreshTokenExpiration } from '../utils/jwt.utils';

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
 * Find a user by their email address
 * @param email - User email
 * @returns User or null
 */
export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email }
  });
}

/**
 * Create a new user in the database
 * @param userData - User registration data
 * @returns Created user (without password)
 */
export async function createUser(userData: CreateUserData): Promise<UserResponse> {
  const hashedPassword = await hashPassword(userData.password);

  // Use a transaction to create user and income statement together
  const user = await prisma.$transaction(async (tx) => {
    // Create the user
    const newUser = await tx.user.create({
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
        lastLogin: true
      }
    });

    // Automatically create an income statement for the new user
    await tx.incomeStatement.create({
      data: {
        userId: newUser.id
      }
    });

    return newUser;
  });

  return user;
}

/**
 * Authenticate user with email and password
 * @param email - User email
 * @param password - User password
 * @returns User data or null if authentication fails
 */
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

/**
 * Create a new session for a user (refresh token)
 * @param userId - User ID
 * @returns Session with refresh token
 */
export async function createSession(userId: number) {
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiration();

  const session = await prisma.session.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
      isValid: true
    }
  });

  return session;
}

/**
 * Find valid session by refresh token
 * @param refreshToken - Refresh token string
 * @returns Session with user data or null
 */
export async function findValidSession(refreshToken: string) {
  return await prisma.session.findFirst({
    where: {
      token: refreshToken,
      isValid: true,
      expiresAt: {
        gt: new Date() // Token not expired
      }
    },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
}

/**
 * Invalidate a session (logout)
 * @param refreshToken - Refresh token to invalidate
 * @returns Update result
 */
export async function invalidateSession(refreshToken: string) {
  return await prisma.session.updateMany({
    where: { token: refreshToken },
    data: { isValid: false }
  });
}

/**
 * Invalidate all user sessions (logout from all devices)
 * @param userId - User ID
 * @returns Update result
 */
export async function invalidateAllUserSessions(userId: number) {
  return await prisma.session.updateMany({
    where: { userId },
    data: { isValid: false }
  });
}

/**
 * Clean up expired sessions (run periodically)
 * @returns Delete result
 */
export async function cleanupExpiredSessions() {
  return await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}
