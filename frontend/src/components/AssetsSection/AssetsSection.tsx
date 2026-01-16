import React, { useState } from "react";
import {
  useAssetsQuery,
  useAddAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  AssetItem,
} from "../../hooks/queries/useBalanceSheet";
import { useAssetYieldQuery } from "../../hooks/queries/useTrueYield";
import { useCurrency } from "../../context/CurrencyContext";
import { formatCurrency } from "../../utils/currency.utils";
import FinancialTable, { ColumnDefinition } from "../Shared/FinancialTable";
import { AssetLinkingModal, TrueYieldCard } from "../TrueYield";

const AssetsSection: React.FC = () => {
  const { currency } = useCurrency();

  // TanStack Query hooks
  const { data: assets, isLoading, error: queryError } = useAssetsQuery();
  const addAssetMutation = useAddAssetMutation();
  const updateAssetMutation = useUpdateAssetMutation();
  const deleteAssetMutation = useDeleteAssetMutation();

  const [editingItem, setEditingItem] = useState<AssetItem | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetAmount, setAssetAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // True Yield Engine state
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [showYieldCard, setShowYieldCard] = useState<number | null>(null);

  // Query for selected asset's yield data
  const { data: selectedAssetYield, error: yieldError, isLoading: yieldLoading } = useAssetYieldQuery(
    showYieldCard ?? 0,
    showYieldCard !== null
  );

  // Handle add asset
  const handleAddAsset = async () => {
    if (!assetName.trim() || !assetAmount.trim() || addAssetMutation.isPending) return;

    try {
      setLocalError(null);
      await addAssetMutation.mutateAsync({
        name: assetName,
        value: parseFloat(assetAmount),
      });
      setAssetName("");
      setAssetAmount("");
    } catch (err: unknown) {
      setLocalError("Failed to add asset");
    }
  };

  // Handle update asset
  const handleUpdateAsset = async () => {
    if (!editingItem || !assetName.trim() || !assetAmount.trim() || updateAssetMutation.isPending) return;

    try {
      setLocalError(null);
      await updateAssetMutation.mutateAsync({
        id: editingItem.id,
        name: assetName,
        value: parseFloat(assetAmount),
      });
      setEditingItem(null);
      setAssetName("");
      setAssetAmount("");
    } catch (err: unknown) {
      setLocalError("Failed to update asset");
    }
  };

  // Handle edit click
  const handleEdit = (item: AssetItem) => {
    setEditingItem(item);
    setAssetName(item.name);
    setAssetAmount(item.value.toString());
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingItem(null);
    setAssetName("");
    setAssetAmount("");
  };

  // Handle delete asset
  const handleDelete = async (item: AssetItem) => {
    if (deleteAssetMutation.isPending) return;

    try {
      setLocalError(null);
      await deleteAssetMutation.mutateAsync({ id: item.id });
    } catch (err: unknown) {
      setLocalError("Failed to delete asset");
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem !== null) {
      await handleUpdateAsset();
    } else {
      await handleAddAsset();
    }
  };

  // Handle opening the linking modal
  const handleOpenLinking = (assetId: number) => {
    setSelectedAssetId(assetId);
    setIsLinkingModalOpen(true);
  };

  // Handle viewing yield card
  const handleViewYield = (assetId: number) => {
    setShowYieldCard(showYieldCard === assetId ? null : assetId);
  };

  // Column definitions for FinancialTable
  const columns: ColumnDefinition<AssetItem>[] = [
    { header: "Name", accessor: "name" },
    {
      header: "Value",
      accessor: (item) => formatCurrency(item.value, currency),
      align: "right",
    },
  ];

  // Custom row actions for True Yield
  const renderRowActions = (item: AssetItem) => (
    <div className="flex items-center gap-1">
      {/* Link button */}
      <button
        onClick={() => handleOpenLinking(item.id)}
        className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded transition-colors"
        title="Link income/liabilities"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
      {/* View yield button */}
      <button
        onClick={() => handleViewYield(item.id)}
        className={`p-1.5 rounded transition-colors ${
          showYieldCard === item.id 
            ? 'text-emerald-400 bg-emerald-500/20' 
            : 'text-emerald-400 hover:bg-emerald-500/20'
        }`}
        title="View yield analysis"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    </div>
  );

  // Determine which item is being deleted (for loading state)
  const deletingId = deleteAssetMutation.isPending ? deleteAssetMutation.variables?.id : null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="rf-card text-white">
        <div className="rf-section-header">Assets</div>
        <p className="text-center text-[#d4af37] p-5">Loading assets...</p>
      </div>
    );
  }

  // Display error from hook or local error
  const displayError =
    localError || (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  // Default empty assets array if data is not yet available
  const assetData = assets ?? [];

  return (
    <>
      <div className="rf-card text-white">
        <div className="rf-section-header">Assets</div>

        {displayError && <p className="rf-error">{displayError}</p>}

        {/* Use FinancialTable for the list display */}
        <FinancialTable
          title=""
          data={assetData}
          columns={columns}
          emptyMessage="No assets added yet."
          onEdit={handleEdit}
          onDelete={handleDelete}
          editingId={editingItem?.id ?? null}
          deletingId={deletingId ?? null}
          noCard={true}
          renderRowActions={renderRowActions}
        />

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <input
            className="rf-input flex-1 min-w-[120px]"
            type="text"
            placeholder="Asset name"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            disabled={addAssetMutation.isPending}
          />
          <input
            className="rf-input flex-1 min-w-[120px]"
            type="number"
            placeholder="Total Value"
            step="0.01"
            value={assetAmount}
            onChange={(e) => setAssetAmount(e.target.value)}
            disabled={addAssetMutation.isPending || updateAssetMutation.isPending}
          />
          {editingItem !== null ? (
            <div className="rf-edit-actions w-full">
              <button
                type="button"
                className="rf-btn-save"
                onClick={handleUpdateAsset}
                disabled={updateAssetMutation.isPending || !assetName.trim() || !assetAmount.trim()}
              >
                {updateAssetMutation.isPending && updateAssetMutation.variables?.id === editingItem?.id
                  ? "Saving..."
                  : "Save"}
              </button>
              <button
                type="button"
                className="rf-btn-cancel"
                onClick={handleCancelEdit}
                disabled={updateAssetMutation.isPending}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="rf-btn-primary w-full"
              type="submit"
              disabled={addAssetMutation.isPending || !assetName.trim() || !assetAmount.trim()}
            >
              {addAssetMutation.isPending ? "Adding..." : "Add Asset"}
            </button>
          )}
        </form>
      </div>

      {/* Asset Linking Modal - rendered outside main container */}
      {selectedAssetId !== null && (
        <AssetLinkingModal
          assetId={selectedAssetId}
          assetName={assetData.find(a => a.id === selectedAssetId)?.name ?? 'Asset'}
          isOpen={isLinkingModalOpen}
          onClose={() => {
            setIsLinkingModalOpen(false);
            setSelectedAssetId(null);
          }}
        />
      )}

      {/* True Yield Card Modal - rendered outside main container */}
      {showYieldCard !== null && (
        <>
          {yieldLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 shadow-2xl">
                <div className="animate-pulse text-[#d4af37]">Loading yield analysis...</div>
              </div>
            </div>
          )}
          {yieldError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowYieldCard(null)}
              />
              <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 max-w-sm shadow-2xl">
                <div className="text-red-400 text-center mb-2 font-medium">
                  Failed to load yield analysis
                </div>
                <div className="text-gray-500 text-sm text-center mb-4">
                  {yieldError instanceof Error ? yieldError.message : 'An error occurred'}
                </div>
                <button
                  onClick={() => setShowYieldCard(null)}
                  className="w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded-lg transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {selectedAssetYield && !yieldError && !yieldLoading && (
            <TrueYieldCard 
              data={selectedAssetYield}
              isModal={true}
              onClose={() => setShowYieldCard(null)}
              onUpgrade={() => {
                // Handle upgrade navigation
                console.log('Navigate to upgrade page');
              }}
            />
          )}
        </>
      )}
    </>
  );
};

export default AssetsSection;