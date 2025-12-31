import React, { useState } from 'react';
import {
  useAssetYieldQuery,
  useAvailableIncomeLinesQuery,
  useAvailableLiabilitiesQuery,
  useLinkIncomeToAssetMutation,
  useUnlinkIncomeFromAssetMutation,
  useLinkLiabilityToAssetMutation,
  useUnlinkLiabilityFromAssetMutation,
} from '../../hooks/queries/useTrueYield';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/currency.utils';
import type { LinkedIncomeLine, LinkedLiability } from '../../types/trueYield.types';

interface AssetLinkingModalProps {
  assetId: number;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'income' | 'liability';

/**
 * Modal for linking income streams and liabilities to an asset
 * Part of the True Yield Engine feature
 */
const AssetLinkingModal: React.FC<AssetLinkingModalProps> = ({
  assetId,
  assetName,
  isOpen,
  onClose,
}) => {
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('income');
  const [selectedIncomeId, setSelectedIncomeId] = useState<number | null>(null);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<number | null>(null);

  // Queries
  const { data: assetYield, isLoading: isLoadingYield } = useAssetYieldQuery(assetId, isOpen);
  const { data: availableIncomeLines, isLoading: isLoadingIncome } = useAvailableIncomeLinesQuery();
  const { data: availableLiabilities, isLoading: isLoadingLiabilities } = useAvailableLiabilitiesQuery();

  // Mutations
  const linkIncomeMutation = useLinkIncomeToAssetMutation();
  const unlinkIncomeMutation = useUnlinkIncomeFromAssetMutation();
  const linkLiabilityMutation = useLinkLiabilityToAssetMutation();
  const unlinkLiabilityMutation = useUnlinkLiabilityFromAssetMutation();

  if (!isOpen) return null;

  const linkedIncomeLines = assetYield?.linkedIncomeLines || [];
  const linkedLiabilities = assetYield?.linkedLiabilities || [];

  const handleLinkIncome = async () => {
    if (!selectedIncomeId) return;
    try {
      await linkIncomeMutation.mutateAsync({ assetId, incomeLineId: selectedIncomeId });
      setSelectedIncomeId(null);
    } catch (error) {
      console.error('Failed to link income:', error);
    }
  };

  const handleUnlinkIncome = async (incomeLineId: number) => {
    try {
      await unlinkIncomeMutation.mutateAsync({ incomeLineId, assetId });
    } catch (error) {
      console.error('Failed to unlink income:', error);
    }
  };

  const handleLinkLiability = async () => {
    if (!selectedLiabilityId) return;
    try {
      await linkLiabilityMutation.mutateAsync({ assetId, liabilityId: selectedLiabilityId });
      setSelectedLiabilityId(null);
    } catch (error) {
      console.error('Failed to link liability:', error);
    }
  };

  const handleUnlinkLiability = async (liabilityId: number) => {
    try {
      await unlinkLiabilityMutation.mutateAsync({ liabilityId, assetId });
    } catch (error) {
      console.error('Failed to unlink liability:', error);
    }
  };

  const isLoading = isLoadingYield || isLoadingIncome || isLoadingLiabilities;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a] bg-linear-to-r from-purple-500/10 to-purple-700/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Link to Asset</h2>
              <p className="text-sm text-gray-400">{assetName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'income'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Income ({linkedIncomeLines.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('liability')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'liability'
                ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Liabilities ({linkedLiabilities.length})
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : activeTab === 'income' ? (
            <div className="space-y-4">
              {/* Add Income Dropdown */}
              {availableIncomeLines && availableIncomeLines.length > 0 && (
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                  <label className="text-xs text-gray-400 block mb-2">
                    Add Income Stream
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedIncomeId || ''}
                      onChange={(e) => setSelectedIncomeId(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Select income stream...</option>
                      {availableIncomeLines.map((income: LinkedIncomeLine) => (
                        <option key={income.id} value={income.id}>
                          {income.name} - {formatCurrency(income.amount, currency)}/mo
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleLinkIncome}
                      disabled={!selectedIncomeId || linkIncomeMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {linkIncomeMutation.isPending ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Income List */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Linked Income Streams
                </label>
                {linkedIncomeLines.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No income streams linked yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedIncomeLines.map((income: LinkedIncomeLine) => (
                      <div
                        key={income.id}
                        className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{income.name}</div>
                          <div className="text-xs text-gray-400">
                            {income.type} • {formatCurrency(income.amount, currency)}/mo
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlinkIncome(income.id)}
                          disabled={unlinkIncomeMutation.isPending}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Unlink income"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availableIncomeLines?.length === 0 && linkedIncomeLines.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Add income streams in your dashboard to link them here
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Liability Dropdown */}
              {availableLiabilities && availableLiabilities.length > 0 && (
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                  <label className="text-xs text-gray-400 block mb-2">
                    Add Liability
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedLiabilityId || ''}
                      onChange={(e) => setSelectedLiabilityId(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Select liability...</option>
                      {availableLiabilities.map((liability: LinkedLiability) => (
                        <option key={liability.id} value={liability.id}>
                          {liability.name} - {formatCurrency(liability.value, currency)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleLinkLiability}
                      disabled={!selectedLiabilityId || linkLiabilityMutation.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {linkLiabilityMutation.isPending ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Liabilities List */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Linked Liabilities
                </label>
                {linkedLiabilities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No liabilities linked yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedLiabilities.map((liability: LinkedLiability) => (
                      <div
                        key={liability.id}
                        className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{liability.name}</div>
                          <div className="text-xs text-gray-400">
                            {formatCurrency(liability.value, currency)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlinkLiability(liability.id)}
                          disabled={unlinkLiabilityMutation.isPending}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Unlink liability"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availableLiabilities?.length === 0 && linkedLiabilities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Add liabilities in your dashboard to link them here
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a2a2a] bg-[#0f0f0f]">
          <p className="text-xs text-gray-500 text-center">
            Linking data helps calculate accurate yield metrics for this asset
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssetLinkingModal;
