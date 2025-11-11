import prisma from '../config/database.config';

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
  return await prisma.asset.create({
    data: {
      name: data.name,
      value: data.value,
      bsId: balanceSheet.id
    }
  });
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

  // Update asset
  return await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: data.name,
      value: data.value
    }
  });
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

  // Delete asset
  return await prisma.asset.delete({
    where: { id: assetId }
  });
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
  return await prisma.liability.create({
    data: {
      name: data.name,
      value: data.value,
      bsId: balanceSheet.id
    }
  });
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

  // Update liability
  return await prisma.liability.update({
    where: { id: liabilityId },
    data: {
      name: data.name,
      value: data.value
    }
  });
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

  // Delete liability
  return await prisma.liability.delete({
    where: { id: liabilityId }
  });
}
