/**
 * Analysis Service - Frontend API Layer
 * 
 * This service provides typed methods for interacting with the 
 * /api/analysis endpoints, supporting the tiered analysis system.
 */

import type { 
  AnalysisResponse, 
  StandardSnapshot, 
  AdvancedMetrics 
} from '../types/analysis.types';
import { apiRequest } from '../utils/api';

/**
 * Error class for API-specific errors
 */
export class AnalysisApiError extends Error {
  constructor(
    message: string, 
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AnalysisApiError';
  }
}

/**
 * Analysis Service
 * 
 * Provides typed methods for all analysis-related API calls
 */
export const analysisService = {
  /**
   * Get the tiered financial snapshot
   * 
   * Returns StandardSnapshot for all users and AdvancedMetrics for PRO users.
   * 
   * @param date - Optional date for historical snapshot (YYYY-MM-DD format)
   * @returns AnalysisResponse with standard, advanced (null for FREE), and isPro flag
   * 
   * @example
   * // Get current snapshot
   * const data = await analysisService.getTieredSnapshot();
   * 
   * // Get historical snapshot
   * const historicalData = await analysisService.getTieredSnapshot('2025-01-15');
   */
  getTieredSnapshot: async (date?: string): Promise<AnalysisResponse> => {
    const url = date 
      ? `/analysis/tiered-snapshot?date=${encodeURIComponent(date)}` 
      : '/analysis/tiered-snapshot';
    
    return apiRequest(url, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get only the standard snapshot (works for all tiers)
   * 
   * @param date - Optional date for historical snapshot
   * @returns StandardSnapshot with basic financial metrics
   */
  getStandardSnapshot: async (date?: string): Promise<StandardSnapshot> => {
    const response = await analysisService.getTieredSnapshot(date);
    return response.standard;
  },

  /**
   * Get advanced metrics (PRO only)
   * 
   * @param date - Optional date for historical snapshot
   * @returns AdvancedMetrics or null if user is not PRO
   */
  getAdvancedMetrics: async (date?: string): Promise<AdvancedMetrics | null> => {
    const response = await analysisService.getTieredSnapshot(date);
    return response.advanced;
  },

  /**
   * Check if the current user has PRO subscription
   * 
   * @returns boolean indicating PRO status
   */
  checkProStatus: async (): Promise<boolean> => {
    const response = await analysisService.getTieredSnapshot();
    return response.isPro;
  },
};

/**
 * Helper function to check if user has access to advanced features
 */
export const hasAdvancedAccess = (response: AnalysisResponse): boolean => {
  return response.isPro && response.advanced !== null;
};

/**
 * Helper function to format passive runway for display
 */
export const formatPassiveRunway = (runway: number): string => {
  if (!isFinite(runway) || runway >= 999) {
    return '∞ (Financially Free)';
  }
  if (runway <= 0) {
    return '0 months';
  }
  if (runway < 1) {
    return `${Math.round(runway * 30)} days`;
  }
  return `${Math.round(runway)} months`;
};

/**
 * Helper function to get debt quality assessment
 */
export const getDebtQualityAssessment = (goodDebtRatio: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  color: string;
} => {
  if (goodDebtRatio >= 70) {
    return {
      level: 'excellent',
      message: 'Your debt is mostly leveraged for income-producing assets',
      color: 'text-emerald-400',
    };
  }
  if (goodDebtRatio >= 50) {
    return {
      level: 'good',
      message: 'Balanced debt composition. Consider reducing bad debt',
      color: 'text-blue-400',
    };
  }
  if (goodDebtRatio >= 25) {
    return {
      level: 'fair',
      message: 'High bad debt ratio. Focus on paying down consumer debt',
      color: 'text-yellow-400',
    };
  }
  return {
    level: 'poor',
    message: 'Most debt is consumer debt. Prioritize debt reduction',
    color: 'text-red-400',
  };
};

/**
 * Helper function to get asset efficiency assessment
 */
export const getAssetEfficiencyAssessment = (productivityRatio: number): {
  level: 'excellent' | 'good' | 'fair' | 'low' | 'poor';
  message: string;
  color: string;
} => {
  if (productivityRatio >= 80) {
    return {
      level: 'excellent',
      message: 'Most of your assets are working for you',
      color: 'text-emerald-400',
    };
  }
  if (productivityRatio >= 60) {
    return {
      level: 'good',
      message: 'Good balance. Consider linking income to stagnant assets',
      color: 'text-blue-400',
    };
  }
  if (productivityRatio >= 40) {
    return {
      level: 'fair',
      message: 'Room for improvement. Many assets aren\'t generating income',
      color: 'text-yellow-400',
    };
  }
  if (productivityRatio >= 20) {
    return {
      level: 'low',
      message: 'Most assets are idle. Look for ways to monetize them',
      color: 'text-orange-400',
    };
  }
  return {
    level: 'poor',
    message: 'Assets are not generating income. Review your portfolio strategy',
    color: 'text-red-400',
  };
};

export default analysisService;
