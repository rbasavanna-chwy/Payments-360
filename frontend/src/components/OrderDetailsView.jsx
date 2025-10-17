import React, { useState } from 'react';
import { X } from 'lucide-react';
import './OrderDetailsView.css';

function OrderDetailsView({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('payment');

  if (!order) return null;

  const formatPaymentMethod = (method) => {
    if (!method) return method;
    const normalizedMethod = method.toLowerCase().replace(/[\s_]/g, '');
    const methodMap = {
      creditcard: 'Credit Card',
      debitcard: 'Debit Card',
      paypal: 'PayPal',
      applepay: 'Apple Pay',
      googlepay: 'Google Pay',
      giftcard: 'Gift Card',
      accountbalance: 'Account Balance'
    };
    return methodMap[normalizedMethod] || method;
  };

  const getStatusClass = (status) => {
    const statusMap = {
      // Original statuses
      success: 'status-success',
      processing: 'status-processing',
      failed: 'status-failed',
      canceled: 'status-canceled',
      cancelled: 'status-canceled',
      expired: 'status-expired',
      declined: 'status-declined',
      pending: 'status-pending',
      // New Final Status values
      approved: 'status-success',
      'partially approved': 'status-partial',
      partially_approved: 'status-partial',
      deposited: 'status-success',
      'partially deposited': 'status-partial',
      partially_deposited: 'status-partial',
      'approval pending': 'status-pending',
      approval_pending: 'status-pending',
      'deposit pending': 'status-pending',
      deposit_pending: 'status-pending',
      refunded: 'status-refunded',
      'partially refunded': 'status-partial',
      partially_refunded: 'status-partial'
    };
    return statusMap[status?.toLowerCase().replace(/_/g, ' ')] || statusMap[status?.toLowerCase()] || 'status-default';
  };

  const getValidationStatus = (paymentState) => {
    const state = paymentState?.toLowerCase();
    if (['success', 'completed', 'approved', 'deposited'].includes(state)) {
      return 'VALID';
    } else if (['failed', 'declined', 'cancelled', 'expired', 'refunded'].includes(state)) {
      return 'INVALID';
    } else {
      return 'PENDING';
    }
  };

  const getValidationStatusClass = (validationStatus) => {
    const statusMap = {
      'VALID': 'status-success',
      'INVALID': 'status-failed',
      'PENDING': 'status-pending'
    };
    return statusMap[validationStatus] || 'status-default';
  };

  // Determine deposit-specific status
  const getDepositStatus = () => {
    const depositingAmt = order.depositingAmount || 0;
    const depositedAmt = order.depositedAmount || 0;
    
    if (depositingAmt === 0) return 'NO DEPOSIT';
    if (depositedAmt === 0) return 'PENDING';
    if (depositedAmt >= depositingAmt) return 'SUCCESS';
    return 'PARTIAL';
  };

  // Determine refund-specific status
  const getRefundStatus = () => {
    const refundAmt = order.refundAmount || 0;
    const refundedAmt = order.refundedAmount || 0;
    
    if (refundAmt === 0) return 'NO REFUND';
    if (refundedAmt === 0) return 'PENDING';
    if (refundedAmt >= refundAmt) return 'REFUNDED';
    return 'PARTIAL REFUND';
  };

  // Determine overall order status based on the last stage that has data
  const getOverallOrderStatus = () => {
    // Check in reverse order of workflow: Refund -> Reverse Approval -> Deposit -> Approval
    
    // If there's refund data, this is the final status
    if (order.refundAmount > 0 || order.refundedAmount > 0) {
      const refundStatus = getRefundStatus();
      if (refundStatus === 'REFUNDED') return 'REFUND_SUCCESS';
      if (refundStatus === 'PARTIAL REFUND') return 'REFUND_PARTIAL';
      if (refundStatus === 'PENDING') return 'REFUND_PENDING';
      return 'REFUND_' + order.paymentState?.toUpperCase();
    }
    
    // If there's reverse approval data
    if (order.reversingApprovalAmount > 0 || order.reversingApprovedAmount > 0) {
      return 'REVERSE_APPROVAL_' + order.paymentState?.toUpperCase();
    }
    
    // If there's deposit data
    if (order.depositingAmount > 0 || order.depositedAmount > 0) {
      const depositStatus = getDepositStatus();
      if (depositStatus === 'SUCCESS') return 'DEPOSIT_SUCCESS';
      if (depositStatus === 'PARTIAL') return 'DEPOSIT_PARTIAL';
      if (depositStatus === 'PENDING') return 'DEPOSIT_PENDING';
      return 'DEPOSIT_' + order.paymentState?.toUpperCase();
    }
    
    // Otherwise, it's at approval stage
    return 'APPROVAL_' + order.paymentState?.toUpperCase();
  };

  return (
    <div className="order-details-overlay" onClick={onClose}>
      <div className="order-details-container" onClick={(e) => e.stopPropagation()}>
        <div className="order-details-header">
          <div className="order-id-section">
            <h1>Payment Order Details</h1>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="order-summary-section">
          <h2>Summary</h2>
          <div className="summary-grid">
            <div className="summary-column">
              <div className="summary-item">
                <div className="summary-label">Order ID</div>
                <div className="summary-value">
                  {order.orderId}
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Order Status</div>
                <div className="summary-value">
                  <span className={`status-badge ${getStatusClass(order.paymentState)}`}>
                    {getOverallOrderStatus()}
                  </span>
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Order Type</div>
                <div className="summary-value">
                  {order.orderType ? (order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)) : 'N/A'}
                </div>
              </div>
            </div>

            <div className="summary-column">
              <div className="summary-item">
                <div className="summary-label">Reference Id</div>
                <div className="summary-value">
                  {order.transactionId || 'N/A'}
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Requested Time</div>
                <div className="summary-value">
                  {new Date(order.date).toLocaleString()}
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-label">Last Updated</div>
                <div className="summary-value">
                  {order.lastUpdated ? new Date(order.lastUpdated).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-tabs-section">
          <div className="order-details-tabs-header">
            <button
              className={`order-details-tab-button ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              Payment
            </button>
            <button
              className={`order-details-tab-button ${activeTab === 'approval' ? 'active' : ''}`}
              onClick={() => setActiveTab('approval')}
            >
              Approval
            </button>
            {/* Only show Deposits tab if there's deposit data */}
            {(order.depositingAmount > 0 || order.depositedAmount > 0) && (
              <button
                className={`order-details-tab-button ${activeTab === 'deposits' ? 'active' : ''}`}
                onClick={() => setActiveTab('deposits')}
              >
                Deposits
              </button>
            )}
            {/* Only show Refund tab if there's refund data */}
            {(order.refundAmount > 0 || order.refundedAmount > 0) && (
              <button
                className={`order-details-tab-button ${activeTab === 'refund' ? 'active' : ''}`}
                onClick={() => setActiveTab('refund')}
              >
                Refund
              </button>
            )}
            {/* Only show Reverse Approval tab if there's reverse approval data */}
            {(order.reversingApprovalAmount > 0 || order.reversingApprovedAmount > 0) && (
              <button
                className={`order-details-tab-button ${activeTab === 'reverseApproval' ? 'active' : ''}`}
                onClick={() => setActiveTab('reverseApproval')}
              >
                Reverse Approval
              </button>
            )}
          </div>

          <div className="order-details-tab-content">
            {activeTab === 'payment' && (
              <div className="order-details-tab-panel">
                <div className="tab-table-container">
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Payment Method</th>
                        <th>Card Type</th>
                        <th>Validation Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="payment-method">{formatPaymentMethod(order.paymentMethod)}</span>
                        </td>
                        <td>
                          <span className="payment-type">
                            {/* Show cardType only for Credit Card, otherwise show N/A */}
                            {(() => {
                              const paymentMethodStr = String(order.paymentMethod || '').toLowerCase();
                              const normalized = paymentMethodStr.replace(/[\s_]/g, '');
                              const isCreditCard = normalized === 'creditcard' || paymentMethodStr.includes('credit');
                              
                              // Only show card brands (VISA, MASTERCARD, etc), not validation statuses
                              const cardBrands = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'];
                              const cardTypeUpper = order.cardType ? String(order.cardType).toUpperCase() : null;
                              const isCardBrand = cardTypeUpper && cardBrands.includes(cardTypeUpper);
                              
                              return (isCreditCard && isCardBrand) ? order.cardType : 'N/A';
                            })()}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getValidationStatusClass(order.validationStatus || getValidationStatus(order.paymentState))}`}>
                            {/* Always use validationStatus field for Validation Status column */}
                            {order.validationStatus || getValidationStatus(order.paymentState)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'approval' && (
              <div className="order-details-tab-panel">
                <div className="tab-table-container">
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Approval Amount</th>
                        <th>Approved Amount</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="amount-value">${order.amount.toFixed(2)}</span>
                        </td>
                        <td>
                          <span className="amount-value">
                            ${['failed', 'declined', 'processing'].includes(order.paymentState?.toLowerCase()) ? '0.00' : order.amount.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.paymentState)}`}>
                            {order.paymentState?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="reason-text">{order.errorMessage || '-'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Only show Deposits tab content if there's deposit data */}
            {activeTab === 'deposits' && (order.depositingAmount > 0 || order.depositedAmount > 0) && (
              <div className="order-details-tab-panel">
                {/* Only show deposit data if approval was successful */}
                {!['failed', 'declined', 'pending', 'processing'].includes(order.paymentState?.toLowerCase()) && (order.approvedAmount > 0 || order.depositingAmount > 0) ? (
                  <div className="tab-table-container">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Depositing Amount</th>
                          <th>Deposited Amount</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="amount-value">${order.depositingAmount?.toFixed(2) || '0.00'}</span>
                          </td>
                          <td>
                            <span className="amount-value">${order.depositedAmount?.toFixed(2) || '0.00'}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(getDepositStatus())}`}>
                              {getDepositStatus()}
                            </span>
                          </td>
                          <td>
                            <span className="reason-text">
                              {getDepositStatus() === 'PENDING' ? 'Deposit is pending' : 
                               getDepositStatus() === 'PARTIAL' ? 'Partially deposited' : 
                               getDepositStatus() === 'SUCCESS' ? 'Deposit completed' : '-'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data-message">
                    <p>No deposit data available. Approval must be successful before deposits can be processed.</p>
                  </div>
                )}
              </div>
            )}

            {/* Only show Refund tab content if there's refund data */}
            {activeTab === 'refund' && (order.refundAmount > 0 || order.refundedAmount > 0) && (
              <div className="order-details-tab-panel">
                {/* Only show refund data if deposit was successful */}
                {(order.depositedAmount > 0 || order.refundAmount > 0) ? (
                  <div className="tab-table-container">
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Refund Amount</th>
                          <th>Refunded Amount</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="amount-value">${order.refundAmount?.toFixed(2) || '0.00'}</span>
                          </td>
                          <td>
                            <span className="amount-value">${order.refundedAmount?.toFixed(2) || '0.00'}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(getRefundStatus())}`}>
                              {getRefundStatus()}
                            </span>
                          </td>
                          <td>
                            <span className="reason-text">
                              {getRefundStatus() === 'PENDING' ? 'Refund is pending' : 
                               getRefundStatus() === 'PARTIAL REFUND' ? 'Partially refunded' : 
                               getRefundStatus() === 'REFUNDED' ? 'Refund completed' : '-'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data-message">
                    <p>No refund data available. Deposit must be successful before refunds can be processed.</p>
                  </div>
                )}
              </div>
            )}

            {/* Only show Reverse Approval tab content if there's reverse approval data */}
            {activeTab === 'reverseApproval' && (order.reversingApprovalAmount > 0 || order.reversingApprovedAmount > 0) && (
              <div className="order-details-tab-panel">
                <h3>Reverse Approval Details</h3>
                <p>Reverse approval information for Order ID: {order.orderId}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsView;

