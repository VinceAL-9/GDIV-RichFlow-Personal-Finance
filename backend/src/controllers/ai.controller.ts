import { Request, Response, NextFunction } from 'express';
import { analyzeFinance } from '../services/ai.service';

export async function analyzeFinanceController(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const financialInformation = await analyzeFinance(userId);

    if (!financialInformation) {
      return res.status(404).json({ error: 'Missing or insufficient information' });
    }

    return res.status(200).json( {success: true, data: financialInformation});
    } catch (error) {
    console.error('Getting information error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}