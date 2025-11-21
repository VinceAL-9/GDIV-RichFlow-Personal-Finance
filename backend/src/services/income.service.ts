import prisma from '../config/database.config';
import { logIncomeEvent } from './event.service';
import { ActionType } from '../types/event.types';

interface IncomeLineData {
  name: string;
  amount: number;
  type: string;
}

/**
 * Get all income lines for a user
 */
export async function getIncomeLines(userId: number) {
  // First ensure user has an income statement
  const incomeStatement = await prisma.incomeStatement.findFirst({
    where: { userId },
    include: {
      IncomeLine: true
    }
  });

  if (!incomeStatement) {
    // Create income statement if it doesn't exist
    const newStatement = await prisma.incomeStatement.create({
      data: {
        userId,
        IncomeLine: {
          create: [] // Start with empty income lines
        }
      },
      include: {
        IncomeLine: true
      }
    });
    return newStatement.IncomeLine;
  }

  return incomeStatement.IncomeLine;
}

/**
 * Add a new income line for a user
 */
export async function addIncomeLine(userId: number, data: IncomeLineData) {
  // Get or create income statement
  let incomeStatement = await prisma.incomeStatement.findFirst({
    where: { userId }
  });

  if (!incomeStatement) {
    incomeStatement = await prisma.incomeStatement.create({
      data: { userId }
    });
  }

  // Create income line
  const newIncomeLine = await prisma.incomeLine.create({
    data: {
      name: data.name,
      amount: data.amount,
      type: data.type,
      isId: incomeStatement.id // Link to income statement
    }
  });

  // Log the CREATE event
  await logIncomeEvent(
    ActionType.CREATE,
    userId,
    newIncomeLine.id,
    undefined,
    {
      name: newIncomeLine.name,
      amount: newIncomeLine.amount,
      type: newIncomeLine.type
    }
  );

  return newIncomeLine;
}

/**
 * Update an income line
 * Verifies ownership before update
 */
export async function updateIncomeLine(userId: number, incomeLineId: number, data: IncomeLineData) {
  // First verify ownership
  const incomeLine = await prisma.incomeLine.findFirst({
    where: {
      id: incomeLineId,
      IncomeStatement: {
        userId
      }
    }
  });

  if (!incomeLine) {
    return null;
  }

  // Capture before state
  const beforeValue = {
    name: incomeLine.name,
    amount: incomeLine.amount,
    type: incomeLine.type
  };

  // Update the income line
  const updatedIncomeLine = await prisma.incomeLine.update({
    where: { id: incomeLineId },
    data: {
      name: data.name,
      amount: data.amount,
      type: data.type
    }
  });

  // Log the UPDATE event
  await logIncomeEvent(
    ActionType.UPDATE,
    userId,
    incomeLineId,
    beforeValue,
    {
      name: updatedIncomeLine.name,
      amount: updatedIncomeLine.amount,
      type: updatedIncomeLine.type
    }
  );

  return updatedIncomeLine;
}

/**
 * Delete an income line
 * Verifies ownership before deletion
 */
export async function deleteIncomeLine(userId: number, incomeLineId: number) {
  // First verify ownership
  const incomeLine = await prisma.incomeLine.findFirst({
    where: {
      id: incomeLineId,
      IncomeStatement: {
        userId
      }
    }
  });

  if (!incomeLine) {
    return null;
  }

  // Capture before state for event log
  const beforeValue = {
    name: incomeLine.name,
    amount: incomeLine.amount,
    type: incomeLine.type
  };

  // Delete the income line
  await prisma.incomeLine.delete({
    where: { id: incomeLineId }
  });

  // Log the DELETE event (entity is deleted but event remains)
  await logIncomeEvent(
    ActionType.DELETE,
    userId,
    incomeLineId,
    beforeValue,
    undefined
  );

  return true;
}