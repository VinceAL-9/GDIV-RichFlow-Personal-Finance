import React from 'react';

/**
 * Column definition for the FinancialTable component.
 * @template T - The type of data items in the table
 */
export interface ColumnDefinition<T> {
  /** Column header text */
  header: string;
  /** Key to access the value from the data item, or a render function */
  accessor: keyof T | ((item: T) => React.ReactNode);
  /** Optional CSS class for the column */
  className?: string;
  /** Alignment for the column content */
  align?: 'left' | 'center' | 'right';
}

/**
 * Footer definition for displaying totals
 */
export interface FooterDefinition {
  /** Label for the total row (e.g., "Total", "Total Assets") */
  label: string;
  /** The total value to display */
  value: React.ReactNode;
}

/**
 * Props for the FinancialTable component
 * @template T - The type of data items in the table
 */
export interface FinancialTableProps<T extends { id: number | string }> {
  /** Table title displayed in the header */
  title: string;
  /** Array of data items to display */
  data: T[];
  /** Column definitions for the table */
  columns: ColumnDefinition<T>[];
  /** Optional footer for displaying totals */
  footer?: FooterDefinition;
  /** Callback when edit button is clicked (if provided, shows edit button) */
  onEdit?: (item: T) => void;
  /** Callback when delete button is clicked (if provided, shows delete button) */
  onDelete?: (item: T) => void;
  /** Message to display when data array is empty */
  emptyMessage?: string;
  /** Optional ID of item currently being edited (to disable other actions) */
  editingId?: number | string | null;
  /** Optional ID of item currently being deleted (shows loading state) */
  deletingId?: number | string | null;
  /** Whether to show a compact header style */
  compactHeader?: boolean;
  /** Optional custom class name for the container */
  className?: string;
  /** If true, does not render the rf-card wrapper (for embedding inside another card) */
  noCard?: boolean;
  /** Optional custom row actions renderer */
  renderRowActions?: (item: T) => React.ReactNode;
}

/**
 * A reusable financial data table component that supports:
 * - Generic data types with typed column accessors
 * - Optional edit/delete actions (read-only when not provided)
 * - Footer row for totals
 * - Loading states for edit/delete operations
 * - Consistent styling with the application theme
 */
function FinancialTable<T extends { id: number | string }>({
  title,
  data,
  columns,
  footer,
  onEdit,
  onDelete,
  emptyMessage = 'No data available',
  editingId = null,
  deletingId = null,
  compactHeader = false,
  className = '',
  noCard = false,
  renderRowActions,
}: FinancialTableProps<T>): React.ReactElement {
  const hasActions = Boolean(onEdit || onDelete);
  const hasCustomActions = Boolean(renderRowActions);
  const isAnyOperationInProgress = editingId !== null || deletingId !== null;

  /**
   * Renders a cell value based on the column accessor
   */
  const renderCellValue = (item: T, accessor: ColumnDefinition<T>['accessor']): React.ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    const value = item[accessor];
    // Handle various value types
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  /**
   * Gets the text alignment class for a column
   */
  const getAlignmentClass = (align?: 'left' | 'center' | 'right'): string => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={`${noCard ? '' : 'rf-card'} ${className}`.trim()}>
      {/* Table Header */}
      {title && (
        <div className={compactHeader ? 'rf-section-header-sm' : 'rf-section-header'}>
          {title}
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 ? (
        <p className="rf-empty">{emptyMessage}</p>
      ) : (
        /* Scrollable Table Container */
        <div className="rf-scroll-list">
          {data.map((item) => (
            <div key={item.id} className="rf-list-item">
              {/* Render each column */}
              {columns.map((column, colIndex) => (
                <span
                  key={colIndex}
                  className={`
                    ${colIndex === 0 ? 'rf-list-item-name' : 'rf-list-item-amount'}
                    ${getAlignmentClass(column.align)}
                    ${column.className || ''}
                  `.trim()}
                >
                  {renderCellValue(item, column.accessor)}
                </span>
              ))}

              {/* Action Buttons (only if handlers provided) */}
              {(hasActions || hasCustomActions) && (
                <div className="rf-list-item-actions flex items-center gap-1">
                  {/* Custom row actions */}
                  {renderRowActions && renderRowActions(item)}
                  {onEdit && (
                    <button
                      className="rf-btn-edit"
                      onClick={() => onEdit(item)}
                      disabled={isAnyOperationInProgress}
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="rf-btn-delete"
                      onClick={() => onDelete(item)}
                      disabled={deletingId === item.id || editingId !== null}
                    >
                      {deletingId === item.id ? '...' : '✕'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer (Total Row) */}
      {footer && data.length > 0 && (
        <div className="rf-list-item" style={{ borderBottom: 'none', marginTop: '0.5rem' }}>
          <span className="rf-list-item-name font-bold">{footer.label}</span>
          <span className="rf-list-item-amount font-bold">{footer.value}</span>
          {/* Spacer to align with action buttons if present */}
          {(hasActions || hasCustomActions) && <div className="rf-list-item-actions" style={{ visibility: 'hidden' }}>
            <button className="rf-btn-edit" style={{ visibility: 'hidden' }}>Edit</button>
            <button className="rf-btn-delete" style={{ visibility: 'hidden' }}>✕</button>
          </div>}
        </div>
      )}
    </div>
  );
}

export default FinancialTable;
