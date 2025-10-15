import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Clock, DollarSign, RefreshCw, Bell, Info, Calendar, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchPaymentStatuses, fetchPaymentMethods, fetchOrderTypes, fetchAgedMetrics } from '../services/api';
import DateFilter from './DateFilter';
import TransactionDetails from './TransactionDetails';
import './AgedMetricsTabs.css';

function AgedMetricsTabs() {
  // Helper function to format payment method names
  const formatPaymentMethod = (method) => {
    if (!method) return method;
    const normalizedMethod = method.toLowerCase().replace(/[\s_]/g, '');
    const methodMap = {
      creditcard: 'Credit Card',
      paypal: 'PayPal',
      applepay: 'Apple Pay',
      googlepay: 'Google Pay',
      giftcard: 'Gift Card',
      accountbalance: 'Account Balance'
    };
    return methodMap[normalizedMethod] || method;
  };

  // Calculate default date range (last 7 days with timestamp)
  const getDefaultDateRange = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const formatDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    return {
      from: formatDateTime(sevenDaysAgo),
      to: formatDateTime(today)
    };
  };

  const defaultRange = getDefaultDateRange();

  const [activeTab, setActiveTab] = useState('approvals');
  const [showTooltip, setShowTooltip] = useState(null); // Now tracks which tab's tooltip is showing
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [orderType, setOrderType] = useState('all'); // 'all', 'regular', 'subscription'
  const [paymentMethod, setPaymentMethod] = useState('all'); // 'all', 'creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance'
  const [paymentState, setPaymentState] = useState('all'); // 'all', 'success', 'processing', 'failed', 'canceled', 'expired', 'declined', 'pending'
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [frequency, setFrequency] = useState('daily'); // 'hourly', 'daily', 'weekly', 'monthly'
  
  // API data states
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRanges, setDateRanges] = useState({
    approvals: defaultRange,
    deposit: defaultRange,
    refunds: defaultRange,
    reverseApproval: defaultRange,
    alerts: defaultRange
  });
  const [filteredData, setFilteredData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar'
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [ageGroupTransactions, setAgeGroupTransactions] = useState([]);
  
  // Filter options from API
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([]);
  const [paymentStateOptions, setPaymentStateOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Generate sample data with actual dates - memoized to only run once
  const generateSampleData = useMemo(() => {
    return (scenarios) => {
      const now = new Date();
      const data = [];
      const paymentStates = ['success', 'processing', 'failed', 'canceled', 'expired', 'declined', 'pending'];
      const productNames = [
        'Premium Subscription', 'Basic Plan', 'Pro Package', 'Starter Kit', 
        'Monthly Membership', 'Annual Pass', 'Digital Download', 'Gift Card',
        'Product Bundle', 'Service Package', 'Elite Access', 'Standard Package'
      ];

      let orderIdCounter = 1000;
      let customerIdCounter = 5000;

      scenarios.forEach(scenario => {
        for (let i = 0; i < scenario.count; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - scenario.days - Math.floor(Math.random() * 2));
          
          // Generate random number of items (1-5) with prices
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
            customerId: `CUST-${customerIdCounter + Math.floor(Math.random() * 500)}`,
            orderId: `ORD-${orderIdCounter++}`,
            items: items,
            itemCount: itemCount,
            date: date.toISOString(),
            lastUpdated: lastUpdated.toISOString(),
            amount: totalItemAmount,
            orderType: ['regular', 'subscription', 'onetime', 'cvc_no_show_penality', 'loyalty', 'cwav_telemedicine'][Math.floor(Math.random() * 6)],
            paymentMethod: ['creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance'][Math.floor(Math.random() * 5)],
            paymentState: paymentStates[Math.floor(Math.random() * paymentStates.length)]
          });
        }
      });

      return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    };
  }, []);

  // Sample data - memoized to only generate once
  const sampleDataCache = useMemo(() => ({
    approvals: generateSampleData([
      { days: 0, count: 12, amount: 15240 },
      { days: 2, count: 8, amount: 9850 },
      { days: 5, count: 5, amount: 6320 },
      { days: 10, count: 3, amount: 4150 }
    ]),
    deposit: generateSampleData([
      { days: 0, count: 45, amount: 48920 },
      { days: 2, count: 18, amount: 22340 },
      { days: 5, count: 7, amount: 8450 },
      { days: 10, count: 2, amount: 3200 }
    ]),
    refunds: generateSampleData([
      { days: 0, count: 6, amount: 3240 },
      { days: 2, count: 9, amount: 5680 },
      { days: 5, count: 4, amount: 2890 },
      { days: 10, count: 2, amount: 1450 }
    ]),
    reverseApproval: generateSampleData([
      { days: 0, count: 4, amount: 5240 },
      { days: 2, count: 7, amount: 8350 },
      { days: 5, count: 3, amount: 4120 },
      { days: 10, count: 2, amount: 2890 }
    ])
  }), [generateSampleData]);

  // Original unfiltered data - memoized to prevent recreation
  const originalData = useMemo(() => ({
    approvals: {
      title: 'Approvals',
      icon: <Clock size={20} />,
      infoText: 'Default Pending Approvals since 7 days',
      sampleData: sampleDataCache.approvals,
      items: [
        { label: '0-24 hours', count: 12, amount: '$15,240.00' },
        { label: '1-3 days', count: 8, amount: '$9,850.00' },
        { label: '3-5 days', count: 5, amount: '$6,320.00' },
        { label: '5-7 days', count: 3, amount: '$4,150.00' }
      ],
      total: { count: 28, amount: '$35,560.00' }
    },
    deposit: {
      title: 'Deposits',
      icon: <DollarSign size={20} />,
      infoText: 'Default Pending Deposits since 7 days',
      sampleData: sampleDataCache.deposit,
      items: [
        { label: '0-24 hours', count: 45, amount: '$48,920.00' },
        { label: '1-3 days', count: 18, amount: '$22,340.00' },
        { label: '3-5 days', count: 7, amount: '$8,450.00' },
        { label: '5-7 days', count: 2, amount: '$3,200.00' }
      ],
      total: { count: 72, amount: '$82,910.00' }
    },
    refunds: {
      title: 'Refunds',
      icon: <RefreshCw size={20} />,
      infoText: 'Default Pending Refunds since 7 days',
      sampleData: sampleDataCache.refunds,
      items: [
        { label: '0-24 hours', count: 6, amount: '$3,240.00' },
        { label: '1-3 days', count: 9, amount: '$5,680.00' },
        { label: '3-5 days', count: 4, amount: '$2,890.00' },
        { label: '5-7 days', count: 2, amount: '$1,450.00' }
      ],
      total: { count: 21, amount: '$13,260.00' }
    },
    reverseApproval: {
      title: 'Reverse Approval',
      icon: <RotateCcw size={20} />,
      infoText: 'Default Pending Reverse Approvals since 7 days',
      sampleData: sampleDataCache.reverseApproval,
      items: [
        { label: '0-24 hours', count: 4, amount: '$5,240.00' },
        { label: '1-3 days', count: 7, amount: '$8,350.00' },
        { label: '3-5 days', count: 3, amount: '$4,120.00' },
        { label: '5-7 days', count: 2, amount: '$2,890.00' }
      ],
      total: { count: 16, amount: '$20,600.00' }
    },
    alerts: {
      title: 'Alerts',
      icon: <Bell size={20} />,
      infoText: 'Error Alerts for all the activities',
      items: [
        { label: 'High-value transactions pending', count: 15, severity: 'high' },
        { label: 'Approvals overdue', count: 8, severity: 'critical' },
        { label: 'Failed payment retries', count: 23, severity: 'medium' },
        { label: 'Refund requests pending', count: 12, severity: 'medium' },
        { label: 'Payment method expired', count: 5, severity: 'low' }
      ],
      total: { count: 63, label: 'Total Active Alerts' }
    }
  }), [sampleDataCache]);

  // Use API data if available, otherwise fall back to originalData
  const metricsData = useMemo(() => {
    if (loading || !apiData) {
      // Show loading state or empty data
      return {
        approvals: { title: 'Approvals', icon: <Clock size={20} />, items: [], total: { count: 0, amount: '$0.00' } },
        deposit: { title: 'Deposits', icon: <DollarSign size={20} />, items: [], total: { count: 0, amount: '$0.00' } },
        refunds: { title: 'Refunds', icon: <RefreshCw size={20} />, items: [], total: { count: 0, amount: '$0.00' } },
        reverseApproval: { title: 'Reverse Approval', icon: <AlertTriangle size={20} />, items: [], total: { count: 0, amount: '$0.00' } }
      };
    }
    
    // Use API data for all tabs (assuming all tabs use the same data structure for now)
    return {
      approvals: {
        title: 'Approvals',
        icon: <Clock size={20} />,
        infoText: 'Pending Approvals',
        items: apiData.items || [],
        total: apiData.total || { count: 0, amount: '$0.00' }
      },
      deposit: {
        title: 'Deposits',
        icon: <DollarSign size={20} />,
        infoText: 'Deposit Transactions',
        items: apiData.items || [],
        total: apiData.total || { count: 0, amount: '$0.00' }
      },
      refunds: {
        title: 'Refunds',
        icon: <RefreshCw size={20} />,
        infoText: 'Refund Transactions',
        items: apiData.items || [],
        total: apiData.total || { count: 0, amount: '$0.00' }
      },
      reverseApproval: {
        title: 'Reverse Approval',
        icon: <AlertTriangle size={20} />,
        infoText: 'Reverse Approval Transactions',
        items: apiData.items || [],
        total: apiData.total || { count: 0, amount: '$0.00' }
      }
    };
  }, [loading, apiData]);

  // Generate dynamic info text based on active filters
  const generateInfoText = (tabId) => {
    const tabNames = {
      approvals: 'Approvals',
      deposit: 'Deposits',
      refunds: 'Refunds',
      reverseApproval: 'Reverse Approvals'
    };
    
    const dateFilterLabels = {
      'last_15_min': 'Last 15 minutes',
      'last_60_min': 'Last 60 minutes',
      'last_4_hours': 'Last 4 hours',
      'last_24_hours': 'Last 24 hours',
      'last_7_days': 'Last 7 days',
      'last_28_days': 'Last 28 days',
      'last_30_days': 'Last 30 days',
      'last_90_days': 'Last 90 days',
      'today': 'Today',
      'yesterday': 'Yesterday',
      'last_week': 'Last week',
      'last_month': 'Last 1 month',
      'custom': 'Custom range'
    };
    
    const hasFilters = dateFilter || 
                       dateRanges[tabId].from || 
                       dateRanges[tabId].to || 
                       orderType !== 'all' || 
                       paymentMethod !== 'all' || 
                       paymentState !== 'all';
    
    if (!hasFilters) {
      return `Default Pending ${tabNames[tabId]} since 7 days`;
    }
    
    let parts = [`Pending ${tabNames[tabId]}`];
    
    // Add date filter info
    if (dateFilter) {
      parts.push(dateFilterLabels[dateFilter] || dateFilter);
    }
    
    // Add date range info (old calendar)
    if (dateRanges[tabId].from || dateRanges[tabId].to) {
      const fromDate = dateRanges[tabId].from ? new Date(dateRanges[tabId].from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start';
      const toDate = dateRanges[tabId].to ? new Date(dateRanges[tabId].to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End';
      parts.push(`from ${fromDate} to ${toDate}`);
    }
    
    // Add filter info
    const filters = [];
    if (paymentState !== 'all') filters.push(`State: ${paymentState.toUpperCase()}`);
    if (orderType !== 'all') filters.push(`Type: ${orderType}`);
    if (paymentMethod !== 'all') filters.push(`Method: ${paymentMethod}`);
    
    if (filters.length > 0) {
      parts.push(`(${filters.join(', ')})`);
    }
    
    return parts.join(' ');
  };

  const tabs = [
    { id: 'approvals', label: 'Approvals', count: metricsData.approvals.total.count, infoText: generateInfoText('approvals') },
    { id: 'deposit', label: 'Deposits', count: metricsData.deposit.total.count, infoText: generateInfoText('deposit') },
    { id: 'refunds', label: 'Refunds', count: metricsData.refunds.total.count, infoText: generateInfoText('refunds') },
    { id: 'reverseApproval', label: 'Reverse Approval', count: metricsData.reverseApproval.total.count, infoText: generateInfoText('reverseApproval') }
  ];

  const currentData = metricsData[activeTab];

  // Generate alert chart data - shows non-success transactions over the last 7 days
  const generateAlertsFromData = (data) => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const periods = [];
    
    // Create 7 daily periods (last 7 days)
    for (let i = 6; i >= 0; i--) {
      const periodDate = new Date(now);
      periodDate.setDate(now.getDate() - i);
      periodDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(periodDate);
      nextDay.setDate(periodDate.getDate() + 1);
      
      periods.push({
        date: periodDate,
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : periodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullLabel: periodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: 0,
        periodStart: periodDate,
        periodEnd: nextDay
      });
    }
    
    // Count only non-success transactions for each day
    data.forEach(item => {
      // Only include non-success transactions
      if (item.paymentState && item.paymentState !== 'success') {
        const itemDate = new Date(item.date);
        
        // Find which period this transaction belongs to
        for (const period of periods) {
          if (itemDate >= period.periodStart && itemDate < period.periodEnd) {
            period.count++;
            break;
          }
        }
      }
    });
    
    return periods;
  };

  // Generate dynamic alerts based on current tab's data (last 7 days, non-success only)
  const currentAlerts = useMemo(() => {
    const dataSource = metricsData[activeTab];
    if (dataSource && dataSource.sampleData) {
      // Generate alerts for last 7 days with non-success transactions
      const alerts = generateAlertsFromData(dataSource.sampleData);
      const totalCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
      
      // Calculate non-success percentage from original unfiltered data
      const originalDataSource = originalData[activeTab];
      const originalTotal = originalDataSource?.sampleData?.length || 0;
      const originalNonSuccessCount = originalDataSource?.sampleData?.filter(item => 
        item.paymentState && item.paymentState !== 'success'
      ).length || 0;
      const nonSuccessPercentage = originalTotal > 0 ? (originalNonSuccessCount / originalTotal) * 100 : 0;
      
      // Determine if we should show the graph
      let alertLevel = 'none';
      let showGraph = false;
      
      if (nonSuccessPercentage >= 70) {
        alertLevel = 'critical';
        showGraph = true;
      } else if (nonSuccessPercentage >= 50) {
        alertLevel = 'warning';
        showGraph = true;
      }
      
      return {
        items: alerts,
        total: { count: totalCount, label: 'Total Non-Success Transactions (Last 7 Days)' },
        showGraph: showGraph,
        alertLevel: alertLevel,
        percentage: nonSuccessPercentage,
        nonSuccessCount: originalNonSuccessCount,
        totalTransactions: originalTotal,
        periodLabel: 'Last 7 Days'
      };
    }
    
    return { 
      items: [], 
      total: { count: 0, label: 'Total Non-Success Transactions (Last 7 Days)' },
      showGraph: false,
      alertLevel: 'none',
      percentage: 0,
      nonSuccessCount: 0,
      totalTransactions: 0,
      periodLabel: 'Last 7 Days'
    };
  }, [activeTab, metricsData, originalData]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setShowTooltip(null);
  };


  // Convert date filter selection to actual date range
  const getDateRangeFromFilter = (filter, customRange) => {
    const now = new Date();
    let startDate = null;
    let endDate = now;
    
    switch (filter) {
      case 'last_15_min':
        startDate = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case 'last_60_min':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last_4_hours':
        startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        break;
      case 'last_24_hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_28_days':
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'last_week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'custom':
        if (customRange.startDate && customRange.endDate) {
          startDate = new Date(customRange.startDate);
          endDate = new Date(customRange.endDate);
        }
        break;
      default:
        return null;
    }
    
    return startDate ? { startDate, endDate } : null;
  };

  const filterDataByDate = (data, fromDate, toDate) => {
    if (!fromDate && !toDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      if (fromDate && itemDate < new Date(fromDate)) return false;
      if (toDate && itemDate > new Date(toDate)) return false;
      return true;
    });
  };
  
  const filterDataByDateFilter = (data, filter, customRange) => {
    const dateRange = getDateRangeFromFilter(filter, customRange);
    if (!dateRange) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
    });
  };

  const filterDataByOrderType = (data, type) => {
    if (type === 'all') return data;
    return data.filter(item => item.orderType === type);
  };

  const filterDataByPaymentMethod = (data, method) => {
    if (method === 'all') return data;
    return data.filter(item => item.paymentMethod === method);
  };

  const filterDataByPaymentState = (data, state) => {
    if (state === 'all') return data;
    return data.filter(item => item.paymentState === state);
  };

  // Get dynamic age groups based on selected date filter
  const getDynamicAgeGroups = (filter) => {
    switch (filter) {
      case 'last_15_min':
        return [
          { label: '0-5 min', min: 0, max: 5, unit: 'minutes' },
          { label: '5-10 min', min: 5, max: 10, unit: 'minutes' },
          { label: '10-15 min', min: 10, max: 15, unit: 'minutes' }
        ];
      case 'last_60_min':
        return [
          { label: '0-15 min', min: 0, max: 15, unit: 'minutes' },
          { label: '15-30 min', min: 15, max: 30, unit: 'minutes' },
          { label: '30-45 min', min: 30, max: 45, unit: 'minutes' },
          { label: '45-60 min', min: 45, max: 60, unit: 'minutes' }
        ];
      case 'last_4_hours':
        return [
          { label: '0-1 hour', min: 0, max: 1, unit: 'hours' },
          { label: '1-2 hours', min: 1, max: 2, unit: 'hours' },
          { label: '2-3 hours', min: 2, max: 3, unit: 'hours' },
          { label: '3-4 hours', min: 3, max: 4, unit: 'hours' }
        ];
      case 'last_24_hours':
      case 'today':
        return [
          { label: '0-6 hours', min: 0, max: 6, unit: 'hours' },
          { label: '6-12 hours', min: 6, max: 12, unit: 'hours' },
          { label: '12-18 hours', min: 12, max: 18, unit: 'hours' },
          { label: '18-24 hours', min: 18, max: 24, unit: 'hours' }
        ];
      case 'yesterday':
        return [
          { label: '0-6 hours', min: 0, max: 6, unit: 'hours' },
          { label: '6-12 hours', min: 6, max: 12, unit: 'hours' },
          { label: '12-18 hours', min: 12, max: 18, unit: 'hours' },
          { label: '18-24 hours', min: 18, max: 24, unit: 'hours' }
        ];
      case 'last_7_days':
      case 'last_week':
        return [
          { label: '0-1 day', min: 0, max: 1, unit: 'days' },
          { label: '1-3 days', min: 1, max: 3, unit: 'days' },
          { label: '3-5 days', min: 3, max: 5, unit: 'days' },
          { label: '5-7 days', min: 5, max: 7, unit: 'days' }
        ];
      case 'last_28_days':
        return [
          { label: '0-7 days', min: 0, max: 7, unit: 'days' },
          { label: '7-14 days', min: 7, max: 14, unit: 'days' },
          { label: '14-21 days', min: 14, max: 21, unit: 'days' },
          { label: '21-28 days', min: 21, max: 28, unit: 'days' }
        ];
      case 'last_30_days':
      case 'last_month':
        return [
          { label: '0-7 days', min: 0, max: 7, unit: 'days' },
          { label: '7-14 days', min: 7, max: 14, unit: 'days' },
          { label: '14-21 days', min: 14, max: 21, unit: 'days' },
          { label: '21-30 days', min: 21, max: 30, unit: 'days' }
        ];
      case 'last_90_days':
        return [
          { label: '0-15 days', min: 0, max: 15, unit: 'days' },
          { label: '15-30 days', min: 15, max: 30, unit: 'days' },
          { label: '30-60 days', min: 30, max: 60, unit: 'days' },
          { label: '60-90 days', min: 60, max: 90, unit: 'days' }
        ];
      case 'custom':
        // For custom ranges, calculate dynamic groups based on the range span
        if (customDateRange.startDate && customDateRange.endDate) {
          const start = new Date(customDateRange.startDate);
          const end = new Date(customDateRange.endDate);
          const diffMs = end - start;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          if (diffDays <= 1) {
            // Less than 1 day - use hours
            return [
              { label: '0-6 hours', min: 0, max: 6, unit: 'hours' },
              { label: '6-12 hours', min: 6, max: 12, unit: 'hours' },
              { label: '12-18 hours', min: 12, max: 18, unit: 'hours' },
              { label: '18-24 hours', min: 18, max: 24, unit: 'hours' }
            ];
          } else if (diffDays <= 7) {
            // 1-7 days
            return [
              { label: '0-1 day', min: 0, max: 1, unit: 'days' },
              { label: '1-3 days', min: 1, max: 3, unit: 'days' },
              { label: '3-5 days', min: 3, max: 5, unit: 'days' },
              { label: '5-7 days', min: 5, max: 7, unit: 'days' }
            ];
          } else if (diffDays <= 30) {
            // 7-30 days
            return [
              { label: '0-7 days', min: 0, max: 7, unit: 'days' },
              { label: '7-14 days', min: 7, max: 14, unit: 'days' },
              { label: '14-21 days', min: 14, max: 21, unit: 'days' },
              { label: '21-30 days', min: 21, max: 30, unit: 'days' }
            ];
          } else {
            // More than 30 days
            const quarter = Math.ceil(diffDays / 4);
            return [
              { label: `0-${quarter} days`, min: 0, max: quarter, unit: 'days' },
              { label: `${quarter}-${quarter * 2} days`, min: quarter, max: quarter * 2, unit: 'days' },
              { label: `${quarter * 2}-${quarter * 3} days`, min: quarter * 2, max: quarter * 3, unit: 'days' },
              { label: `${quarter * 3}-${quarter * 4} days`, min: quarter * 3, max: quarter * 4, unit: 'days' }
            ];
          }
        }
        // Fallback to default
        return [
          { label: '0-24 hours', min: 0, max: 1, unit: 'days' },
          { label: '1-3 days', min: 1, max: 3, unit: 'days' },
          { label: '3-5 days', min: 3, max: 5, unit: 'days' },
          { label: '5-7 days', min: 5, max: 7, unit: 'days' }
        ];
      default:
        // Default grouping (when no filter is selected)
        return [
          { label: '0-24 hours', min: 0, max: 1, unit: 'days' },
          { label: '1-3 days', min: 1, max: 3, unit: 'days' },
          { label: '3-5 days', min: 3, max: 5, unit: 'days' },
          { label: '5-7 days', min: 5, max: 7, unit: 'days' }
        ];
    }
  };

  const calculateAgeGroups = (data, filter) => {
    const now = new Date();
    const ageGroups = getDynamicAgeGroups(filter);
    
    // Initialize groups with transactions array
    const groups = {};
    ageGroups.forEach(group => {
      groups[group.label] = { count: 0, amount: 0, transactions: [] };
    });

    data.forEach(item => {
      const itemDate = new Date(item.date);
      const diffMs = now - itemDate;
      
      // Find which group this item belongs to
      for (const group of ageGroups) {
        let itemValue;
        
        if (group.unit === 'minutes') {
          itemValue = diffMs / (1000 * 60);
        } else if (group.unit === 'hours') {
          itemValue = diffMs / (1000 * 60 * 60);
        } else {
          itemValue = diffMs / (1000 * 60 * 60 * 24);
        }
        
        if (itemValue >= group.min && itemValue < group.max) {
          groups[group.label].count++;
          groups[group.label].amount += item.amount;
          groups[group.label].transactions.push(item);
          break;
        }
      }
    });

    return Object.entries(groups).map(([label, data]) => ({
      label,
      count: data.count,
      amount: `$${data.amount.toFixed(2)}`,
      highlight: false, // No highlighting since we removed the infinity buckets
      transactions: data.transactions
    }));
  };

  const handleAgeGroupClick = (ageGroupItem) => {
    // Only allow clicking for Approvals tab
    if (activeTab === 'approvals') {
      setSelectedAgeGroup(ageGroupItem.label);
      setAgeGroupTransactions(ageGroupItem.transactions || []);
    }
  };

  const handleCloseTransactionDetails = () => {
    setSelectedAgeGroup(null);
    setAgeGroupTransactions([]);
  };

  // Apply filters to a single tab
  const applyFiltersToTab = (tabId) => {
    const { from, to } = dateRanges[tabId];
    
    // Skip filtering for tabs without sample data
    if (!originalData[tabId].sampleData) {
      return null;
    }

    let filtered = [...originalData[tabId].sampleData];
    
    // Apply all filters in sequence
    // First apply the date period filter (from dropdown)
    if (dateFilter) {
      filtered = filterDataByDateFilter(filtered, dateFilter, customDateRange);
    }
    
    // Then apply the old date range filters (if any)
    filtered = filterDataByDate(filtered, from, to);
    filtered = filterDataByOrderType(filtered, orderType);
    filtered = filterDataByPaymentMethod(filtered, paymentMethod);
    filtered = filterDataByPaymentState(filtered, paymentState);
    
    const ageGroups = calculateAgeGroups(filtered, dateFilter);
    const totalAmount = filtered.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      ...originalData[tabId],
      sampleData: filtered, // Include filtered sampleData for alerts
      items: ageGroups,
      total: {
        count: filtered.length,
        amount: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    };
  };

  // Apply filters to all tabs
  const applyFiltersToAllTabs = () => {
    console.log('=== APPLYING FILTERS TO ALL TABS ===');
    console.log('Order Type:', orderType);
    console.log('Payment Method:', paymentMethod);
    console.log('Payment State:', paymentState);
    
    // Always calculate data from sampleData to ensure consistency
    const newFilteredData = {};
    const tabIds = ['approvals', 'deposit', 'refunds', 'reverseApproval'];
    
    tabIds.forEach(tabId => {
      const filteredTab = applyFiltersToTab(tabId);
      if (filteredTab) {
        newFilteredData[tabId] = filteredTab;
      } else {
        newFilteredData[tabId] = originalData[tabId];
      }
    });
    
    // Copy alerts data
    newFilteredData.alerts = originalData.alerts;

    console.log('=== FILTER APPLICATION COMPLETE ===');
    setFilteredData(newFilteredData);
  };


  const clearAllFilters = () => {
    // Reset all filter states
    setOrderType('all');
    setPaymentMethod('all');
    setPaymentState('all'); // Reset to default all state
    setFrequency('daily'); // Reset frequency to daily
    setDateRanges({
      approvals: defaultRange,
      deposit: defaultRange,
      refunds: defaultRange,
      reverseApproval: defaultRange,
      alerts: defaultRange
    });
    
    // Re-apply default filters (7 days + all state)
    setTimeout(() => {
      applyFiltersToAllTabs();
    }, 100);
    
    // Show success toast
    setToastMessage('✓ Filters reset to defaults (7 days, All payment states, Daily frequency)');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };


  // Fetch filter options from API on mount
  React.useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setFiltersLoading(true);
        const [orderTypes, paymentMethods, paymentStates] = await Promise.all([
          fetchOrderTypes(),
          fetchPaymentMethods(),
          fetchPaymentStatuses()
        ]);
        
        setOrderTypeOptions(orderTypes);
        setPaymentMethodOptions(paymentMethods);
        setPaymentStateOptions(paymentStates);
        setFiltersLoading(false);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        // Fallback to hardcoded values if API fails
        setOrderTypeOptions([
          { value: 'regular', label: 'Regular' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'onetime', label: 'Onetime' },
          { value: 'cvc_no_show_penality', label: 'CVC No Show Penality' },
          { value: 'loyalty', label: 'Loyalty' },
          { value: 'cwav_telemedicine', label: 'CWAV Telemedicine' }
        ]);
        setPaymentMethodOptions([
          { value: 'creditcard', label: 'Credit Card' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'applepay', label: 'Apple Pay' },
          { value: 'giftcard', label: 'Gift Card' },
          { value: 'accountbalance', label: 'Account Balance' }
        ]);
        setPaymentStateOptions([
          { value: 'success', label: 'Success' },
          { value: 'processing', label: 'Processing' },
          { value: 'failed', label: 'Failed' },
          { value: 'canceled', label: 'Canceled' },
          { value: 'expired', label: 'Expired' },
          { value: 'declined', label: 'Declined' },
          { value: 'pending', label: 'Pending' }
        ]);
        setFiltersLoading(false);
      }
    };
    
    loadFilterOptions();
  }, []);

  // Fetch aged metrics data from API
  React.useEffect(() => {
    const loadMetricsData = async () => {
      try {
        setLoading(true);
        const data = await fetchAgedMetrics(orderType, paymentMethod, paymentState, dateFilter, frequency);
        setApiData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching aged metrics:', error);
        setLoading(false);
        // Show error to user
        alert('Failed to fetch data from database. Please try again.');
      }
    };
    
    loadMetricsData();
  }, [orderType, paymentMethod, paymentState, dateFilter, frequency]);

  // Effect to re-apply filters when orderType, paymentMethod, paymentState, dateFilter, or frequency changes
  React.useEffect(() => {
    console.log('useEffect triggered - filter changed');
    console.log('Re-applying filters to all tabs due to filter change');
    applyFiltersToAllTabs();
  }, [orderType, paymentMethod, paymentState, dateFilter, customDateRange, frequency]);

  // Effect to apply initial filters on component mount
  React.useEffect(() => {
    console.log('Applying initial filters - last 7 days, all payment states');
    // Apply filters to all tabs on initial load
    applyFiltersToAllTabs();
  }, []); // Empty dependency array - runs only once on mount

  return (
    <div className={`aged-metrics-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="tabs-header">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className="tab-wrapper"
          >
            <button
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <div className="tab-count-wrapper">
                <span className="tab-count">{tab.count}</span>
                <div className="tab-info-icon-wrapper">
                  <button 
                    className="tab-info-icon-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showTooltip === tab.id) {
                        setShowTooltip(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                          top: rect.top + window.scrollY - 8,
                          left: rect.left + window.scrollX + (rect.width / 2)
                        });
                        setShowTooltip(tab.id);
                      }
                    }}
                    onMouseLeave={() => setTimeout(() => setShowTooltip(null), 200)}
                  >
                    <Info size={14} />
                  </button>
                  {showTooltip === tab.id && ReactDOM.createPortal(
                    <div 
                      className="tab-info-tooltip-portal above"
                      style={{
                        position: 'absolute',
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 99999
                      }}
                    >
                      {tab.infoText}
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
        <button 
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="common-filters">
            <div className="filter-row">
              <label className="filter-label" htmlFor="orderType">Order Type:</label>
              <select 
                id="orderType"
                className="filter-dropdown"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="all">All</option>
                {!filtersLoading && orderTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-row">
              <label className="filter-label" htmlFor="paymentMethod">Payment Method:</label>
              <select 
                id="paymentMethod"
                className="filter-dropdown"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={filtersLoading}
              >
                <option value="all">All</option>
                {!filtersLoading && paymentMethodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-row">
              <label className="filter-label" htmlFor="paymentState">Payment State:</label>
              <select 
                id="paymentState"
                className="filter-dropdown"
                value={paymentState}
                onChange={(e) => setPaymentState(e.target.value)}
                disabled={filtersLoading}
              >
                <option value="all">All</option>
                {!filtersLoading && paymentStateOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="filter-row">
              <button 
                className="clear-filters-btn"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="tab-content">
            <div className="content-header">
              <div className="content-title">
                {currentData.icon}
                <h3>{currentData.title}</h3>
                <DateFilter 
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  customDateRange={customDateRange}
                  setCustomDateRange={setCustomDateRange}
                />
                <div className="frequency-filter" style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
                  <label htmlFor="frequency-select" style={{ fontSize: '14px', fontWeight: '500', marginRight: '8px' }}>
                    Frequency:
                  </label>
                  <select
                    id="frequency-select"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {orderType !== 'all' && (
                  <span className="filter-badge order-type-badge">
                    Order: {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
                  </span>
                )}
                {paymentMethod !== 'all' && (
                  <span className="filter-badge payment-method-badge">
                    Payment: {formatPaymentMethod(paymentMethod)}
                  </span>
                )}
                {paymentState !== 'all' && (
                  <span className="filter-badge payment-state-badge">
                    State: {paymentState.toUpperCase()}
                  </span>
                )}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#667eea', fontSize: '16px' }}>
            <div style={{ marginBottom: '10px' }}>Loading data from database...</div>
            <div className="loading-spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #f3f4f6', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        )}
        
        {/* Visual Analytics Section - Coordinate-Based Charts */}
        {!loading && (
        <div className="analytics-section">
          <div className="analytics-header">
            <div className="analytics-title-section">
              <h4>📊 Age Distribution Analytics</h4>
            </div>
          </div>
          
          <div className="charts-container">
            {/* Transaction Count Chart with X-Y Coordinates */}
            <div className="chart-card enhanced coordinate-chart">
              <div className="chart-header">
                <div className="chart-title-wrapper">
                  <div className="chart-icon count-icon">📈</div>
                  <div>
                    <div className="chart-title">Transaction Frequency</div>
                    <div className="chart-subtitle">
                      n = {currentData.total.count} transactions
                      {activeTab === 'approvals' && (
                        <span style={{ marginLeft: '10px', fontSize: '11px', color: '#667eea', fontStyle: 'italic' }}>
                          (Click bar to view details)
                        </span>
                      )}
                  </div>
                </div>
              </div>
                <div className="summary-card-inline">
                  <div className="summary-icon">📊</div>
                  <div className="summary-content">
                    <div className="summary-label">Total Transactions</div>
                    <div className="summary-value">{currentData.total.count}</div>
                  </div>
                </div>
              </div>
              <div className="coordinate-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={currentData.items.map(item => ({
                      name: item.label,
                      count: item.count,
                      highlight: item.highlight,
                      originalItem: item
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Time Period', position: 'insideBottom', offset: -10 }}
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      label={{ value: 'Frequency (Count)', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#667eea" 
                      name="Transaction Count"
                      onClick={(data) => {
                        if (activeTab === 'approvals' && data && data.originalItem) {
                          handleAgeGroupClick(data.originalItem);
                        }
                      }}
                      style={{ cursor: activeTab === 'approvals' ? 'pointer' : 'default' }}
                    >
                      {currentData.items.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.highlight ? '#dc2626' : '#667eea'}
                          style={{ cursor: activeTab === 'approvals' ? 'pointer' : 'default' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                                </div>
            </div>

            {/* Amount Chart with X-Y Coordinates */}
            <div className="chart-card enhanced coordinate-chart">
              <div className="chart-header">
                <div className="chart-title-wrapper">
                  <div className="chart-icon amount-icon">💰</div>
                  <div>
                    <div className="chart-title">Amount Distribution</div>
                    <div className="chart-subtitle">
                      Σ = {currentData.total.amount} total value
                      {activeTab === 'approvals' && (
                        <span style={{ marginLeft: '10px', fontSize: '11px', color: '#48bb78', fontStyle: 'italic' }}>
                          (Click bar to view details)
                        </span>
                      )}
                  </div>
                </div>
              </div>
                <div className="summary-card-inline">
                  <div className="summary-icon">💵</div>
                  <div className="summary-content">
                    <div className="summary-label">Total Amount</div>
                    <div className="summary-value">{currentData.total.amount}</div>
                  </div>
                </div>
              </div>
              <div className="coordinate-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={currentData.items.map(item => ({
                      name: item.label,
                      amount: parseFloat(item.amount.replace(/[$,]/g, '')),
                      highlight: item.highlight,
                      originalItem: item
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Time Period', position: 'insideBottom', offset: -10 }}
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                      cursor={{ fill: 'rgba(72, 187, 120, 0.1)' }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#48bb78" 
                      name="Amount"
                      onClick={(data) => {
                        if (activeTab === 'approvals' && data && data.originalItem) {
                          handleAgeGroupClick(data.originalItem);
                        }
                      }}
                      style={{ cursor: activeTab === 'approvals' ? 'pointer' : 'default' }}
                    >
                      {currentData.items.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.highlight ? '#dc2626' : '#48bb78'}
                          style={{ cursor: activeTab === 'approvals' ? 'pointer' : 'default' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                                </div>
                              </div>
          </div>
        </div>
        )}

        {/* Alerts Section - shown in all tabs, dynamically generated from payment states */}
        {!loading && (
        <div className="alerts-section">
          <div className="alerts-header">
            <Bell size={20} />
            <h4>Alerts for Approval</h4>
          </div>
          {currentAlerts.showGraph && currentAlerts.items.length > 0 ? (
            <>
              {/* Chart Title */}
              <div className="chart-title-section">
                <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '20px' }}>
                    {currentAlerts.alertLevel === 'critical' ? '🔴' : '⚠️'}
                      </span>
                  {(() => {
                    const titles = {
                      approval: 'Alerts for Approval',
                      deposit: 'Alerts for Deposit',
                      refunds: 'Alerts for Refunds',
                      reverseApproval: 'Alerts for Reverse Approval'
                    };
                    return titles[activeTab] || 'Alerts for Approval';
                  })()}
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'normal', 
                    color: currentAlerts.alertLevel === 'critical' ? '#dc2626' : '#f59e0b',
                    background: currentAlerts.alertLevel === 'critical' ? '#fef2f2' : '#fffbeb',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginLeft: '8px'
                  }}>
                    {currentAlerts.alertLevel === 'critical' ? 'CRITICAL' : 'WARNING'}: {Math.round(currentAlerts.percentage)}% Non-Success
                  </span>
                </h5>
                    </div>

              <div className="alerts-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={currentAlerts.items.map(item => ({
                      name: item.fullLabel || item.label,
                      count: item.count
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Time Period (Last 7 Days)', position: 'insideBottom', offset: -10 }}
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={currentAlerts.alertLevel === 'critical' ? '#dc2626' : '#f59e0b'}
                      strokeWidth={3}
                      dot={{ 
                        fill: currentAlerts.alertLevel === 'critical' ? '#dc2626' : '#f59e0b', 
                        strokeWidth: 2, 
                        r: 6 
                      }}
                      activeDot={{ r: 8 }}
                      name="Non-Success Transactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="alerts-footer">
                <span className="alerts-total-label">{currentAlerts.total.label}</span>
                <span className="alerts-total-count">{currentAlerts.total.count}</span>
              </div>
            </>
          ) : (
            <div className="no-alerts">
              {currentAlerts.showGraph === false && currentAlerts.percentage > 0 ? (
                <div>
                  <p>✓ System Status: Normal</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                    Non-success rate: {Math.round(currentAlerts.percentage)}% 
                    ({currentAlerts.nonSuccessCount} of {currentAlerts.totalTransactions} transactions)
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    ⚠️ Warning graph appears at 50% | 🔴 Critical alert at 70%
                  </p>
            </div>
              ) : (
                <p>✓ No non-success transactions in the last 7 days</p>
              )}
            </div>
          )}
        </div>
        )}
          </div>
        </>
      )}
      
      {showToast && (
        <div className="filter-toast">
          {toastMessage}
        </div>
      )}

      {selectedAgeGroup && (
        <TransactionDetails
          transactions={ageGroupTransactions}
          ageGroup={selectedAgeGroup}
          onClose={handleCloseTransactionDetails}
          allOrderTypes={orderTypeOptions.map(opt => opt.value)}
          allPaymentMethods={paymentMethodOptions.map(opt => opt.value)}
          allPaymentStates={paymentStateOptions.map(opt => opt.value)}
          defaultOrderType={orderType !== 'all' ? orderType : ''}
          defaultPaymentMethod={paymentMethod !== 'all' ? paymentMethod : ''}
          defaultPaymentState={paymentState !== 'all' ? paymentState : ''}
          defaultDateFilter={dateFilter}
        />
      )}
    </div>
  );
}

export default AgedMetricsTabs;

