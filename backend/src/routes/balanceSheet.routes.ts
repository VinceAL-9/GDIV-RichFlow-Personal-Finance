import { Router } from 'express';
import {
  getBalanceSheetHandler,
  createBalanceSheetHandler,
  getAssetsHandler,
  addAssetHandler,
  updateAssetHandler,
  deleteAssetHandler,
  getLiabilitiesHandler,
  addLiabilityHandler,
  updateLiabilityHandler,
  deleteLiabilityHandler
} from '../controllers/balanceSheet.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All balance sheet routes require authentication
router.use(authenticateToken);

// Balance Sheet routes
router.get('/balance-sheet', getBalanceSheetHandler);
router.post('/balance-sheet', createBalanceSheetHandler);

// Asset routes
router.get('/assets', getAssetsHandler);
router.post('/assets', addAssetHandler);
router.put('/assets/:id', updateAssetHandler);
router.delete('/assets/:id', deleteAssetHandler);

// Liability routes
router.get('/liabilities', getLiabilitiesHandler);
router.post('/liabilities', addLiabilityHandler);
router.put('/liabilities/:id', updateLiabilityHandler);
router.delete('/liabilities/:id', deleteLiabilityHandler);

export default router;
