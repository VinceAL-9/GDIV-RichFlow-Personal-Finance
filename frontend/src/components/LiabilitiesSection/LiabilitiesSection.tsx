import React, { useState, useEffect } from "react";
import { liabilitiesAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/currency.utils";
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
  const { user } = useAuth();
  const currency = user?.preferredCurrency;
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  // handle edit liability
  const handleEdit = (id: number, name: string, value: number) => {
    setEditingId(id);
    setLiabilityName(name);
    setLiabilityAmount(value.toString());
  };

  // handle update liability
  const handleUpdate = async () => {
    if (!editingId || !liabilityName.trim() || !liabilityAmount.trim() || isUpdating !== null) return;

    try {
      setIsUpdating(editingId);
      setError(null);
      const response = await liabilitiesAPI.updateLiability(editingId, liabilityName, parseFloat(liabilityAmount));
      const updatedItem: LiabilityItem = response.liability || response;
      const updated = liabilities.map((i) => i.id === editingId ? updatedItem : i);
      setLiabilities(updated);
      const total = updated.reduce((s: number, i: any) => s + (typeof i.value === 'number' ? i.value : parseFloat(i.value || 0)), 0);
      onTotalsChange?.(total);
      setEditingId(null);
      setLiabilityName("");
      setLiabilityAmount("");
    } catch (err: any) {
      console.error("Error updating liability:", err);
      setError("Failed to update liability");
    } finally {
      setIsUpdating(null);
    }
  };

  // handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setLiabilityName("");
    setLiabilityAmount("");
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
    if (editingId !== null) {
      await handleUpdate();
    } else {
      await handleAddLiability(liabilityName, liabilityAmount);
      setLiabilityName("");
      setLiabilityAmount("");
    }
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
              <span>{formatCurrency(typeof item.value === "number" ? item.value : 0, currency)}</span>
              <div className="liability-item-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEdit(item.id, item.name, item.value)}
                  disabled={editingId !== null || isDeleting !== null}
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting === item.id || editingId !== null}
                >
                  ✕
                </button>
              </div>
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
          disabled={isAdding || isUpdating !== null}
        />
        {editingId !== null ? (
          <div className="liability-edit-actions">
            <button 
              type="button" 
              className="save-btn"
              onClick={handleUpdate}
              disabled={isUpdating !== null || !liabilityName.trim() || !liabilityAmount.trim()}
            >
              {isUpdating === editingId ? "Saving..." : "Save"}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleCancelEdit}
              disabled={isUpdating !== null}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button type="submit" disabled={isAdding}>
            {isAdding ? "Adding..." : "Add Liability"}
          </button>
        )}
      </form>
    </div>
  );
};

export default LiabilitiesSection;