import React, { useState, useEffect } from "react";
import { liabilitiesAPI } from "../../utils/api";
import "./LiabilitiesSection.css";

interface LiabilityItem {
  id: number;
  name: string;
  value: number;
}

type Props = {
  onTotalsChange?: (total: number) => void;
};

const LiabilitiesSection: React.FC<Props> = ({ onTotalsChange }) => {
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Fetch liabilities data on component mount
  useEffect(() => {
    fetchLiabilitiesData();
  }, []);

  const fetchLiabilitiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await liabilitiesAPI.getLiabilities();
      const list = Array.isArray(response) ? response : [];
      setLiabilities(list);
      // notify parent of total
      const total = list.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error fetching liabilities:", err);
      setError("Failed to load liabilities data");
      setLiabilities([]);
    } finally {
      setLoading(false);
    }
  };

  // handle add liability
  const handleAddLiability = async (name: string, amount: string) => {
    if (!name.trim() || !amount.trim() || isAdding) return;

    try {
      setIsAdding(true);
      setError(null);
      const response = await liabilitiesAPI.addLiability(name, parseFloat(amount));
      const newItem: LiabilityItem = response.liability || response;
      const updated = [...liabilities, newItem];
      setLiabilities(updated);
      const total = updated.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error adding liability:", err);
      setError("Failed to add liability");
    } finally {
      setIsAdding(false);
    }
  };

  // handle delete liability
  const handleDelete = async (id: number) => {
    if (isDeleting !== null) return;

    try {
      setIsDeleting(id);
      setError(null);
      await liabilitiesAPI.deleteLiability(id);
      const updated = liabilities.filter((i) => i.id !== id);
      setLiabilities(updated);
      const total = updated.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
    } catch (err: any) {
      console.error("Error deleting liability:", err);
      setError("Failed to delete liability");
    } finally {
      setIsDeleting(null);
    }
  };

  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityAmount, setLiabilityAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddLiability(liabilityName, liabilityAmount);
    setLiabilityName("");
    setLiabilityAmount("");
  };

  if (loading) {
    return <div className="liability-card">Loading...</div>;
  }

  return (
    <div className="liability-card">
      <div className="liability-card-header">Liabilities</div>

      {error && <p className="liability-error">{error}</p>}

      {liabilities.length === 0 ? (
        <p className="liability-empty">No liabilities added yet.</p>
      ) : (
        <div className="liability-list">
          {liabilities.map((item) => (
            <div key={item.id} className="liability-item">
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

      <form onSubmit={handleSubmit} className="liability-form">
        <input
          type="text"
          placeholder="Liability name"
          value={liabilityName}
          onChange={(e) => setLiabilityName(e.target.value)}
          disabled={isAdding}
        />
        <input
          type="number"
          placeholder="Total Cost"
          step="0.01"
          value={liabilityAmount}
          onChange={(e) => setLiabilityAmount(e.target.value)}
          disabled={isAdding}
        />
        <button type="submit" disabled={isAdding}>
          {isAdding ? "Adding..." : "Add Liability"}
        </button>
      </form>
    </div>
  );
};

export default LiabilitiesSection;