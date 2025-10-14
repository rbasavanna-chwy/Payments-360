import React from 'react';
import { Loader2 } from 'lucide-react';
import './PaymentsTable.css';

function PaymentsTable({ payments, loading, lastUpdated }) {
  const formatPaymentMethod = (method) => {
    return method.replace(/_/g, ' ');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  if (loading) {
    return (
      <div className="payments-section">
        <div className="loading">
          <Loader2 className="spinner" size={40} />
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-section">
      <div className="section-header">
        <div>
          <h2>Recent Transactions</h2>
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {payments.length === 0 ? (
        <div className="no-data">
          <p>No payments found. Click "Generate Sample Data" to add test data.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.orderId || '-'}</strong>
                  </td>
                  <td>
                    <div className="customer-info">
                      <div className="customer-name">{payment.customerName}</div>
                      <div className="customer-email">{payment.customerEmail}</div>
                    </div>
                  </td>
                  <td>
                    <strong>${payment.amount.toFixed(2)}</strong> {payment.currency}
                  </td>
                  <td>{formatPaymentMethod(payment.paymentMethod)}</td>
                  <td>
                    <span className={getStatusClass(payment.status)}>
                      {payment.status}
                    </span>
                  </td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>{payment.transactionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PaymentsTable;


