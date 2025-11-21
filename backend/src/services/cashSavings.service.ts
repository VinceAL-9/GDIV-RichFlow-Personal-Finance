import prisma from '../config/database.config';
import { logCashSavingsEvent } from './event.service';
import { ActionType } from '../types/event.types';

/**
 * Get cash savings for a specific user
 * @param userId - User ID
 * @returns CashSavings record or null
 */
export async function getCashSavings(userId: number) {
  return await prisma.cashSavings.findUnique({
    where: { userId },
    select: {
      id: true,
      amount: true,
      userId: true
    }
  });
}

/**
 * Update cash savings amount for a user
 * @param userId - User ID
 * @param amount - New cash savings amount
 * @returns Updated CashSavings record
 */
export async function updateCashSavings(userId: number, amount: number) {
  // Check if cash savings record exists
  const existing = await prisma.cashSavings.findUnique({
    where: { userId }
  });

  if (!existing) {
    // Create if doesn't exist (shouldn't happen if signup creates it)
    const newCashSavings = await prisma.cashSavings.create({
      data: {
        userId,
        amount
      },
      select: {
        id: true,
        amount: true,
        userId: true
      }
    });

    // Log CREATE event
    await logCashSavingsEvent(
      ActionType.CREATE,
      userId,
      newCashSavings.id,
      undefined,
      { amount: newCashSavings.amount }
    );

    return newCashSavings;
  }

  // Capture before state
  const beforeValue = {
    amount: existing.amount
  };

  // Update existing record
  const updatedCashSavings = await prisma.cashSavings.update({
    where: { userId },
    data: { amount },
    select: {
      id: true,
      amount: true,
      userId: true
    }
  });

  // Log UPDATE event
  await logCashSavingsEvent(
    ActionType.UPDATE,
    userId,
    updatedCashSavings.id,
    beforeValue,
    { amount: updatedCashSavings.amount }
  );

  return updatedCashSavings;
}
