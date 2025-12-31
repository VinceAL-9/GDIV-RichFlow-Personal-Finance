/**
 * True Yield Engine TanStack Query Hooks
 *
 * Provides React Query hooks for managing asset-income/liability linking
 * and fetching performance metrics with tier-based access control.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trueYieldAPI } from '../../utils/api';
import type {
  AssetPerformanceData,
  AssetsYieldSummaryResponse,
  LinkedIncomeLine,
  LinkedLiability,
} from '../../types/trueYield.types';

// ============================================================================
// Query Keys
// ============================================================================

export const trueYieldKeys = {
  all: ['trueYield'] as const,
  assetYield: (assetId: number) => [...trueYieldKeys.all, 'asset', assetId] as const,
  assetsSummary: () => [...trueYieldKeys.all, 'summary'] as const,
  availableIncomeLines: () => [...trueYieldKeys.all, 'availableIncomeLines'] as const,
  availableLiabilities: () => [...trueYieldKeys.all, 'availableLiabilities'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Hook to fetch asset performance metrics
 * Returns tier-gated data (FREE sees structure, PRO sees metrics)
 */
export const useAssetYieldQuery = (assetId: number, enabled: boolean = true) => {
  return useQuery<AssetPerformanceData>({
    queryKey: trueYieldKeys.assetYield(assetId),
    queryFn: async () => {
      const response = await trueYieldAPI.getAssetYield(assetId);
      return response as AssetPerformanceData;
    },
    enabled: enabled && assetId > 0,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch all assets with yield summary
 */
export const useAssetsYieldSummaryQuery = () => {
  return useQuery<AssetsYieldSummaryResponse>({
    queryKey: trueYieldKeys.assetsSummary(),
    queryFn: async () => {
      const response = await trueYieldAPI.getAssetsYieldSummary();
      return response as AssetsYieldSummaryResponse;
    },
    staleTime: 30000,
  });
};

/**
 * Hook to fetch available income lines for linking
 */
export const useAvailableIncomeLinesQuery = () => {
  return useQuery<LinkedIncomeLine[]>({
    queryKey: trueYieldKeys.availableIncomeLines(),
    queryFn: async () => {
      const response = await trueYieldAPI.getAvailableIncomeLines();
      return response as LinkedIncomeLine[];
    },
    staleTime: 10000,
  });
};

/**
 * Hook to fetch available liabilities for linking
 */
export const useAvailableLiabilitiesQuery = () => {
  return useQuery<LinkedLiability[]>({
    queryKey: trueYieldKeys.availableLiabilities(),
    queryFn: async () => {
      const response = await trueYieldAPI.getAvailableLiabilities();
      return response as LinkedLiability[];
    },
    staleTime: 10000,
  });
};

// ============================================================================
// Mutations
// ============================================================================

/**
 * Hook to link an income line to an asset
 */
export const useLinkIncomeToAssetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, incomeLineId }: { assetId: number; incomeLineId: number }) => {
      return await trueYieldAPI.linkIncomeToAsset(assetId, incomeLineId);
    },
    onSuccess: (_, { assetId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetYield(assetId) });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetsSummary() });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.availableIncomeLines() });
    },
  });
};

/**
 * Hook to unlink an income line from an asset
 */
export const useUnlinkIncomeFromAssetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incomeLineId, assetId }: { incomeLineId: number; assetId: number }) => {
      return await trueYieldAPI.unlinkIncomeFromAsset(incomeLineId);
    },
    onSuccess: (_, { assetId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetYield(assetId) });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetsSummary() });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.availableIncomeLines() });
    },
  });
};

/**
 * Hook to link a liability to an asset
 */
export const useLinkLiabilityToAssetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, liabilityId }: { assetId: number; liabilityId: number }) => {
      return await trueYieldAPI.linkLiabilityToAsset(assetId, liabilityId);
    },
    onSuccess: (_, { assetId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetYield(assetId) });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetsSummary() });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.availableLiabilities() });
    },
  });
};

/**
 * Hook to unlink a liability from an asset
 */
export const useUnlinkLiabilityFromAssetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ liabilityId, assetId }: { liabilityId: number; assetId: number }) => {
      return await trueYieldAPI.unlinkLiabilityFromAsset(liabilityId);
    },
    onSuccess: (_, { assetId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetYield(assetId) });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.assetsSummary() });
      queryClient.invalidateQueries({ queryKey: trueYieldKeys.availableLiabilities() });
    },
  });
};
