import prisma from '../config/database.config';

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
    return await prisma.cashSavings.create({
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
  }

  // Update existing record
  return await prisma.cashSavings.update({
    where: { userId },
    data: { amount },
    select: {
      id: true,
      amount: true,
      userId: true
    }
  });
}
