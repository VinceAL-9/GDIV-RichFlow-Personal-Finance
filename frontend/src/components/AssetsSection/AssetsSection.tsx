import React, { useState, useEffect } from "react";
import { assetsAPI } from "../../utils/api";
import "./AssetsSection.css";

interface AssetItem {
  id: number;
  name: string;
  value: number;
}

type Props = {
  onTotalsChange?: (total: number) => void;
};

const AssetsSection: React.FC<Props> = ({ onTotalsChange }) => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Fetch assets data on component mount
  useEffect(() => {
    fetchAssetsData();
  }, []);

  const fetchAssetsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetsAPI.getAssets();
      const list = Array.isArray(response) ? response : [];
      setAssets(list);
      const total = list.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error fetching assets:", err);
      setError("Failed to load assets data");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // handle add asset
  const handleAddAsset = async (name: string, amount: string) => {
    if (!name.trim() || !amount.trim() || isAdding) return;

    try {
      setIsAdding(true);
      setError(null);
      const response = await assetsAPI.addAsset(name, parseFloat(amount));
      const newItem: AssetItem = response.asset || response;
      const updated = [...assets, newItem];
      setAssets(updated);
      const total = updated.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error adding asset:", err);
      setError("Failed to add asset");
    } finally {
      setIsAdding(false);
    }
  };

  // handle delete asset
  const handleDelete = async (id: number) => {
    if (isDeleting !== null) return;

    try {
      setIsDeleting(id);
      setError(null);
      await assetsAPI.deleteAsset(id);
      const updated = assets.filter((i) => i.id !== id);
      setAssets(updated);
      const total = updated.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error deleting asset:", err);
      setError("Failed to delete asset");
    } finally {
      setIsDeleting(null);
    }
  };

  const [assetName, setAssetName] = useState("");
  const [assetAmount, setAssetAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddAsset(assetName, assetAmount);
    setAssetName("");
    setAssetAmount("");
  };

  if (loading) {
    return <div className="asset-card">Loading...</div>;
  }

  return (
    <div className="asset-card">
      <div className="asset-card-header">Assets</div>

      {error && <p className="asset-error">{error}</p>}

      {assets.length === 0 ? (
        <p className="asset-empty">No assets added yet.</p>
      ) : (
        <div className="asset-list">
          {assets.map((item) => (
            <div key={item.id} className="asset-item">
              <span>{item.name}</span>
              <span>${typeof item.value === "number" ? item.value.toFixed(2) : "0.00"}</span>
              <button
                className="delete-btn"
                onClick={() => handleDelete(item.id)}
                disabled={isDeleting === item.id}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="asset-form">
        <input
          type="text"
          placeholder="Asset name"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          disabled={isAdding}
        />
        <input
          type="number"
          placeholder="Total Value"
          step="0.01"
          value={assetAmount}
          onChange={(e) => setAssetAmount(e.target.value)}
          disabled={isAdding}
        />
        <button type="submit" disabled={isAdding}>
          {isAdding ? "Adding..." : "Add Asset"}
        </button>
      </form>
    </div>
  );
};

export default AssetsSection;