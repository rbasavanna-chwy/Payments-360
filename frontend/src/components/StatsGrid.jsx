import React from 'react';
import StatCard from './StatCard';
import { Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import './StatsGrid.css';

function StatsGrid({ statistics }) {
  if (!statistics) return null;

  return (
    <div className="stats-grid">
      <StatCard
        title="Total Payments"
        value={statistics.totalPayments}
        subtext="All transactions"
        color="total"
        icon={<Activity size={24} />}
      />
      <StatCard
        title="Completed"
        value={statistics.completedPayments}
        subtext={`$${statistics.completedAmount.toFixed(2)}`}
        color="completed"
        icon={<CheckCircle size={24} />}
      />
      <StatCard
        title="Pending"
        value={statistics.pendingPayments}
        subtext={`Success Rate: ${statistics.successRate.toFixed(1)}%`}
        color="pending"
        icon={<Clock size={24} />}
      />
      <StatCard
        title="Failed"
        value={statistics.failedPayments}
        subtext={`Avg: $${statistics.averageTransactionAmount.toFixed(2)}`}
        color="failed"
        icon={<XCircle size={24} />}
      />
    </div>
  );
}

export default StatsGrid;


