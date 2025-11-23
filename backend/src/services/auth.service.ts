import prisma from '../config/database.config';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateRefreshToken, getRefreshTokenExpiration } from '../utils/jwt.utils';
import { createEvent } from './event.service';
import { ActionType, EntityType } from '../types/event.types';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

interface UserResponse {
  id: number;
  name: string | null;
  email: string;
  isAdmin: boolean;
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

  // Use a transaction to create user, income statement, and cash savings together
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
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });

    // Automatically create an income statement for the new user
    const incomeStatement = await tx.incomeStatement.create({
      data: {
        userId: newUser.id
      }
    });

    // Automatically create a cash savings record with default amount of 0
    const cashSavings = await tx.cashSavings.create({
      data: {
        userId: newUser.id,
        amount: 0
      }
    });

    // Log income statement creation event
    await tx.event.create({
      data: {
        actionType: ActionType.CREATE,
        entityType: EntityType.INCOME,
        entitySubtype: 'INCOME_STATEMENT',
        beforeValue: null,
        afterValue: JSON.stringify({ id: incomeStatement.id, userId: newUser.id }),
        userId: newUser.id,
        entityId: incomeStatement.id
      }
    });

    // Log cash savings creation event
    await tx.event.create({
      data: {
        actionType: ActionType.CREATE,
        entityType: EntityType.CASH_SAVINGS,
        entitySubtype: null,
        beforeValue: null,
        afterValue: JSON.stringify({ id: cashSavings.id, userId: newUser.id, amount: 0 }),
        userId: newUser.id,
        entityId: cashSavings.id
      }
    });

    // Log user account creation event
    await tx.event.create({
      data: {
        actionType: ActionType.CREATE,
        entityType: EntityType.USER,
        entitySubtype: null,
        beforeValue: null,
        afterValue: JSON.stringify({ id: newUser.id, email: newUser.email, name: newUser.name }),
        userId: newUser.id,
        entityId: newUser.id
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
    where: { email },
    include: {
      PreferredCurrency: true
    }
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
    name: user.name,
    isAdmin: user.isAdmin,
    PreferredCurrency: user.PreferredCurrency
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
          name: true,
          isAdmin: true,
          PreferredCurrency: true
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

/**
 * Update a user's username
 * @param userId - ID of the user to update
 * @param newName - New username to set
 * @returns Updated user or throws on conflict
 */
export async function updateUsername(userId: number, newName: string) {
  // Check if another user already has the requested name
  const existing = await prisma.user.findFirst({
    where: {
      name: newName,
      id: { not: userId }
    }
  });

  if (existing) {
    const err: any = new Error('Username already taken');
    err.code = 'USERNAME_TAKEN';
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: newName, updatedAt: new Date() },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      PreferredCurrency: true
    }
  });

  return updated;
}

/**
 * Update a user's email address
 * @param userId - ID of the user to update
 * @param newEmail - New email to set
 * @returns Updated user or throws on conflict
 */
export async function updateEmail(userId: number, newEmail: string) {
  // Check if email already used by another account
  const existing = await prisma.user.findFirst({
    where: {
      email: newEmail,
      id: { not: userId }
    }
  });

  if (existing) {
    const err: any = new Error('Email already in use');
    err.code = 'EMAIL_TAKEN';
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail, updatedAt: new Date() },
    select: { id: true, email: true, name: true, isAdmin: true, PreferredCurrency: true }
  });

  return updated;
}

/**
 * Update a user's password after verifying current password
 * @param userId - ID of the user
 * @param currentPassword - Current password to verify
 * @param newPassword - New password to set (plain text)
 */
export async function updatePassword(userId: number, currentPassword: string, newPassword: string) {
  // Fetch user's current password hash
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err: any = new Error('User not found');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    const err: any = new Error('Current password is incorrect');
    err.code = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, updatedAt: new Date() }
  });

  return true;
}
