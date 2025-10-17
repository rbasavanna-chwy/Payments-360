import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewChart from './components/OverviewChart';
import AgedMetricsTabs from './components/AgedMetricsTabs';
import TransactionDetails from './components/TransactionDetails';
import OrderDetailsView from './components/OrderDetailsView';
import { 
  fetchPayments, 
  fetchStatistics, 
  generateSampleData,
  fetchOrderTypes,
  fetchPaymentMethods,
  fetchPaymentStatuses
} from './services/api';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [approvalOrdersData, setApprovalOrdersData] = useState([]);
  const [depositOrdersData, setDepositOrdersData] = useState([]);
  
  // Dynamic filter options from API
  const [orderTypes, setOrderTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentStates, setPaymentStates] = useState([]);

  // Helper function to convert backend enum format to frontend format
  const normalizeEnumValue = (value) => {
    if (!value) return value;
    return value.toLowerCase().replace(/_/g, '');
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [paymentsData, statsData, orderTypesData, paymentMethodsData, paymentStatesData] = await Promise.all([
        fetchPayments(),
        fetchStatistics(),
        fetchOrderTypes(),
        fetchPaymentMethods(),
        fetchPaymentStatuses()
      ]);
      
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      setStatistics(statsData);
      
      // Set filter options from API
      setOrderTypes(orderTypesData.map(o => o.value));
      setPaymentMethods(paymentMethodsData.map(m => m.value));
      setPaymentStates(paymentStatesData.map(s => s.value));
      
      // Process payments for approval and deposit views
      const approvals = paymentsData.filter(p => 
        (p.approvalAmount && p.approvalAmount > 0) || (p.approvedAmount && p.approvedAmount > 0)
      ).map(p => {
        const mappedPayment = {
          id: p.id,
          customerId: p.customerId,
          orderId: p.orderId,
          transactionId: p.transactionId,
          date: p.createdAt,
          lastUpdated: p.updatedAt,
          amount: p.approvalAmount || p.approvedAmount || 0,
          orderType: p.orderType ? normalizeEnumValue(p.orderType) : 'regular',
          paymentMethod: p.paymentMethod ? normalizeEnumValue(p.paymentMethod) : 'creditcard',
          paymentState: p.status ? (p.status.toLowerCase() === 'cancelled' ? 'canceled' : normalizeEnumValue(p.status)) : 'pending',
          cardType: p.cardType, // Include card type for credit cards
          validationStatus: p.validationStatus,
          errorMessage: p.errorMessage,
          // Include approval-specific amounts
          approvalAmount: p.approvalAmount,
          approvedAmount: p.approvedAmount,
          depositingAmount: p.depositingAmount,
          depositedAmount: p.depositedAmount,
          refundAmount: p.refundAmount,
          refundedAmount: p.refundedAmount,
          reversingApprovalAmount: p.reversingApprovalAmount,
          reversingApprovedAmount: p.reversingApprovedAmount,
          items: [] // Items removed as per requirement
        };
        
        return mappedPayment;
      });
      
      const deposits = paymentsData.filter(p => 
        (p.depositingAmount && p.depositingAmount > 0) || (p.depositedAmount && p.depositedAmount > 0)
      ).map(p => {
        const mappedPayment = {
          id: p.id,
          customerId: p.customerId,
          orderId: p.orderId,
          transactionId: p.transactionId,
          date: p.createdAt,
          lastUpdated: p.updatedAt,
          amount: p.depositingAmount || p.depositedAmount || 0,
          orderType: p.orderType ? normalizeEnumValue(p.orderType) : 'regular',
          paymentMethod: p.paymentMethod ? normalizeEnumValue(p.paymentMethod) : 'creditcard',
          paymentState: p.status ? (p.status.toLowerCase() === 'cancelled' ? 'canceled' : normalizeEnumValue(p.status)) : 'pending',
          cardType: p.cardType, // Include card type for credit cards
          validationStatus: p.validationStatus,
          errorMessage: p.errorMessage,
          // Include deposit-specific amounts
          approvalAmount: p.approvalAmount,
          approvedAmount: p.approvedAmount,
          depositingAmount: p.depositingAmount,
          depositedAmount: p.depositedAmount,
          refundAmount: p.refundAmount,
          refundedAmount: p.refundedAmount,
          reversingApprovalAmount: p.reversingApprovalAmount,
          reversingApprovedAmount: p.reversingApprovedAmount,
          items: [] // Items removed as per requirement
        };
        
        return mappedPayment;
      });
      
      // Always use database data only (no mock data fallback)
      setApprovalOrdersData(approvals);
      setDepositOrdersData(deposits);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set empty arrays if API fails (no mock data fallback)
      setApprovalOrdersData([]);
      setDepositOrdersData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Auto-refresh every 5 minutes instead of 30 seconds to reduce load
    const interval = setInterval(loadDashboard, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = [...payments];
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Apply search filter for Order ID
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.orderId && p.orderId.toLowerCase().includes(query))
      );
    }
    
    setFilteredPayments(filtered);
  }, [payments, statusFilter, searchQuery]);

  const handleGenerateSampleData = async () => {
    try {
      await generateSampleData();
      await loadDashboard();
      alert('Sample data generated successfully!');
    } catch (error) {
      console.error('Error generating sample data:', error);
      alert('Error generating sample data');
    }
  };

  const handleSearchOrderId = (orderId) => {
    if (!orderId || !orderId.trim()) return;
    
    // Find the order with matching ID (case-insensitive)
    const normalizedSearchId = orderId.trim().toLowerCase();
    const foundOrder = payments.find(p => 
      p.orderId && p.orderId.toLowerCase() === normalizedSearchId
    );
    
    if (foundOrder) {
      // Map the payment data to the format expected by OrderDetailsView
      const orderData = {
        ...foundOrder,
        date: foundOrder.createdAt,
        lastUpdated: foundOrder.updatedAt,
        paymentState: foundOrder.status,
        orderType: foundOrder.orderType,
        transactionId: foundOrder.transactionId,
        cardType: foundOrder.cardType, // Explicitly include card type
        validationStatus: foundOrder.validationStatus // Explicitly include validation status
      };
      setSelectedOrder(orderData);
    } else {
      alert(`Order ID "${orderId}" not found`);
    }
  };

  return (
    <div className="app">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onCollapse={setSidebarCollapsed}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchOrderId={handleSearchOrderId}
        />
        {activeView === 'home' && (
          <>
            <OverviewChart onNavigate={(view) => setActiveView(view)} />
            <AgedMetricsTabs />
          </>
        )}
        {activeView === 'approvals' && (
          <TransactionDetails
            transactions={approvalOrdersData}
            ageGroup="All Approvals"
            onClose={() => setActiveView('home')}
            allOrderTypes={orderTypes}
            allPaymentMethods={paymentMethods}
            allPaymentStates={paymentStates}
            isFullPage={true}
            defaultDateFilter="last_7_days"
            activeTab="approvals"
          />
        )}
        {activeView === 'deposit' && (
          <TransactionDetails
            transactions={depositOrdersData}
            ageGroup="All Deposits"
            onClose={() => setActiveView('home')}
            allOrderTypes={orderTypes}
            allPaymentMethods={paymentMethods}
            allPaymentStates={paymentStates}
            isFullPage={true}
            defaultDateFilter="last_7_days"
            activeTab="deposit"
          />
        )}
        {activeView === 'refunds' && (
          <div className="detail-view">
            <h2>Refund Order Details</h2>
            <p>Detailed view of refund orders will be displayed here.</p>
          </div>
        )}
        {activeView === 'reverseApproval' && (
          <div className="detail-view">
            <h2>Reverse Approval Order Details</h2>
            <p>Detailed view of reverse approval orders will be displayed here.</p>
          </div>
        )}
        {activeView === 'dataAlerts' && (
          <div className="detail-view">
            <h2>Data Alerts</h2>
            <p>View and manage data alerts and notifications for payment processing.</p>
          </div>
        )}
        {activeView === 'settings' && (
          <div className="detail-view">
            <h2>Settings</h2>
            <p>Application settings will be displayed here.</p>
          </div>
        )}
        
        {selectedOrder && (
          <OrderDetailsView
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;

