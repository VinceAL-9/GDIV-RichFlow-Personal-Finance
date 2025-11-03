import { Request, Response, NextFunction } from 'express';
import { getCashSavings, updateCashSavings } from '../services/cashSavings.service';

/**
 * Get cash savings for the authenticated user
 * @route GET /api/cash-savings
 */
export async function getCashSavingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const cashSavings = await getCashSavings(userId);

    if (!cashSavings) {
      return res.status(404).json({ error: 'Cash savings record not found' });
    }

    return res.status(200).json(cashSavings);
  } catch (error) {
    console.error('Get cash savings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update cash savings amount for the authenticated user
 * @route PUT /api/cash-savings
 */
export async function updateCashSavingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount. Must be a number.' });
    }

    if (amount < 0) {
      return res.status(400).json({ error: 'Amount cannot be negative' });
    }

    const updatedCashSavings = await updateCashSavings(userId, amount);

    return res.status(200).json({
      message: 'Cash savings updated successfully',
      cashSavings: updatedCashSavings
    });
  } catch (error) {
    console.error('Update cash savings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
