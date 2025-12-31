import { Request, Response, NextFunction } from 'express';
import { getFinancialSnapshot, getFinancialTrajectory, createSnapshot } from '../services/analysis.service.js';
import {
  getAssetPerformance,
  linkIncomeToAsset,
  unlinkIncomeFromAsset,
  linkLiabilityToAsset,
  unlinkLiabilityFromAsset,
  getAssetsWithYieldSummary,
  getAvailableIncomeLines,
  getAvailableLiabilities
} from '../services/trueYield.service.js';

export async function getFinancialSnapshotHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const date = req.query.date as string | undefined;

    const snapshot = await getFinancialSnapshot(userId, date);

    return res.status(200).json(snapshot);
  } catch (error: any) {
    console.error('Get financial snapshot error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get financial snapshot' });
  }
}

export async function getFinancialTrajectoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'monthly';

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const trajectory = await getFinancialTrajectory(userId, startDate, endDate, interval);

    return res.status(200).json(trajectory);
  } catch (error: any) {
    console.error('Get financial trajectory error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get financial trajectory' });
  }
}

export async function createSnapshotHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await createSnapshot(userId);

    return res.status(201).json({ message: 'Financial snapshot created successfully' });
  } catch (error: any) {
    console.error('Create snapshot error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create financial snapshot' });
  }
}

// ============================================================================
// True Yield Engine Handlers
// ============================================================================

/**
 * GET /api/analysis/asset/:assetId/yield
 * Get asset performance metrics (tier-gated)
 */
export async function getAssetYieldHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assetId = parseInt(req.params.assetId || '', 10);

    if (isNaN(assetId)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    const performance = await getAssetPerformance(userId, assetId);

    return res.status(200).json(performance);
  } catch (error: any) {
    console.error('Get asset yield error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to get asset yield' });
  }
}

/**
 * GET /api/analysis/assets/yield-summary
 * Get all assets with yield summary
 */
export async function getAssetsYieldSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const summary = await getAssetsWithYieldSummary(userId);

    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('Get assets yield summary error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get assets yield summary' });
  }
}

/**
 * POST /api/analysis/asset/:assetId/link-income
 * Link an income line to an asset
 */
export async function linkIncomeToAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assetId = parseInt(req.params.assetId || '', 10);
    const { incomeLineId } = req.body;

    if (isNaN(assetId)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    if (!incomeLineId || typeof incomeLineId !== 'number') {
      return res.status(400).json({ error: 'incomeLineId is required and must be a number' });
    }

    await linkIncomeToAsset(userId, { assetId, incomeLineId });

    return res.status(200).json({ message: 'Income linked to asset successfully' });
  } catch (error: any) {
    console.error('Link income to asset error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to link income to asset' });
  }
}

/**
 * DELETE /api/analysis/income/:incomeLineId/unlink
 * Unlink an income line from its asset
 */
export async function unlinkIncomeFromAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const incomeLineId = parseInt(req.params.incomeLineId || '', 10);

    if (isNaN(incomeLineId)) {
      return res.status(400).json({ error: 'Invalid income line ID' });
    }

    await unlinkIncomeFromAsset(userId, incomeLineId);

    return res.status(200).json({ message: 'Income unlinked from asset successfully' });
  } catch (error: any) {
    console.error('Unlink income from asset error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not linked')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to unlink income from asset' });
  }
}

/**
 * POST /api/analysis/asset/:assetId/link-liability
 * Link a liability to an asset
 */
export async function linkLiabilityToAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assetId = parseInt(req.params.assetId || '', 10);
    const { liabilityId } = req.body;

    if (isNaN(assetId)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    if (!liabilityId || typeof liabilityId !== 'number') {
      return res.status(400).json({ error: 'liabilityId is required and must be a number' });
    }

    await linkLiabilityToAsset(userId, { assetId, liabilityId });

    return res.status(200).json({ message: 'Liability linked to asset successfully' });
  } catch (error: any) {
    console.error('Link liability to asset error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to link liability to asset' });
  }
}

/**
 * DELETE /api/analysis/liability/:liabilityId/unlink
 * Unlink a liability from its asset
 */
export async function unlinkLiabilityFromAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const liabilityId = parseInt(req.params.liabilityId || '', 10);

    if (isNaN(liabilityId)) {
      return res.status(400).json({ error: 'Invalid liability ID' });
    }

    await unlinkLiabilityFromAsset(userId, liabilityId);

    return res.status(200).json({ message: 'Liability unlinked from asset successfully' });
  } catch (error: any) {
    console.error('Unlink liability from asset error:', error);
    
    if (error.message.includes('not found') || error.message.includes('not linked')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Failed to unlink liability from asset' });
  }
}

/**
 * GET /api/analysis/available-income-lines
 * Get income lines available for linking
 */
export async function getAvailableIncomeLinesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const incomeLines = await getAvailableIncomeLines(userId);

    return res.status(200).json(incomeLines);
  } catch (error: any) {
    console.error('Get available income lines error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get available income lines' });
  }
}

/**
 * GET /api/analysis/available-liabilities
 * Get liabilities available for linking
 */
export async function getAvailableLiabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const liabilities = await getAvailableLiabilities(userId);

    return res.status(200).json(liabilities);
  } catch (error: any) {
    console.error('Get available liabilities error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get available liabilities' });
  }
}

