import prisma from '../config/database.config';
import { logAssetEvent, logLiabilityEvent } from './event.service';
import { ActionType } from '../types/event.types';

interface AssetData {
  name: string;
  value: number;
}

interface LiabilityData {
  name: string;
  value: number;
}

/**
 * Get balance sheet with assets and liabilities for a user
 */
export async function getBalanceSheet(userId: number) {
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Asset: true,
      Liability: true
    }
  });

  return balanceSheet;
}

/**
 * Create balance sheet for a user
 */
export async function createBalanceSheet(userId: number) {
  const existingBalanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId }
  });

  if (existingBalanceSheet) {
    return existingBalanceSheet;
  }

  return await prisma.balanceSheet.create({
    data: {
      userId,
      Asset: {
        create: []
      },
      Liability: {
        create: []
      }
    },
    include: {
      Asset: true,
      Liability: true
    }
  });
}

/**
 * Get all assets for a user
 */
export async function getAssets(userId: number) {
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Asset: true
    }
  });

  if (!balanceSheet) {
    return [];
  }

  return balanceSheet.Asset;
}

/**
 * Add a new asset for a user
 */
export async function addAsset(userId: number, data: AssetData) {
  // Get or create balance sheet
  let balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId }
  });

  if (!balanceSheet) {
    balanceSheet = await prisma.balanceSheet.create({
      data: { userId }
    });
  }

  // Create asset
  const newAsset = await prisma.asset.create({
    data: {
      name: data.name,
      value: data.value,
      bsId: balanceSheet.id
    }
  });

  // Log the CREATE event
  await logAssetEvent(
    ActionType.CREATE,
    userId,
    newAsset.id,
    undefined,
    {
      name: newAsset.name,
      value: newAsset.value
    }
  );

  return newAsset;
}

/**
 * Update an asset
 * Verifies ownership before update
 */
export async function updateAsset(userId: number, assetId: number, data: AssetData) {
  // First verify ownership
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      BalanceSheet: {
        userId
      }
    }
  });

  if (!asset) {
    throw new Error('Asset not found or unauthorized');
  }

  // Capture before state
  const beforeValue = {
    name: asset.name,
    value: asset.value
  };

  // Update asset
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: data.name,
      value: data.value
    }
  });

  // Log the UPDATE event
  await logAssetEvent(
    ActionType.UPDATE,
    userId,
    assetId,
    beforeValue,
    {
      name: updatedAsset.name,
      value: updatedAsset.value
    }
  );

  return updatedAsset;
}

/**
 * Delete an asset
 * Verifies ownership before deletion
 */
export async function deleteAsset(userId: number, assetId: number) {
  // First verify ownership
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      BalanceSheet: {
        userId
      }
    }
  });

  if (!asset) {
    throw new Error('Asset not found or unauthorized');
  }

  // Capture before state for event log
  const beforeValue = {
    name: asset.name,
    value: asset.value
  };

  // Delete asset
  const deletedAsset = await prisma.asset.delete({
    where: { id: assetId }
  });

  // Log the DELETE event (entity is deleted but event remains)
  await logAssetEvent(
    ActionType.DELETE,
    userId,
    assetId,
    beforeValue,
    undefined
  );

  return deletedAsset;
}

/**
 * Get all liabilities for a user
 */
export async function getLiabilities(userId: number) {
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Liability: true
    }
  });

  if (!balanceSheet) {
    return [];
  }

  return balanceSheet.Liability;
}

/**
 * Add a new liability for a user
 */
export async function addLiability(userId: number, data: LiabilityData) {
  // Get or create balance sheet
  let balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId }
  });

  if (!balanceSheet) {
    balanceSheet = await prisma.balanceSheet.create({
      data: { userId }
    });
  }

  // Create liability
  const newLiability = await prisma.liability.create({
    data: {
      name: data.name,
      value: data.value,
      bsId: balanceSheet.id
    }
  });

  // Log the CREATE event
  await logLiabilityEvent(
    ActionType.CREATE,
    userId,
    newLiability.id,
    undefined,
    {
      name: newLiability.name,
      value: newLiability.value
    }
  );

  return newLiability;
}

/**
 * Update a liability
 * Verifies ownership before update
 */
export async function updateLiability(userId: number, liabilityId: number, data: LiabilityData) {
  // First verify ownership
  const liability = await prisma.liability.findFirst({
    where: {
      id: liabilityId,
      BalanceSheet: {
        userId
      }
    }
  });

  if (!liability) {
    throw new Error('Liability not found or unauthorized');
  }

  // Capture before state
  const beforeValue = {
    name: liability.name,
    value: liability.value
  };

  // Update liability
  const updatedLiability = await prisma.liability.update({
    where: { id: liabilityId },
    data: {
      name: data.name,
      value: data.value
    }
  });

  // Log the UPDATE event
  await logLiabilityEvent(
    ActionType.UPDATE,
    userId,
    liabilityId,
    beforeValue,
    {
      name: updatedLiability.name,
      value: updatedLiability.value
    }
  );

  return updatedLiability;
}

/**
 * Delete a liability
 * Verifies ownership before deletion
 */
export async function deleteLiability(userId: number, liabilityId: number) {
  // First verify ownership
  const liability = await prisma.liability.findFirst({
    where: {
      id: liabilityId,
      BalanceSheet: {
        userId
      }
    }
  });

  if (!liability) {
    throw new Error('Liability not found or unauthorized');
  }

  // Capture before state for event log
  const beforeValue = {
    name: liability.name,
    value: liability.value
  };

  // Delete liability
  const deletedLiability = await prisma.liability.delete({
    where: { id: liabilityId }
  });

  // Log the DELETE event (entity is deleted but event remains)
  await logLiabilityEvent(
    ActionType.DELETE,
    userId,
    liabilityId,
    beforeValue,
    undefined
  );

  return deletedLiability;
}
