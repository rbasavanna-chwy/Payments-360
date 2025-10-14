import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AgedMetricsTabs from './components/AgedMetricsTabs';
import TransactionDetails from './components/TransactionDetails';
import { fetchPayments, fetchStatistics, generateSampleData } from './services/api';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Generate approval order data for the sidebar view
  const approvalOrdersData = useMemo(() => {
    const now = new Date();
    const data = [];
    const paymentStates = ['success', 'processing', 'failed', 'canceled', 'expired', 'declined'];
    const productNames = [
      'Premium Subscription', 'Basic Plan', 'Pro Package', 'Starter Kit', 
      'Monthly Membership', 'Annual Pass', 'Digital Download', 'Gift Card',
      'Product Bundle', 'Service Package', 'Elite Access', 'Standard Package'
    ];

    let orderIdCounter = 2000;
    let customerIdCounter = 6000;

    // Generate more comprehensive approval data
    const scenarios = [
      { days: 0, count: 25, amount: 32000 },
      { days: 1, count: 30, amount: 38000 },
      { days: 2, count: 20, amount: 25000 },
      { days: 3, count: 18, amount: 22000 },
      { days: 4, count: 15, amount: 19000 },
      { days: 5, count: 12, amount: 15000 },
      { days: 6, count: 10, amount: 13000 },
      { days: 7, count: 8, amount: 10000 }
    ];

    scenarios.forEach(scenario => {
      for (let i = 0; i < scenario.count; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - scenario.days - Math.floor(Math.random() * 2));
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const items = [];
        let totalItemAmount = 0;
        for (let j = 0; j < itemCount; j++) {
          const itemPrice = Math.floor(Math.random() * 150) + 10; // Price between $10-$160
          items.push({
            itemId: `ITEM-${1000 + Math.floor(Math.random() * 9000)}`,
            name: productNames[Math.floor(Math.random() * productNames.length)],
            price: itemPrice
          });
          totalItemAmount += itemPrice;
        }
        
        // Generate last updated time (1-6 hours after creation)
        const lastUpdated = new Date(date);
        lastUpdated.setHours(lastUpdated.getHours() + Math.floor(Math.random() * 6) + 1);
        
        data.push({
          id: `txn_${orderIdCounter}_${Date.now()}_${i}`,
          customerId: `CUST-${customerIdCounter + Math.floor(Math.random() * 1000)}`,
          orderId: `ORD-${orderIdCounter++}`,
          items: items,
          itemCount: itemCount,
          date: date.toISOString(),
          lastUpdated: lastUpdated.toISOString(),
          amount: totalItemAmount,
          orderType: Math.random() > 0.5 ? 'regular' : 'autoship',
          paymentMethod: ['creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance'][Math.floor(Math.random() * 5)],
          paymentState: paymentStates[Math.floor(Math.random() * paymentStates.length)]
        });
      }
    });

    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [paymentsData, statsData] = await Promise.all([
        fetchPayments(),
        fetchStatistics()
      ]);
      
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      setStatistics(statsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
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
        />
        {activeView === 'home' && (
          <>
            <AgedMetricsTabs />
          </>
        )}
        {activeView === 'approvals' && (
          <TransactionDetails
            transactions={approvalOrdersData}
            ageGroup="All Approvals"
            onClose={() => setActiveView('home')}
            allOrderTypes={['regular', 'autoship']}
            allPaymentMethods={['creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance']}
            allPaymentStates={['success', 'processing', 'failed', 'canceled', 'expired', 'declined']}
            isFullPage={true}
            defaultDateFilter="last_7_days"
          />
        )}
        {activeView === 'deposit' && (
          <div className="detail-view">
            <h2>Deposit Approval Details</h2>
            <p>Detailed view of deposit approvals will be displayed here.</p>
          </div>
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
      </div>
    </div>
  );
}

export default App;

