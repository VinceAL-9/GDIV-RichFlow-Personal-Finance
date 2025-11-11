import { Request, Response, NextFunction } from 'express';
import {
  getBalanceSheet,
  createBalanceSheet,
  getAssets,
  addAsset,
  updateAsset,
  deleteAsset,
  getLiabilities,
  addLiability,
  updateLiability,
  deleteLiability
} from '../services/balanceSheet.service';

/**
 * Get balance sheet for the authenticated user
 * @route GET /api/balance-sheet
 */
export async function getBalanceSheetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const balanceSheet = await getBalanceSheet(userId);
    return res.status(200).json(balanceSheet);
  } catch (error) {
    console.error('Get balance sheet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create balance sheet for the authenticated user
 * @route POST /api/balance-sheet
 */
export async function createBalanceSheetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const balanceSheet = await createBalanceSheet(userId);
    return res.status(201).json({
      message: 'Balance sheet created successfully',
      balanceSheet
    });
  } catch (error) {
    console.error('Create balance sheet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all assets for the authenticated user
 * @route GET /api/assets
 */
export async function getAssetsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assets = await getAssets(userId);
    return res.status(200).json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add a new asset
 * @route POST /api/assets
 */
export async function addAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { name, value } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate input
    if (!name || typeof value !== 'number') {
      return res.status(400).json({
        error: 'Name and value are required. Value must be a number.'
      });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'Value cannot be negative' });
    }

    const asset = await addAsset(userId, { name, value });

    return res.status(201).json({
      message: 'Asset added successfully',
      asset
    });
  } catch (error) {
    console.error('Add asset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update an asset
 * @route PUT /api/assets/:id
 */
export async function updateAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const assetId = parseInt(String(req.params.id), 10);
    const { name, value } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(assetId)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    // Validate input
    if (!name || typeof value !== 'number') {
      return res.status(400).json({
        error: 'Name and value are required. Value must be a number.'
      });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'Value cannot be negative' });
    }

    const asset = await updateAsset(userId, assetId, { name, value });

    return res.status(200).json({
      message: 'Asset updated successfully',
      asset
    });
  } catch (error: any) {
    console.error('Update asset error:', error);
    if (error.message === 'Asset not found or unauthorized') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete an asset
 * @route DELETE /api/assets/:id
 */
export async function deleteAssetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const assetId = parseInt(String(req.params.id), 10);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(assetId)) {
      return res.status(400).json({ error: 'Invalid asset ID' });
    }

    await deleteAsset(userId, assetId);

    return res.status(200).json({
      message: 'Asset deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    if (error.message === 'Asset not found or unauthorized') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all liabilities for the authenticated user
 * @route GET /api/liabilities
 */
export async function getLiabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const liabilities = await getLiabilities(userId);
    return res.status(200).json(liabilities);
  } catch (error) {
    console.error('Get liabilities error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add a new liability
 * @route POST /api/liabilities
 */
export async function addLiabilityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { name, value } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate input
    if (!name || typeof value !== 'number') {
      return res.status(400).json({
        error: 'Name and value are required. Value must be a number.'
      });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'Value cannot be negative' });
    }

    const liability = await addLiability(userId, { name, value });

    return res.status(201).json({
      message: 'Liability added successfully',
      liability
    });
  } catch (error) {
    console.error('Add liability error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update a liability
 * @route PUT /api/liabilities/:id
 */
export async function updateLiabilityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const liabilityId = parseInt(String(req.params.id), 10);
    const { name, value } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(liabilityId)) {
      return res.status(400).json({ error: 'Invalid liability ID' });
    }

    // Validate input
    if (!name || typeof value !== 'number') {
      return res.status(400).json({
        error: 'Name and value are required. Value must be a number.'
      });
    }

    if (value < 0) {
      return res.status(400).json({ error: 'Value cannot be negative' });
    }

    const liability = await updateLiability(userId, liabilityId, { name, value });

    return res.status(200).json({
      message: 'Liability updated successfully',
      liability
    });
  } catch (error: any) {
    console.error('Update liability error:', error);
    if (error.message === 'Liability not found or unauthorized') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a liability
 * @route DELETE /api/liabilities/:id
 */
export async function deleteLiabilityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const liabilityId = parseInt(String(req.params.id), 10);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (isNaN(liabilityId)) {
      return res.status(400).json({ error: 'Invalid liability ID' });
    }

    await deleteLiability(userId, liabilityId);

    return res.status(200).json({
      message: 'Liability deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete liability error:', error);
    if (error.message === 'Liability not found or unauthorized') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
