import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getFinancialSnapshotHandler,
  getFinancialTrajectoryHandler,
  createSnapshotHandler,
  getTieredAnalysisSnapshotHandler,
  getAssetYieldHandler,
  getAssetsYieldSummaryHandler,
  linkIncomeToAssetHandler,
  unlinkIncomeFromAssetHandler,
  linkLiabilityToAssetHandler,
  unlinkLiabilityFromAssetHandler,
  getAvailableIncomeLinesHandler,
  getAvailableLiabilitiesHandler
} from '../controllers/analysis.controller.js';

const router = Router();

/**
 * @route GET /api/analysis/snapshot
 * @desc Get financial snapshot for a specific date
 * @access Private
 */
router.get('/snapshot', authenticateToken, getFinancialSnapshotHandler);

/**
 * @route GET /api/analysis/tiered-snapshot
 * @desc Get tiered analysis snapshot with polymorphic response based on subscription tier
 * @access Private
 * @returns {AnalysisResponse} - standard (all tiers) + advanced (PRO only) + isPro + tier
 */
router.get('/tiered-snapshot', authenticateToken, getTieredAnalysisSnapshotHandler);

/**
 * @route GET /api/analysis/trajectory
 * @desc Get financial trajectory over time for velocity and freedom gap visualization
 * @access Private
 */
router.get('/trajectory', authenticateToken, getFinancialTrajectoryHandler);

/**
 * @route POST /api/analysis/snapshot
 * @desc Manually trigger a financial snapshot creation
 * @access Private
 */
router.post('/snapshot', authenticateToken, createSnapshotHandler);

// ============================================================================
// True Yield Engine Routes
// ============================================================================

/**
 * @route GET /api/analysis/assets/yield-summary
 * @desc Get all assets with yield summary (linked items count)
 * @access Private
 */
router.get('/assets/yield-summary', authenticateToken, getAssetsYieldSummaryHandler);

/**
 * @route GET /api/analysis/available-income-lines
 * @desc Get income lines available for linking (not yet linked)
 * @access Private
 */
router.get('/available-income-lines', authenticateToken, getAvailableIncomeLinesHandler);

/**
 * @route GET /api/analysis/available-liabilities
 * @desc Get liabilities available for linking (not yet linked)
 * @access Private
 */
router.get('/available-liabilities', authenticateToken, getAvailableLiabilitiesHandler);

/**
 * @route GET /api/analysis/asset/:assetId/yield
 * @desc Get asset performance metrics (tier-gated: FREE sees structure only, PRO sees metrics)
 * @access Private
 */
router.get('/asset/:assetId/yield', authenticateToken, getAssetYieldHandler);

/**
 * @route POST /api/analysis/asset/:assetId/link-income
 * @desc Link an income line to an asset
 * @access Private
 */
router.post('/asset/:assetId/link-income', authenticateToken, linkIncomeToAssetHandler);

/**
 * @route DELETE /api/analysis/income/:incomeLineId/unlink
 * @desc Unlink an income line from its asset
 * @access Private
 */
router.delete('/income/:incomeLineId/unlink', authenticateToken, unlinkIncomeFromAssetHandler);

/**
 * @route POST /api/analysis/asset/:assetId/link-liability
 * @desc Link a liability to an asset
 * @access Private
 */
router.post('/asset/:assetId/link-liability', authenticateToken, linkLiabilityToAssetHandler);

/**
 * @route DELETE /api/analysis/liability/:liabilityId/unlink
 * @desc Unlink a liability from its asset
 * @access Private
 */
router.delete('/liability/:liabilityId/unlink', authenticateToken, unlinkLiabilityFromAssetHandler);

export default router;
