import React from 'react';
import { RefreshCw, Database } from 'lucide-react';
import './Controls.css';

function Controls({
  onRefresh,
  onGenerateSampleData,
  statusFilter,
  setStatusFilter
}) {
  return (
    <div className="controls">
      <button className="btn btn-primary" onClick={onRefresh}>
        <RefreshCw size={16} />
        Refresh
      </button>
      <button className="btn btn-secondary" onClick={onGenerateSampleData}>
        <Database size={16} />
        Generate Sample Data
      </button>
      <select
        className="filter-select"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PROCESSING">Processing</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed</option>
        <option value="REFUNDED">Refunded</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>
  );
}

export default Controls;

