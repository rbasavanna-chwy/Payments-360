import React, { useState } from 'react';
import { X, Download, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import DateFilter from './DateFilter';
import OrderDetailsView from './OrderDetailsView';
import './TransactionDetails.css';

function TransactionDetails({ transactions, ageGroup, onClose, allOrderTypes, allPaymentMethods, allPaymentStates, isFullPage = false, defaultDateFilter = '', defaultOrderType = '', defaultPaymentMethod = '', defaultPaymentState = '', activeTab = 'approvals' }) {
  // Helper functions for formatting (defined early for state initialization)
  const formatPaymentMethod = (method) => {
    if (!method) return method;
    // Remove underscores and spaces, convert to lowercase for lookup
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

  const formatPaymentState = (state) => {
    if (!state) return state;
    // Handle underscore format (e.g., "IN_PROGRESS" -> "In Progress")
    if (state.includes('_')) {
      return state.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    // Handle single word or already formatted
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  const formatOrderType = (orderType) => {
    if (!orderType) return orderType;
    // Handle underscore format
    if (orderType.includes('_')) {
      return orderType.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    // Handle single word
    return orderType.charAt(0).toUpperCase() + orderType.slice(1);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [orderTypeFilter, setOrderTypeFilter] = useState(defaultOrderType);
  // Format default values to match the transaction format
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(defaultPaymentMethod ? formatPaymentMethod(defaultPaymentMethod) : '');
  const [paymentStateFilter, setPaymentStateFilter] = useState(defaultPaymentState ? formatPaymentState(defaultPaymentState) : '');
  const [dateFilter, setDateFilter] = useState(defaultDateFilter);
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getDateRangeFromFilter = (filter) => {
    const now = new Date();
    let startDate, endDate = now;

    switch(filter) {
      case 'last_15_min':
        startDate = new Date(now - 15 * 60 * 1000);
        break;
      case 'last_60_min':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case 'last_4_hours':
        startDate = new Date(now - 4 * 60 * 60 * 1000);
        break;
      case 'last_24_hours':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_28_days':
        startDate = new Date(now - 28 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_week':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case 'last_1_month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'custom':
        if (customDateRange.startDate && customDateRange.endDate) {
          startDate = new Date(customDateRange.startDate);
          endDate = new Date(customDateRange.endDate);
        }
        break;
      default:
        return null;
    }

    return startDate && endDate ? { startDate, endDate } : null;
  };

  const getSortedTransactions = () => {
    let filtered = [...transactions];

    // Apply date filter
    if (dateFilter) {
      const dateRange = getDateRangeFromFilter(dateFilter);
      if (dateRange) {
        filtered = filtered.filter(t => {
          const itemDate = new Date(t.date);
          return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
        });
      }
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.orderId?.toLowerCase().includes(search) ||
        t.customerName?.toLowerCase().includes(search) ||
        t.orderType?.toLowerCase().includes(search) ||
        t.paymentMethod?.toLowerCase().includes(search) ||
        t.paymentState?.toLowerCase().includes(search) ||
        t.errorMessage?.toLowerCase().includes(search)
      );
    }

    // Apply dropdown filters - format transaction values to match filter values
    if (orderTypeFilter) {
      filtered = filtered.filter(t => {
        const formattedOrderType = formatOrderType(t.orderType);
        return formattedOrderType === orderTypeFilter;
      });
    }
    if (paymentMethodFilter) {
      filtered = filtered.filter(t => {
        const formattedPaymentMethod = formatPaymentMethod(t.paymentMethod);
        return formattedPaymentMethod === paymentMethodFilter;
      });
    }
    if (paymentStateFilter) {
      filtered = filtered.filter(t => {
        const formattedPaymentState = formatPaymentState(t.paymentState);
        return formattedPaymentState === paymentStateFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'date' || sortConfig.key === 'lastUpdated') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortConfig.key === 'amount') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const sortedTransactions = getSortedTransactions();

  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset to page 1 when search, sort, or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, orderTypeFilter, paymentMethodFilter, paymentStateFilter, dateFilter, customDateRange]);

  // Use provided filter values or fall back to current transaction values
  // Format the order types from allOrderTypes if provided, otherwise use transaction values
  const uniqueOrderTypes = allOrderTypes 
    ? [...new Set(allOrderTypes.map(t => formatOrderType(t)))]
    : [...new Set(transactions.map(t => t.orderType).filter(Boolean).map(t => formatOrderType(t)))];
  // Format the payment methods from allPaymentMethods if provided, otherwise use transaction values
  const uniquePaymentMethods = allPaymentMethods 
    ? [...new Set(allPaymentMethods.map(m => formatPaymentMethod(m)))]
    : [...new Set(transactions.map(t => t.paymentMethod).filter(Boolean).map(m => formatPaymentMethod(m)))];
  // Format the payment states if provided, otherwise use transaction values
  const uniquePaymentStates = allPaymentStates
    ? [...new Set(allPaymentStates.map(s => formatPaymentState(s)))]
    : [...new Set(transactions.map(t => t.paymentState).filter(Boolean).map(s => formatPaymentState(s)))];

  const handleClearFilters = () => {
    setOrderTypeFilter('');
    setPaymentMethodFilter('');
    setPaymentStateFilter('');
    setDateFilter('');
    setCustomDateRange({ startDate: '', endDate: '' });
    setSearchTerm('');
  };

  const activeFiltersCount = [orderTypeFilter, paymentMethodFilter, paymentStateFilter, dateFilter].filter(Boolean).length;

  const handleExport = () => {
    const columnHeaders = getColumnHeaders();
    const headers = ['Order ID', 'Order Type', 'Payment Method', columnHeaders.amount1, 'Payment State', columnHeaders.amount2, 'Reason'];
    const rows = sortedTransactions.map(t => [
      t.orderId || 'N/A',
      t.orderType ? (t.orderType.charAt(0).toUpperCase() + t.orderType.slice(1)) : 'N/A',
      t.paymentMethod,
      t.amount.toFixed(2),
      t.paymentState,
      t.paymentState?.toLowerCase() === 'success' ? t.amount.toFixed(2) : '0.00',
      t.errorMessage || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${ageGroup.replace(/\s+/g, '-')}.csv`;
    a.click();
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

  const handleOrderIdClick = (transaction) => {
    setSelectedOrder(transaction);
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
  };

  // Get header title based on active tab
  const getHeaderTitle = () => {
    const titles = {
      'approvals': 'Approval Order Details',
      'deposit': 'Deposit Order Details',
      'refunds': 'Refund Order Details',
      'reverseApproval': 'Reverse Approval Order Details'
    };
    return titles[activeTab] || 'Approval Order Details';
  };

  // Get column headers based on active tab
  const getColumnHeaders = () => {
    switch (activeTab) {
      case 'deposit':
        return {
          amount1: 'Depositing Amount',
          amount2: 'Deposited Amount'
        };
      case 'refunds':
        return {
          amount1: 'Refund Amount',
          amount2: 'Refunded Amount'
        };
      case 'reverseApproval':
        return {
          amount1: 'Reversing Approval Amount',
          amount2: 'Reversing Approved Amount'
        };
      case 'approvals':
      default:
        return {
          amount1: 'Approval amount',
          amount2: 'Approved Amount'
        };
    }
  };

  return (
    <div className={isFullPage ? "transaction-details-fullpage" : "transaction-details-overlay"} onClick={isFullPage ? undefined : onClose}>
      <div className={isFullPage ? "transaction-details-container" : "transaction-details-modal"} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{getHeaderTitle()}</h2>
            <span className="age-group-badge">{ageGroup}</span>
            <span className="transaction-count">{sortedTransactions.length} transactions</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by Order ID, Order Type, Payment Method, Payment State, or Reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="export-btn" onClick={handleExport}>
            <Download size={18} />
            Export CSV
          </button>
        </div>

        <div className="filter-toolbar">
          <div className="filter-group">
            <Filter size={16} />
            <span className="filter-label">Filters:</span>
            
            <div className="filter-item-inline">
              <DateFilter 
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                customDateRange={customDateRange}
                setCustomDateRange={setCustomDateRange}
                idPrefix="transaction-details"
              />
            </div>
            
            <div className="filter-item">
              <label>Order Type</label>
              <select 
                value={orderTypeFilter} 
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All</option>
                {uniqueOrderTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Payment Method</label>
              <select 
                value={paymentMethodFilter} 
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All</option>
                {uniquePaymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Payment State</label>
              <select 
                value={paymentStateFilter} 
                onChange={(e) => setPaymentStateFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All</option>
                {uniquePaymentStates.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        <div className="modal-content">
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('orderId')} className="sortable">
                    Order ID
                    {sortConfig.key === 'orderId' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('orderType')} className="sortable">
                    Order Type
                    {sortConfig.key === 'orderType' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('paymentMethod')} className="sortable">
                    Payment Method
                    {sortConfig.key === 'paymentMethod' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('amount')} className="sortable">
                    {getColumnHeaders().amount1}
                    {sortConfig.key === 'amount' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('paymentState')} className="sortable">
                    Payment State
                    {sortConfig.key === 'paymentState' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('amount')} className="sortable">
                    {getColumnHeaders().amount2}
                    {sortConfig.key === 'amount' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort('errorMessage')} className="sortable">
                    Reason
                    {sortConfig.key === 'errorMessage' && (
                      <span className="sort-indicator">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>
                        <span 
                          className="order-id clickable-order-id" 
                          onClick={() => handleOrderIdClick(transaction)}
                          title="Click to view order details"
                        >
                          {transaction.orderId || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`order-type-badge ${transaction.orderType === 'autoship' ? 'autoship' : 'regular'}`}>
                          {transaction.orderType ? (transaction.orderType.charAt(0).toUpperCase() + transaction.orderType.slice(1)) : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="payment-method">{formatPaymentMethod(transaction.paymentMethod)}</span>
                      </td>
                      <td>
                        <span className="amount">${transaction.amount.toFixed(2)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(transaction.paymentState)}`}>
                          {transaction.paymentState?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="amount">
                          ${transaction.paymentState?.toLowerCase() === 'success' ? transaction.amount.toFixed(2) : '0.00'}
                        </span>
                      </td>
                      <td>
                        <span className="reason" title={transaction.errorMessage ? `Full message: ${transaction.errorMessage}` : 'No error'}>
                          {transaction.errorMessage || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <div className="footer-info">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} of {sortedTransactions.length} transactions
            </div>
            <div className="items-per-page">
              <label>Rows per page:</label>
              <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              «
            </button>
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              className="pagination-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsView 
          order={selectedOrder} 
          onClose={handleCloseOrderDetails} 
        />
      )}
    </div>
  );
}

export default TransactionDetails;

