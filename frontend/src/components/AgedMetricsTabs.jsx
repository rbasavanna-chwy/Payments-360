import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Clock, DollarSign, RefreshCw, Bell, Info, Calendar, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import DateFilter from './DateFilter';
import TransactionDetails from './TransactionDetails';
import './AgedMetricsTabs.css';

function AgedMetricsTabs() {
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
  const [orderType, setOrderType] = useState('all'); // 'all', 'regular', 'autoship'
  const [paymentMethod, setPaymentMethod] = useState('all'); // 'all', 'creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance'
  const [paymentState, setPaymentState] = useState('processing'); // 'all', 'success', 'processing', 'failed', 'canceled', 'expired', 'declined'
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
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
  const [chartType, setChartType] = useState('histogram'); // 'histogram', 'line', 'bar'
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [ageGroupTransactions, setAgeGroupTransactions] = useState([]);

  // Generate sample data with actual dates - memoized to only run once
  const generateSampleData = useMemo(() => {
    return (scenarios) => {
      const now = new Date();
      const data = [];
      const paymentStates = ['success', 'processing', 'failed', 'canceled', 'expired', 'declined'];
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
            orderType: Math.random() > 0.5 ? 'regular' : 'autoship',
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
        { label: '3-7 days', count: 5, amount: '$6,320.00' },
        { label: '7+ days', count: 3, amount: '$4,150.00', highlight: true }
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
        { label: '3-7 days', count: 7, amount: '$8,450.00' },
        { label: '7+ days', count: 2, amount: '$3,200.00', highlight: true }
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
        { label: '3-7 days', count: 4, amount: '$2,890.00' },
        { label: '7+ days', count: 2, amount: '$1,450.00', highlight: true }
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
        { label: '3-7 days', count: 3, amount: '$4,120.00' },
        { label: '7+ days', count: 2, amount: '$2,890.00', highlight: true }
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

  const metricsData = filteredData || originalData;

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

  // Function to generate alerts from payment state data
  const generateAlertsFromData = (data) => {
    if (!data || data.length === 0) return [];

    const now = new Date();

    // Count payment states with age tracking for processing
    const stateCounts = {
      failed: 0,
      declined: 0,
      expired: 0,
      processing: 0,
      canceled: 0,
      success: 0
    };

    // Track stuck processing payments (by age)
    const processingByAge = {
      critical: 0, // 7+ days
      high: 0,     // 3-7 days
      medium: 0,   // 1-3 days
      recent: 0    // 0-24 hours
    };

    data.forEach(item => {
      if (stateCounts.hasOwnProperty(item.paymentState)) {
        stateCounts[item.paymentState]++;
      }

      // Track processing payments by age
      if (item.paymentState === 'processing') {
        const itemDate = new Date(item.date);
        const daysDiff = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 7) {
          processingByAge.critical++;
        } else if (daysDiff >= 3) {
          processingByAge.high++;
        } else if (daysDiff >= 1) {
          processingByAge.medium++;
        } else {
          processingByAge.recent++;
        }
      }
    });

    const alerts = [];

    // CRITICAL: Payments stuck in processing for 7+ days
    if (processingByAge.critical > 0) {
      alerts.push({
        label: 'Payments stuck in processing (7+ days)',
        count: processingByAge.critical,
        severity: 'critical'
      });
    }

    // HIGH: Payments processing for 3-7 days
    if (processingByAge.high > 0) {
      alerts.push({
        label: 'Payments processing for 3-7 days',
        count: processingByAge.high,
        severity: 'high'
      });
    }

    // MEDIUM: Payments processing for 1-3 days
    if (processingByAge.medium > 0) {
      alerts.push({
        label: 'Payments processing for 1-3 days',
        count: processingByAge.medium,
        severity: 'medium'
      });
    }

    // Generate alerts for other payment states
    if (stateCounts.failed > 0) {
      alerts.push({
        label: 'Failed payment transactions',
        count: stateCounts.failed,
        severity: stateCounts.failed > 5 ? 'critical' : 'high'
      });
    }

    if (stateCounts.declined > 0) {
      alerts.push({
        label: 'Declined payment attempts',
        count: stateCounts.declined,
        severity: stateCounts.declined > 3 ? 'high' : 'medium'
      });
    }

    if (stateCounts.expired > 0) {
      alerts.push({
        label: 'Expired payment methods',
        count: stateCounts.expired,
        severity: 'medium'
      });
    }

    if (stateCounts.canceled > 0) {
      alerts.push({
        label: 'Canceled orders pending review',
        count: stateCounts.canceled,
        severity: 'low'
      });
    }

    // If no critical issues, add success message
    if (alerts.length === 0 && stateCounts.success > 0) {
      alerts.push({
        label: 'All transactions processed successfully',
        count: stateCounts.success,
        severity: 'low'
      });
    }

    return alerts;
  };

  // Generate dynamic alerts based on current tab's data
  const currentAlerts = useMemo(() => {
    const dataSource = originalData[activeTab];
    if (dataSource && dataSource.sampleData) {
      const alerts = generateAlertsFromData(dataSource.sampleData);
      const totalCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
      return {
        items: alerts,
        total: { count: totalCount, label: 'Total Active Alerts' }
      };
    }
    return { items: [], total: { count: 0, label: 'Total Active Alerts' } };
  }, [activeTab]);

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
          { label: '10-15 min', min: 10, max: 15, unit: 'minutes' },
          { label: '15+ min', min: 15, max: Infinity, unit: 'minutes' }
        ];
      case 'last_60_min':
        return [
          { label: '0-15 min', min: 0, max: 15, unit: 'minutes' },
          { label: '15-30 min', min: 15, max: 30, unit: 'minutes' },
          { label: '30-45 min', min: 30, max: 45, unit: 'minutes' },
          { label: '45-60 min', min: 45, max: 60, unit: 'minutes' },
          { label: '60+ min', min: 60, max: Infinity, unit: 'minutes' }
        ];
      case 'last_4_hours':
        return [
          { label: '0-1 hour', min: 0, max: 1, unit: 'hours' },
          { label: '1-2 hours', min: 1, max: 2, unit: 'hours' },
          { label: '2-3 hours', min: 2, max: 3, unit: 'hours' },
          { label: '3-4 hours', min: 3, max: 4, unit: 'hours' },
          { label: '4+ hours', min: 4, max: Infinity, unit: 'hours' }
        ];
      case 'last_24_hours':
      case 'today':
        return [
          { label: '0-6 hours', min: 0, max: 6, unit: 'hours' },
          { label: '6-12 hours', min: 6, max: 12, unit: 'hours' },
          { label: '12-18 hours', min: 12, max: 18, unit: 'hours' },
          { label: '18-24 hours', min: 18, max: 24, unit: 'hours' },
          { label: '24+ hours', min: 24, max: Infinity, unit: 'hours' }
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
          { label: '5-7 days', min: 5, max: 7, unit: 'days' },
          { label: '7+ days', min: 7, max: Infinity, unit: 'days' }
        ];
      case 'last_28_days':
        return [
          { label: '0-7 days', min: 0, max: 7, unit: 'days' },
          { label: '7-14 days', min: 7, max: 14, unit: 'days' },
          { label: '14-21 days', min: 14, max: 21, unit: 'days' },
          { label: '21-28 days', min: 21, max: 28, unit: 'days' },
          { label: '28+ days', min: 28, max: Infinity, unit: 'days' }
        ];
      case 'last_30_days':
      case 'last_month':
        return [
          { label: '0-7 days', min: 0, max: 7, unit: 'days' },
          { label: '7-14 days', min: 7, max: 14, unit: 'days' },
          { label: '14-21 days', min: 14, max: 21, unit: 'days' },
          { label: '21-30 days', min: 21, max: 30, unit: 'days' },
          { label: '30+ days', min: 30, max: Infinity, unit: 'days' }
        ];
      case 'last_90_days':
        return [
          { label: '0-15 days', min: 0, max: 15, unit: 'days' },
          { label: '15-30 days', min: 15, max: 30, unit: 'days' },
          { label: '30-60 days', min: 30, max: 60, unit: 'days' },
          { label: '60-90 days', min: 60, max: 90, unit: 'days' },
          { label: '90+ days', min: 90, max: Infinity, unit: 'days' }
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
              { label: `${quarter * 3}+ days`, min: quarter * 3, max: Infinity, unit: 'days' }
            ];
          }
        }
        // Fallback to default
        return [
          { label: '0-24 hours', min: 0, max: 1, unit: 'days' },
          { label: '1-3 days', min: 1, max: 3, unit: 'days' },
          { label: '3-7 days', min: 3, max: 7, unit: 'days' },
          { label: '7+ days', min: 7, max: Infinity, unit: 'days' }
        ];
      default:
        // Default grouping (when no filter is selected)
        return [
          { label: '0-24 hours', min: 0, max: 1, unit: 'days' },
          { label: '1-3 days', min: 1, max: 3, unit: 'days' },
          { label: '3-7 days', min: 3, max: 7, unit: 'days' },
          { label: '7+ days', min: 7, max: Infinity, unit: 'days' }
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

    // Get the last group label (the one with +)
    const lastGroupLabel = ageGroups[ageGroups.length - 1].label;

    return Object.entries(groups).map(([label, data]) => ({
      label,
      count: data.count,
      amount: `$${data.amount.toFixed(2)}`,
      highlight: label === lastGroupLabel && data.count > 0,
      transactions: data.transactions
    }));
  };

  const handleAgeGroupClick = (ageGroupItem) => {
    // Only allow clicking for Approvals tab
    if (activeTab === 'approvals' && ageGroupItem.count > 0) {
      setSelectedAgeGroup(ageGroupItem.label);
      setAgeGroupTransactions(ageGroupItem.transactions);
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
      items: ageGroups,
      total: {
        count: filtered.length,
        amount: `$${totalAmount.toFixed(2)}`
      }
    };
  };

  // Apply filters to all tabs
  const applyFiltersToAllTabs = () => {
    console.log('=== APPLYING FILTERS TO ALL TABS ===');
    console.log('Order Type:', orderType);
    console.log('Payment Method:', paymentMethod);
    console.log('Payment State:', paymentState);
    
    // Check if any filters are active
    const hasAnyFilters = Object.keys(dateRanges).some(tabId => 
      dateRanges[tabId].from || dateRanges[tabId].to
    ) || orderType !== 'all' || paymentMethod !== 'all' || paymentState !== 'all';
    
    if (!hasAnyFilters) {
      console.log('No filters active - resetting to original data');
      setFilteredData(null);
      return;
    }

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
    setPaymentState('processing'); // Reset to default processing state
    setDateRanges({
      approvals: defaultRange,
      deposit: defaultRange,
      refunds: defaultRange,
      reverseApproval: defaultRange,
      alerts: defaultRange
    });
    
    // Re-apply default filters (7 days + processing state)
    setTimeout(() => {
      applyFiltersToAllTabs();
    }, 100);
    
    // Show success toast
    setToastMessage('✓ Filters reset to defaults (7 days, Processing state)');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };


  // Effect to re-apply filters when orderType, paymentMethod, paymentState, or dateFilter changes
  React.useEffect(() => {
    console.log('useEffect triggered - filter changed');
    console.log('Re-applying filters to all tabs due to filter change');
    applyFiltersToAllTabs();
  }, [orderType, paymentMethod, paymentState, dateFilter, customDateRange]);

  // Effect to apply initial filters on component mount
  React.useEffect(() => {
    console.log('Applying initial filters - last 7 days, processing state');
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
                <option value="regular">Regular</option>
                <option value="autoship">Autoship</option>
              </select>
            </div>

            <div className="filter-row">
              <label className="filter-label" htmlFor="paymentMethod">Payment Method:</label>
              <select 
                id="paymentMethod"
                className="filter-dropdown"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="all">All</option>
                <option value="creditcard">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="applepay">Apple Pay</option>
                <option value="giftcard">Gift Card</option>
                <option value="accountbalance">Account Balance</option>
              </select>
            </div>

            <div className="filter-row">
              <label className="filter-label" htmlFor="paymentState">Payment State:</label>
              <select 
                id="paymentState"
                className="filter-dropdown"
                value={paymentState}
                onChange={(e) => setPaymentState(e.target.value)}
              >
                <option value="all">All</option>
                <option value="success">SUCCESS</option>
                <option value="processing">PROCESSING</option>
                <option value="failed">FAILED</option>
                <option value="canceled">CANCELED</option>
                <option value="expired">EXPIRED</option>
                <option value="declined">DECLINED</option>
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
                {orderType !== 'all' && (
                  <span className="filter-badge order-type-badge">
                    Order: {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
                  </span>
                )}
                {paymentMethod !== 'all' && (
                  <span className="filter-badge payment-method-badge">
                    Payment: {paymentMethod === 'creditcard' ? 'Credit Card' : 
                             paymentMethod === 'paypal' ? 'PayPal' :
                             paymentMethod === 'applepay' ? 'Apple Pay' :
                             paymentMethod === 'giftcard' ? 'Gift Card' :
                             'Account Balance'}
                  </span>
                )}
                {paymentState !== 'all' && (
                  <span className="filter-badge payment-state-badge">
                    State: {paymentState.toUpperCase()}
                  </span>
                )}
          </div>
        </div>

        <div className="metrics-grid">
          {/* Aged metrics view */}
          <div className="aged-metrics-list">
            {currentData.items.map((item, index) => (
              <div 
                key={index} 
                className={`metric-item ${item.highlight ? 'highlight' : ''} ${activeTab === 'approvals' && item.count > 0 ? 'clickable' : ''}`}
                onClick={() => handleAgeGroupClick(item)}
                style={activeTab === 'approvals' && item.count > 0 ? { cursor: 'pointer' } : {}}
                title={activeTab === 'approvals' && item.count > 0 ? 'Click to view Approval Order Details' : ''}
              >
                <div className="metric-label">{item.label}</div>
                <div className="metric-values">
                  <span className="metric-count">{item.count} transactions</span>
                  <span className="metric-amount">{item.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-footer">
          <div className="total-summary">
            <span className="total-label">Total</span>
            <div className="total-values">
              <span className="total-count">{currentData.total.count}</span>
              {currentData.total.amount && (
                <span className="total-amount">{currentData.total.amount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Visual Analytics Section - Coordinate-Based Charts */}
        <div className="analytics-section">
          <div className="analytics-header">
            <div className="analytics-title-section">
              <h4>📊 Age Distribution Analytics</h4>
              <p className="analytics-subtitle">
                {chartType === 'histogram' && 'Frequency distribution of transactions and amounts across age groups'}
                {chartType === 'line' && 'Trend analysis of transactions and amounts across age groups'}
                {chartType === 'bar' && 'Bar chart comparison of transactions and amounts across age groups'}
              </p>
            </div>
            <div className="chart-type-toggle">
              <button
                className={`toggle-btn ${chartType === 'histogram' ? 'active' : ''}`}
                onClick={() => setChartType('histogram')}
                title="Histogram Chart"
              >
                📊 Histogram
              </button>
              <button
                className={`toggle-btn ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
                title="Line Chart"
              >
                📈 Line Chart
              </button>
              <button
                className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
                onClick={() => setChartType('bar')}
                title="Bar Chart"
              >
                📊 Bar Chart
              </button>
            </div>
          </div>
          
          <div className="charts-container">
            {/* Transaction Count Chart with X-Y Coordinates */}
            <div className="chart-card enhanced coordinate-chart">
              <div className="chart-header">
                <div className="chart-title-wrapper">
                  <div className="chart-icon count-icon">📈</div>
                  <div>
                    <div className="chart-title">Transaction Frequency Histogram</div>
                    <div className="chart-subtitle">n = {currentData.total.count} transactions</div>
                  </div>
                </div>
              </div>
              <div className="coordinate-chart-container">
                {/* Y-Axis Label */}
                <div className="y-axis-label">Frequency (Count)</div>
                
                {/* Chart Area */}
                <div className="chart-area">
                  {/* Y-Axis with scale */}
                  <div className="y-axis">
                    {(() => {
                      const maxCount = Math.max(...currentData.items.map(i => i.count));
                      const steps = 5;
                      const stepValue = Math.ceil(maxCount / steps);
                      return Array.from({ length: steps + 1 }, (_, i) => {
                        const value = stepValue * (steps - i);
                        return (
                          <div key={i} className="y-tick">
                            <span className="y-value">{value}</span>
                            <div className="y-line"></div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Bars and X-Axis */}
                  <div className="plot-area">
                    {/* Grid lines */}
                    <div className="grid-lines">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="grid-line"></div>
                      ))}
                    </div>
                    
                    {/* Histogram Bars */}
                    {chartType === 'histogram' && (
                      <div className="bars-container">
                        {currentData.items.map((item, index) => {
                          const maxCount = Math.max(...currentData.items.map(i => i.count));
                          const barHeight = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          
                          return (
                            <div key={index} className="bar-column">
                              <div className="bar-value-label">{item.count}</div>
                              <div 
                                className={`vertical-bar count ${item.highlight ? 'critical' : `level-${index}`}`}
                                style={{ height: `${barHeight}%` }}
                              >
                                <div className="bar-shine-vertical"></div>
                              </div>
                              <div className="x-label">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Line Chart */}
                    {chartType === 'line' && (
                      <>
                        <svg className="line-chart-svg" preserveAspectRatio="none">
                          <polyline
                            className="line-path count"
                            points={currentData.items.map((item, index) => {
                              const maxCount = Math.max(...currentData.items.map(i => i.count));
                              const x = ((index + 0.5) / currentData.items.length) * 100;
                              const y = 100 - (maxCount > 0 ? (item.count / maxCount) * 100 : 0);
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                          <polygon
                            className="line-area count"
                            points={
                              currentData.items.map((item, index) => {
                                const maxCount = Math.max(...currentData.items.map(i => i.count));
                                const x = ((index + 0.5) / currentData.items.length) * 100;
                                const y = 100 - (maxCount > 0 ? (item.count / maxCount) * 100 : 0);
                                return `${x},${y}`;
                              }).join(' ') + ` 100,100 0,100`
                            }
                          />
                        </svg>
                        <div className="line-points-container">
                          {currentData.items.map((item, index) => {
                            const maxCount = Math.max(...currentData.items.map(i => i.count));
                            const yPosition = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                            
                            return (
                              <div key={index} className="line-point-column">
                                <div className="point-value-label">{item.count}</div>
                                <div 
                                  className={`data-point count ${item.highlight ? 'critical' : `level-${index}`}`}
                                  style={{ bottom: `${yPosition}%` }}
                                >
                                  <div className="point-pulse"></div>
                                </div>
                                <div className="x-label">{item.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    
                    {/* Bar Chart with Gaps */}
                    {chartType === 'bar' && (
                      <div className="bars-container with-gaps">
                        {currentData.items.map((item, index) => {
                          const maxCount = Math.max(...currentData.items.map(i => i.count));
                          const barHeight = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          
                          return (
                            <div key={index} className="bar-column">
                              <div className="bar-value-label">{item.count}</div>
                              <div 
                                className={`vertical-bar bar-style count ${item.highlight ? 'critical' : `level-${index}`}`}
                                style={{ height: `${barHeight}%` }}
                              >
                                <div className="bar-shine-vertical"></div>
                              </div>
                              <div className="x-label">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* X-Axis Label */}
                <div className="x-axis-label">Age Groups</div>
              </div>
            </div>

            {/* Amount Chart with X-Y Coordinates */}
            <div className="chart-card enhanced coordinate-chart">
              <div className="chart-header">
                <div className="chart-title-wrapper">
                  <div className="chart-icon amount-icon">💰</div>
                  <div>
                    <div className="chart-title">Amount Distribution Histogram</div>
                    <div className="chart-subtitle">Σ = {currentData.total.amount} total value</div>
                  </div>
                </div>
              </div>
              <div className="coordinate-chart-container">
                {/* Y-Axis Label */}
                <div className="y-axis-label">Amount ($)</div>
                
                {/* Chart Area */}
                <div className="chart-area">
                  {/* Y-Axis with scale */}
                  <div className="y-axis">
                    {(() => {
                      const maxAmount = Math.max(...currentData.items.map(i => 
                        parseFloat(i.amount.replace(/[$,]/g, ''))
                      ));
                      const steps = 5;
                      const stepValue = Math.ceil(maxAmount / steps / 1000) * 1000;
                      return Array.from({ length: steps + 1 }, (_, i) => {
                        const value = stepValue * (steps - i);
                        return (
                          <div key={i} className="y-tick">
                            <span className="y-value">${(value / 1000).toFixed(0)}k</span>
                            <div className="y-line"></div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Bars and X-Axis */}
                  <div className="plot-area">
                    {/* Grid lines */}
                    <div className="grid-lines">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="grid-line"></div>
                      ))}
                    </div>
                    
                    {/* Histogram Bars */}
                    {chartType === 'histogram' && (
                      <div className="bars-container">
                        {currentData.items.map((item, index) => {
                          const maxAmount = Math.max(...currentData.items.map(i => 
                            parseFloat(i.amount.replace(/[$,]/g, ''))
                          ));
                          const itemAmount = parseFloat(item.amount.replace(/[$,]/g, ''));
                          const barHeight = maxAmount > 0 ? (itemAmount / maxAmount) * 100 : 0;
                          
                          return (
                            <div key={index} className="bar-column">
                              <div className="bar-value-label">{item.amount}</div>
                              <div 
                                className={`vertical-bar amount ${item.highlight ? 'critical' : `level-${index}`}`}
                                style={{ height: `${barHeight}%` }}
                              >
                                <div className="bar-shine-vertical"></div>
                              </div>
                              <div className="x-label">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Line Chart */}
                    {chartType === 'line' && (
                      <>
                        <svg className="line-chart-svg" preserveAspectRatio="none">
                          <polyline
                            className="line-path amount"
                            points={currentData.items.map((item, index) => {
                              const maxAmount = Math.max(...currentData.items.map(i => 
                                parseFloat(i.amount.replace(/[$,]/g, ''))
                              ));
                              const itemAmount = parseFloat(item.amount.replace(/[$,]/g, ''));
                              const x = ((index + 0.5) / currentData.items.length) * 100;
                              const y = 100 - (maxAmount > 0 ? (itemAmount / maxAmount) * 100 : 0);
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                          <polygon
                            className="line-area amount"
                            points={
                              currentData.items.map((item, index) => {
                                const maxAmount = Math.max(...currentData.items.map(i => 
                                  parseFloat(i.amount.replace(/[$,]/g, ''))
                                ));
                                const itemAmount = parseFloat(item.amount.replace(/[$,]/g, ''));
                                const x = ((index + 0.5) / currentData.items.length) * 100;
                                const y = 100 - (maxAmount > 0 ? (itemAmount / maxAmount) * 100 : 0);
                                return `${x},${y}`;
                              }).join(' ') + ` 100,100 0,100`
                            }
                          />
                        </svg>
                        <div className="line-points-container">
                          {currentData.items.map((item, index) => {
                            const maxAmount = Math.max(...currentData.items.map(i => 
                              parseFloat(i.amount.replace(/[$,]/g, ''))
                            ));
                            const itemAmount = parseFloat(item.amount.replace(/[$,]/g, ''));
                            const yPosition = maxAmount > 0 ? (itemAmount / maxAmount) * 100 : 0;
                            
                            return (
                              <div key={index} className="line-point-column">
                                <div className="point-value-label">{item.amount}</div>
                                <div 
                                  className={`data-point amount ${item.highlight ? 'critical' : `level-${index}`}`}
                                  style={{ bottom: `${yPosition}%` }}
                                >
                                  <div className="point-pulse"></div>
                                </div>
                                <div className="x-label">{item.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    
                    {/* Bar Chart with Gaps */}
                    {chartType === 'bar' && (
                      <div className="bars-container with-gaps">
                        {currentData.items.map((item, index) => {
                          const maxAmount = Math.max(...currentData.items.map(i => 
                            parseFloat(i.amount.replace(/[$,]/g, ''))
                          ));
                          const itemAmount = parseFloat(item.amount.replace(/[$,]/g, ''));
                          const barHeight = maxAmount > 0 ? (itemAmount / maxAmount) * 100 : 0;
                          
                          return (
                            <div key={index} className="bar-column">
                              <div className="bar-value-label">{item.amount}</div>
                              <div 
                                className={`vertical-bar bar-style amount ${item.highlight ? 'critical' : `level-${index}`}`}
                                style={{ height: `${barHeight}%` }}
                              >
                                <div className="bar-shine-vertical"></div>
                              </div>
                              <div className="x-label">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* X-Axis Label */}
                <div className="x-axis-label">Age Groups</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section - shown in all tabs, dynamically generated from payment states */}
        <div className="alerts-section">
          <div className="alerts-header">
            <Bell size={20} />
            <h4>Payment State Alerts</h4>
          </div>
          {currentAlerts.items.length > 0 ? (
            <>
              <div className="alerts-list">
                {currentAlerts.items.map((item, index) => (
                  <div key={index} className={`alert-item severity-${item.severity}`}>
                    <div className="alert-icon">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="alert-content">
                      <span className="alert-label">{item.label}</span>
                      <span className={`severity-badge ${item.severity}`}>
                        {item.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="alert-count">{item.count}</div>
                  </div>
                ))}
              </div>
              <div className="alerts-footer">
                <span className="alerts-total-label">{currentAlerts.total.label}</span>
                <span className="alerts-total-count">{currentAlerts.total.count}</span>
              </div>
            </>
          ) : (
            <div className="no-alerts">
              <p>No payment state alerts for current selection</p>
            </div>
          )}
        </div>
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
          allOrderTypes={['regular', 'autoship']}
          allPaymentMethods={['creditcard', 'paypal', 'applepay', 'giftcard', 'accountbalance']}
          allPaymentStates={['success', 'processing', 'failed', 'canceled', 'expired', 'declined']}
        />
      )}
    </div>
  );
}

export default AgedMetricsTabs;

