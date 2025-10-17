import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Clock, DollarSign, RefreshCw, Bell, Info, Calendar, ChevronDown, ChevronUp, RotateCcw, Settings } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchPaymentStatuses, fetchPaymentMethods, fetchOrderTypes, fetchAgedMetrics, fetchPayments, fetchAlertSettings, saveAlertSettings } from '../services/api';
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
  
  // Tab-specific filter states - each tab has its own independent filters
  const [tabFilters, setTabFilters] = useState({
    approvals: {
      orderType: 'all',
      paymentMethod: 'all',
      paymentState: 'all',
      dateFilter: 'last_7_days',
      customDateRange: { startDate: '', endDate: '' },
      frequency: 'daily'
    },
    deposit: {
      orderType: 'all',
      paymentMethod: 'all',
      paymentState: 'all',
      dateFilter: 'last_7_days',
      customDateRange: { startDate: '', endDate: '' },
      frequency: 'daily'
    },
    refunds: {
      orderType: 'all',
      paymentMethod: 'all',
      paymentState: 'all',
      dateFilter: 'last_7_days',
      customDateRange: { startDate: '', endDate: '' },
      frequency: 'daily'
    },
    reverseApproval: {
      orderType: 'all',
      paymentMethod: 'all',
      paymentState: 'all',
      dateFilter: 'last_7_days',
      customDateRange: { startDate: '', endDate: '' },
      frequency: 'daily'
    }
  });
  
  // API data states
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState([]);
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
  
  // Alert threshold settings
  const [criticalThreshold, setCriticalThreshold] = useState(100); // Default 100% for critical alert
  const [warningThreshold, setWarningThreshold] = useState(75); // Default 75% for warning alert
  const [queryText, setQueryText] = useState(''); // Query text for alerts
  const [dismissedAlerts, setDismissedAlerts] = useState({}); // Track dismissed alerts per tab
  const [showAlertSettings, setShowAlertSettings] = useState(false); // Toggle for alert settings visibility
  const [tempCriticalThreshold, setTempCriticalThreshold] = useState(100); // Temporary value for editing
  const [tempWarningThreshold, setTempWarningThreshold] = useState(75); // Temporary value for editing
  const [tempQueryText, setTempQueryText] = useState(''); // Temporary value for editing
  
  // Filter options from API
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([]);
  const [paymentStateOptions, setPaymentStateOptions] = useState([]);
  
  // Helper functions to get/set filters for the current active tab
  const getCurrentTabFilters = () => tabFilters[activeTab];
  const updateTabFilter = (filterName, value) => {
    // If changing the date filter dropdown, clear the date range calendar filters
    if (filterName === 'dateFilter') {
      setDateRanges(prev => ({
        ...prev,
        [activeTab]: { from: '', to: '' }
      }));
    }
    
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [filterName]: value
      }
    }));
  };
  
  // Shortcuts for current tab's filter values
  const orderType = tabFilters[activeTab].orderType;
  const paymentMethod = tabFilters[activeTab].paymentMethod;
  const paymentState = tabFilters[activeTab].paymentState;
  const dateFilter = tabFilters[activeTab].dateFilter;
  const customDateRange = tabFilters[activeTab].customDateRange;
  const frequency = tabFilters[activeTab].frequency;
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Sample data - memoized to categorize payments from API
  const sampleDataCache = useMemo(() => {
    if (!allPayments || allPayments.length === 0) {
      // Return empty structure if no payments loaded yet
      return {
        approvals: [],
        deposit: [],
        refunds: [],
        reverseApproval: []
      };
    }

    // Convert API payment data to frontend format and categorize by tab
    const categorizedData = {
      approvals: [],
      deposit: [],
      refunds: [],
      reverseApproval: []
    };

    allPayments.forEach(payment => {
      // Convert payment to frontend format
      const formattedPayment = {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        customerId: payment.customerId,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        amount: payment.amount,
        date: payment.createdAt,
        lastUpdated: payment.updatedAt || payment.createdAt,
        orderType: payment.orderType?.toLowerCase() || 'regular',
        paymentMethod: payment.paymentMethod?.toLowerCase().replace(/_/g, '') || 'creditcard',
        paymentState: payment.status?.toLowerCase() || 'pending',
        cardType: payment.cardType, // Include card type for credit cards
        validationStatus: payment.validationStatus, // Include validation status
        errorMessage: payment.errorMessage, // Include error message
        // Include all amount fields for proper display in OrderDetailsView
        approvalAmount: payment.approvalAmount,
        approvedAmount: payment.approvedAmount,
        depositingAmount: payment.depositingAmount,
        depositedAmount: payment.depositedAmount,
        refundAmount: payment.refundAmount,
        refundedAmount: payment.refundedAmount,
        reversingApprovalAmount: payment.reversingApprovalAmount,
        reversingApprovedAmount: payment.reversingApprovedAmount
      };

      // Categorize based on amount fields:
      // Approvals: has approvalAmount or approvedAmount
      // Deposits: has depositingAmount or depositedAmount  
      // Refunds: has refundAmount or refundedAmount
      // Reverse Approval: has reversingApprovalAmount or reversingApprovedAmount

      if (payment.approvalAmount > 0 || payment.approvedAmount > 0) {
        categorizedData.approvals.push(formattedPayment);
      }
      
      if (payment.depositingAmount > 0 || payment.depositedAmount > 0) {
        categorizedData.deposit.push(formattedPayment);
      }
      
      if (payment.refundAmount > 0 || payment.refundedAmount > 0) {
        categorizedData.refunds.push(formattedPayment);
      }
      
      if (payment.reversingApprovalAmount > 0 || payment.reversingApprovedAmount > 0) {
        categorizedData.reverseApproval.push(formattedPayment);
      }
    });

    return categorizedData;
  }, [allPayments]);

  // Original unfiltered data - memoized to prevent recreation
  // This is just the raw data structure - actual age groups will be calculated by filters
  const originalData = useMemo(() => {
    return {
    approvals: {
      title: 'Approvals',
      icon: <Clock size={20} />,
      infoText: 'Default Pending Approvals since 7 days',
      sampleData: sampleDataCache.approvals,
        items: [], // Will be calculated by applyFiltersToTab
        total: { count: 0, amount: '$0.00' }
    },
    deposit: {
      title: 'Deposits',
      icon: <DollarSign size={20} />,
      infoText: 'Default Pending Deposits since 7 days',
      sampleData: sampleDataCache.deposit,
        items: [], // Will be calculated by applyFiltersToTab
        total: { count: 0, amount: '$0.00' }
    },
    refunds: {
      title: 'Refunds',
      icon: <RefreshCw size={20} />,
      infoText: 'Default Pending Refunds since 7 days',
      sampleData: sampleDataCache.refunds,
        items: [], // Will be calculated by applyFiltersToTab
        total: { count: 0, amount: '$0.00' }
    },
    reverseApproval: {
      title: 'Reverse Approval',
      icon: <RotateCcw size={20} />,
      infoText: 'Default Pending Reverse Approvals since 7 days',
      sampleData: sampleDataCache.reverseApproval,
        items: [], // Will be calculated by applyFiltersToTab
        total: { count: 0, amount: '$0.00' }
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
    };
  }, [sampleDataCache]);

  // Use filteredData if available, otherwise fall back to originalData
  const metricsData = useMemo(() => {
    // Use filteredData if it exists (which has properly separated tab-specific data)
    if (filteredData) {
      return {
        approvals: {
          ...filteredData.approvals,
          icon: <Clock size={20} />
        },
        deposit: {
          ...filteredData.deposit,
          icon: <DollarSign size={20} />
        },
        refunds: {
          ...filteredData.refunds,
          icon: <RefreshCw size={20} />
        },
        reverseApproval: {
          ...filteredData.reverseApproval,
          icon: <RotateCcw size={20} />
        }
      };
    }
    
    // Fall back to originalData if no filtered data yet
    return {
      approvals: {
        ...originalData.approvals,
        icon: <Clock size={20} />
      },
      deposit: {
        ...originalData.deposit,
        icon: <DollarSign size={20} />
      },
      refunds: {
        ...originalData.refunds,
        icon: <RefreshCw size={20} />
      },
      reverseApproval: {
        ...originalData.reverseApproval,
        icon: <RotateCcw size={20} />
      }
    };
  }, [filteredData, originalData]);

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
    
    // Get tab-specific filters
    const tabFilterValues = tabFilters[tabId];
    const tabPaymentState = tabFilterValues.paymentState;
    const tabOrderType = tabFilterValues.orderType;
    const tabPaymentMethod = tabFilterValues.paymentMethod;
    const tabDateFilter = tabFilterValues.dateFilter;
    
    const hasFilters = tabDateFilter || 
                       dateRanges[tabId].from || 
                       dateRanges[tabId].to || 
                       tabOrderType !== 'all' || 
                       tabPaymentMethod !== 'all' || 
                       tabPaymentState !== 'all';
    
    if (!hasFilters) {
      return `All ${tabNames[tabId]} - Last 7 days`;
    }
    
    // Start with payment state if specified, otherwise "All"
    const stateLabel = tabPaymentState !== 'all' ? tabPaymentState.charAt(0).toUpperCase() + tabPaymentState.slice(1) : 'All';
    let parts = [`${stateLabel} ${tabNames[tabId]}`];
    
    // Add date filter info
    if (tabDateFilter) {
      parts.push(dateFilterLabels[tabDateFilter] || tabDateFilter);
    }
    
    // Add date range info (old calendar)
    if (dateRanges[tabId].from || dateRanges[tabId].to) {
      const fromDate = dateRanges[tabId].from ? new Date(dateRanges[tabId].from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start';
      const toDate = dateRanges[tabId].to ? new Date(dateRanges[tabId].to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End';
      parts.push(`from ${fromDate} to ${toDate}`);
    }
    
    // Add additional filter info (excluding payment state since it's already in the label)
    const filters = [];
    if (tabOrderType !== 'all') filters.push(`Type: ${tabOrderType}`);
    if (tabPaymentMethod !== 'all') filters.push(`Method: ${tabPaymentMethod}`);
    
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

  // Custom tooltip for alert chart showing payment state breakdown
  const CustomAlertTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const stateBreakdown = data.stateBreakdown || {};
      const totalCount = data.count || 0;
      
      // Format payment state names
      const formatStateName = (state) => {
        if (state === 'undefined') return 'Undefined State';
        return state.charAt(0).toUpperCase() + state.slice(1);
      };
      
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            {label}
          </p>
          <p style={{ marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
            Total Non-Success: {totalCount}
          </p>
          {Object.keys(stateBreakdown).length > 0 ? (
            <div style={{ fontSize: '13px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px', color: '#6b7280' }}>Breakdown:</p>
              {Object.entries(stateBreakdown)
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .map(([state, count]) => (
                  <div key={state} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '2px',
                    paddingLeft: '8px'
                  }}>
                    <span style={{ color: '#4b5563' }}>{formatStateName(state)}:</span>
                    <span style={{ fontWeight: '600', marginLeft: '12px', color: '#111827' }}>{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No data</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Generate alert chart data - shows non-success transactions based on date filter and frequency
  const generateAlertsFromData = (data, dateFilterParam, frequencyParam) => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const periods = [];
    
    // Determine the date range based on the filter
    const dateRange = getDateRangeFromFilter(dateFilterParam, customDateRange);
    if (!dateRange) return [];
    
    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate;
    
    // Generate periods based on frequency
    if (frequencyParam === 'hourly') {
      // Generate hourly periods
      const startHour = new Date(startDate);
      startHour.setMinutes(0, 0, 0);
      const endHour = new Date(endDate);
      
      let currentHour = new Date(startHour);
      while (currentHour <= endHour) {
        const nextHour = new Date(currentHour);
        nextHour.setHours(currentHour.getHours() + 1);
      
      periods.push({
          date: new Date(currentHour),
          label: currentHour.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true }),
          fullLabel: currentHour.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true }),
        count: 0,
          periodStart: new Date(currentHour),
          periodEnd: nextHour,
          stateBreakdown: {}
        });
        
        currentHour = nextHour;
      }
    } else if (frequencyParam === 'weekly') {
      // Generate weekly periods
      const startWeek = new Date(startDate);
      startWeek.setHours(0, 0, 0, 0);
      const dayOfWeek = startWeek.getDay();
      startWeek.setDate(startWeek.getDate() - dayOfWeek); // Go to start of week (Sunday)
      
      let currentWeek = new Date(startWeek);
      while (currentWeek <= endDate) {
        const nextWeek = new Date(currentWeek);
        nextWeek.setDate(currentWeek.getDate() + 7);
        
        const weekEnd = new Date(currentWeek);
        weekEnd.setDate(currentWeek.getDate() + 6);
        
        periods.push({
          date: new Date(currentWeek),
          label: `${currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          fullLabel: `Week of ${currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          count: 0,
          periodStart: new Date(currentWeek),
          periodEnd: nextWeek,
          stateBreakdown: {}
        });
        
        currentWeek = nextWeek;
      }
    } else if (frequencyParam === 'monthly') {
      // Generate monthly periods
      const startMonth = new Date(startDate);
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);
      
      let currentMonth = new Date(startMonth);
      while (currentMonth <= endDate) {
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(currentMonth.getMonth() + 1);
        
        periods.push({
          date: new Date(currentMonth),
          label: currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          fullLabel: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          count: 0,
          periodStart: new Date(currentMonth),
          periodEnd: nextMonth,
          stateBreakdown: {}
        });
        
        currentMonth = nextMonth;
      }
    } else {
      // Default: daily periods
      let currentDay = new Date(startDate);
      currentDay.setHours(0, 0, 0, 0);
      
      while (currentDay <= endDate) {
        const nextDay = new Date(currentDay);
        nextDay.setDate(currentDay.getDate() + 1);
        
        const isToday = currentDay.toDateString() === now.toDateString();
        const isYesterday = currentDay.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
        
        periods.push({
          date: new Date(currentDay),
          label: isToday ? 'Today' : isYesterday ? 'Yesterday' : currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullLabel: currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0,
          periodStart: new Date(currentDay),
          periodEnd: nextDay,
          stateBreakdown: {}
        });
        
        currentDay = nextDay;
      }
    }
    
    // Count only non-success transactions for each period and track by state
    data.forEach(item => {
      // Include non-success transactions (including null/undefined as non-success)
      if (item.paymentState !== 'success') {
        const itemDate = new Date(item.date);
        
        // Find which period this transaction belongs to
        for (const period of periods) {
          if (itemDate >= period.periodStart && itemDate < period.periodEnd) {
            period.count++;
            // Track by payment state
            const state = item.paymentState || 'undefined';
            period.stateBreakdown[state] = (period.stateBreakdown[state] || 0) + 1;
            break;
          }
        }
      }
    });
    
    return periods;
  };

  // Helper function: Convert date filter selection to actual date range
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
        if (customRange && customRange.startDate && customRange.endDate) {
          startDate = new Date(customRange.startDate);
          endDate = new Date(customRange.endDate);
        }
        break;
      default:
        return null;
    }
    
    return startDate ? { startDate, endDate } : null;
  };

  // Helper functions for filtering data
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
    if (!dateRange) {
      return data;
    }
    
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
    // Normalize both sides by removing underscores for comparison
    const normalizedMethod = method.toLowerCase().replace(/_/g, '');
    return data.filter(item => {
      const itemMethod = item.paymentMethod?.toLowerCase().replace(/_/g, '');
      return itemMethod === normalizedMethod;
    });
  };

  const filterDataByPaymentState = (data, state) => {
    if (state === 'all') return data;
    // Normalize both sides by removing underscores for comparison
    const normalizedState = state.toLowerCase().replace(/_/g, '');
    return data.filter(item => {
      const itemState = item.paymentState?.toLowerCase().replace(/_/g, '');
      return itemState === normalizedState;
    });
  };

  // Generate dynamic alerts based on current tab's data
  const currentAlerts = useMemo(() => {
    // Helper function to get human-readable date period label
    const getDatePeriodLabel = () => {
      const labels = {
        'last_15_min': 'Last 15 Minutes',
        'last_1_hour': 'Last 1 Hour',
        'last_24_hours': 'Last 24 Hours',
        'last_7_days': 'Last 7 Days',
        'last_28_days': 'Last 28 Days',
        'last_3_months': 'Last 3 Months',
        'last_1_year': 'Last 1 Year'
      };
      return labels[dateFilter] || 'Selected Period';
    };
    
    // Helper function to get dynamic label based on active tab
    const getDynamicLabel = () => {
      const periodLabel = getDatePeriodLabel();
      const labels = {
        approvals: `Total Non-Success Approvals (${periodLabel})`,
        deposits: `Total Non-Success Deposits (${periodLabel})`,
        refunds: `Total Non-Success Refunds (${periodLabel})`,
        reverseApproval: `Total Non-Success Reverse Approvals (${periodLabel})`
      };
      return labels[activeTab] || `Total Non-Success Transactions (${periodLabel})`;
    };
    
    // Get original unfiltered data to apply filters manually
    // This ensures we use the EXACT same filtering logic as the Age Distribution chart
    const originalDataSource = originalData[activeTab];
    if (!originalDataSource || !originalDataSource.sampleData) {
      return { 
        items: [], 
        total: { count: 0, label: getDynamicLabel() },
        showGraph: false,
        alertLevel: 'none',
        percentage: 0,
        nonSuccessCount: 0,
        totalTransactions: 0,
        periodLabel: getDatePeriodLabel()
      };
    }
    
    // Apply the EXACT SAME filters as applyFiltersToTab (including payment state)
    // This ensures alert counts MATCH the Age Distribution chart exactly
    let alertData = [...originalDataSource.sampleData];
    
    // Apply date period filter (from dropdown) - SAME as applyFiltersToTab
    if (dateFilter) {
      alertData = filterDataByDateFilter(alertData, dateFilter, customDateRange);
    }
    
    // Apply date range filters (from calendar) - SAME as applyFiltersToTab
    const from = dateRanges[activeTab]?.from;
    const to = dateRanges[activeTab]?.to;
    alertData = filterDataByDate(alertData, from, to);
    
    // Apply order type filter - SAME as applyFiltersToTab
    alertData = filterDataByOrderType(alertData, orderType);
    
    // Apply payment method filter - SAME as applyFiltersToTab
    alertData = filterDataByPaymentMethod(alertData, paymentMethod);
    
    // Apply payment state filter - SAME as applyFiltersToTab
    // This ensures alert counts MATCH the Age Distribution chart exactly
    alertData = filterDataByPaymentState(alertData, paymentState);
    
    if (alertData.length > 0) {
      // Generate alerts chart (distributes transactions based on date filter and frequency)
      const alerts = generateAlertsFromData(alertData, dateFilter, frequency);
      
      // Total count = non-success from alert data (with ALL filters applied including payment state)
      const totalCount = alertData.filter(item => 
        item.paymentState !== 'success'
      ).length;
      
      // Calculate non-success percentage from alert data
      const originalDataSource = { sampleData: alertData };
      const originalTotal = originalDataSource?.sampleData?.length || 0;
      // Count all non-success transactions (including null/undefined states as non-success)
      const originalNonSuccessCount = originalDataSource?.sampleData?.filter(item => 
        item.paymentState !== 'success'
      ).length || 0;
      const originalSuccessCount = originalDataSource?.sampleData?.filter(item => 
        item.paymentState === 'success'
      ).length || 0;
      const originalNullOrUndefinedCount = originalDataSource?.sampleData?.filter(item => 
        !item.paymentState
      ).length || 0;
      const nonSuccessPercentage = originalTotal > 0 ? (originalNonSuccessCount / originalTotal) * 100 : 0;
      
      // Determine if we should show the graph based on configurable thresholds
      let alertLevel = 'none';
      let showGraph = false;
      
      if (originalTotal > 0) {
        if (nonSuccessPercentage >= criticalThreshold) {
          alertLevel = 'critical';
          showGraph = true;
        } else if (nonSuccessPercentage >= warningThreshold) {
          alertLevel = 'warning';
          showGraph = true;
        }
      }
      
      return {
        items: alerts,
        total: { count: totalCount, label: getDynamicLabel() },
        showGraph: showGraph,
        alertLevel: alertLevel,
        percentage: nonSuccessPercentage,
        nonSuccessCount: originalNonSuccessCount,
        totalTransactions: originalTotal,
        periodLabel: getDatePeriodLabel()
      };
    }
    
    // Fallback return when no data
    return { 
      items: [], 
      total: { count: 0, label: getDynamicLabel() },
      showGraph: false,
      alertLevel: 'none',
      percentage: 0,
      nonSuccessCount: 0,
      totalTransactions: 0,
      periodLabel: getDatePeriodLabel()
    };
  }, [activeTab, originalData, metricsData, dateRanges, tabFilters, criticalThreshold, warningThreshold]); // Tab-specific filters via tabFilters[activeTab]

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setShowTooltip(null);
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

  // Determine how many time units to show based on date filter and frequency
  // Matches backend logic from PaymentService.java
  const getTimeRangeInUnits = (dateFilter, frequency) => {
    if (!dateFilter) dateFilter = 'last_7_days';
    if (!frequency) frequency = 'daily';
    
    switch (frequency.toLowerCase()) {
      case 'hourly':
        // For hourly, show hours based on date filter
        switch (dateFilter) {
          case 'last_15_min': return 1;
          case 'last_60_min': return 1;
          case 'last_4_hours': return 4;
          case 'last_24_hours':
          case 'today': return 24;
          case 'yesterday': return 24;
          case 'last_7_days':
          case 'last_week': return 7 * 24;
          case 'last_28_days': return 28 * 24;
          case 'last_30_days':
          case 'last_month':
          case 'last_1_month': return 30 * 24;
          case 'last_90_days': return 90 * 24;
          default: return 24;
        }
        
      case 'weekly':
        // For weekly, show weeks based on date filter
        switch (dateFilter) {
          case 'last_7_days':
          case 'last_week': return 1;
          case 'last_28_days': return 4;
          case 'last_30_days':
          case 'last_month':
          case 'last_1_month': return 4;
          case 'last_90_days': return 12;
          default: return 4;
        }
        
      case 'monthly':
        // For monthly, show months based on date filter
        switch (dateFilter) {
          case 'last_30_days':
          case 'last_month':
          case 'last_1_month': return 1;
          case 'last_90_days': return 3;
          default: return 3;
        }
        
      case 'daily':
      default:
        // For daily, show days based on date filter
        switch (dateFilter) {
          case 'last_15_min':
          case 'last_60_min':
          case 'last_4_hours':
          case 'last_24_hours':
          case 'today':
          case 'yesterday': return 1;
          case 'last_7_days':
          case 'last_week': return 7;
          case 'last_28_days': return 28;
          case 'last_30_days':
          case 'last_month':
          case 'last_1_month': return 30;
          case 'last_90_days': return 90;
          default: return 7;
        }
    }
  };

  const calculateAgeGroups = (data, filter, freq = 'daily') => {
    // Always use dynamic grouping based on frequency (matching Overview chart behavior)
    // This ensures time periods are calculated dynamically from transaction timestamps
    // rather than using hardcoded age buckets
    // Pass the date filter so we can generate the correct number of periods
    return groupByFrequency(data, freq, filter);
  };
  
  // Group transactions by frequency (hourly, daily, weekly, monthly)
  // Uses the same logic as backend API for consistent labeling
  // Generates ALL expected time periods based on dateFilter, not just periods with data
  const groupByFrequency = (data, freq, dateFilter = 'last_7_days') => {
    const now = new Date();
    
    // Step 1: Determine how many periods to generate based on date filter and frequency
    const periodCount = getTimeRangeInUnits(dateFilter, freq);
    
    // Step 2: Pre-create all expected time period groups (even empty ones)
    const groups = {};
    for (let i = 0; i < periodCount; i++) {
      let groupKey;
      let sortKey = i;
      
      if (freq === 'hourly') {
        groupKey = `${i}h ago`;
      } else if (freq === 'daily') {
        if (i === 0) {
          groupKey = 'Today';
        } else if (i === 1) {
          groupKey = 'Yesterday';
        } else {
          groupKey = `${i} days ago`;
        }
      } else if (freq === 'weekly') {
        groupKey = `Week ${i + 1}`;
      } else if (freq === 'monthly') {
        groupKey = `Month ${i + 1}`;
      } else {
        // Default to daily
        if (i === 0) {
          groupKey = 'Today';
        } else if (i === 1) {
          groupKey = 'Yesterday';
        } else {
          groupKey = `${i} days ago`;
        }
      }
      
      groups[groupKey] = { count: 0, amount: 0, transactions: [], sortKey };
    }
    
    // Step 3: Distribute transactions into the pre-created groups
    data.forEach(item => {
      const itemDate = new Date(item.date);
      const diffMs = now - itemDate;
      let groupKey;
      let sortKey;
      
      if (freq === 'hourly') {
        // Group by hours ago (matching backend: "0h ago", "1h ago", etc.)
        const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
        groupKey = `${hoursAgo}h ago`;
        sortKey = hoursAgo;
      } else if (freq === 'daily') {
        // Group by days ago (matching backend: "Today", "Yesterday", "2 days ago", etc.)
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysAgo === 0) {
          groupKey = 'Today';
        } else if (daysAgo === 1) {
          groupKey = 'Yesterday';
        } else {
          groupKey = `${daysAgo} days ago`;
        }
        sortKey = daysAgo;
      } else if (freq === 'weekly') {
        // Group by weeks ago (matching backend: "Week 1", "Week 2", etc.)
        const weeksAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        groupKey = `Week ${weeksAgo + 1}`;
        sortKey = weeksAgo;
      } else if (freq === 'monthly') {
        // Group by months ago (matching backend: "Month 1", "Month 2", etc.)
        const monthsAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
        groupKey = `Month ${monthsAgo + 1}`;
        sortKey = monthsAgo;
      } else {
        // Default to daily
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysAgo === 0) {
          groupKey = 'Today';
        } else if (daysAgo === 1) {
          groupKey = 'Yesterday';
        } else {
          groupKey = `${daysAgo} days ago`;
        }
        sortKey = daysAgo;
      }
      
      // Only add to group if it was pre-created (within the expected time range)
      if (groups[groupKey]) {
        groups[groupKey].count++;
        groups[groupKey].amount += item.amount;
        groups[groupKey].transactions.push(item);
      }
    });
    
    // Sort by date and format
    const result = Object.entries(groups)
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([label, data]) => ({
      label,
      count: data.count,
      amount: `$${data.amount.toFixed(2)}`,
        highlight: false,
      transactions: data.transactions
    }));
    
    return result;
  };

  const handleAgeGroupClick = (ageGroupItem) => {
    setSelectedAgeGroup(ageGroupItem.label);
    setAgeGroupTransactions(ageGroupItem.transactions || []);
  };

  const handleCloseTransactionDetails = () => {
    setSelectedAgeGroup(null);
    setAgeGroupTransactions([]);
  };

  // Apply filters to a single tab
  const applyFiltersToTab = React.useCallback((tabId) => {
    const { from, to } = dateRanges[tabId];
    
    // Skip filtering for tabs without sample data
    if (!originalData[tabId].sampleData) {
      return null;
    }

    // Get tab-specific filters
    const tabFiltersForThisTab = tabFilters[tabId];
    const {
      orderType: tabOrderType,
      paymentMethod: tabPaymentMethod,
      paymentState: tabPaymentState,
      dateFilter: tabDateFilter,
      customDateRange: tabCustomDateRange,
      frequency: tabFrequency
    } = tabFiltersForThisTab;

    let filtered = [...originalData[tabId].sampleData];
    
    // Apply all filters in sequence using tab-specific filter values
    // First apply the date period filter (from dropdown)
    if (tabDateFilter) {
      filtered = filterDataByDateFilter(filtered, tabDateFilter, tabCustomDateRange);
    }
    
    // Then apply the old date range filters (if any)
    filtered = filterDataByDate(filtered, from, to);
    filtered = filterDataByOrderType(filtered, tabOrderType);
    filtered = filterDataByPaymentMethod(filtered, tabPaymentMethod);
    filtered = filterDataByPaymentState(filtered, tabPaymentState);
    
    // Calculate age groups with frequency - pass the frequency parameter
    const ageGroups = calculateAgeGroups(filtered, tabDateFilter, tabFrequency);
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
  }, [dateRanges, originalData, tabFilters]);

  // Apply filters to all tabs (each tab uses its own filters)
  const applyFiltersToAllTabs = React.useCallback(() => {
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

    setFilteredData(newFilteredData);
  }, [applyFiltersToTab, originalData, tabFilters]);


  const clearAllFilters = () => {
    // Reset only the current tab's filter states
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: {
        orderType: 'all',
        paymentMethod: 'all',
        paymentState: 'all',
        dateFilter: 'last_7_days',
        customDateRange: { startDate: '', endDate: '' },
        frequency: 'daily'
      }
    }));
    
    // Reset the current tab's date range
    setDateRanges(prev => ({
      ...prev,
      [activeTab]: defaultRange
    }));
    
    // NOTE: No need to call applyFiltersToAllTabs() - the filter state changes
    // will automatically trigger the useEffect that fetches from API
    
    // Show success toast
    setToastMessage(`✓ Filters reset to defaults for ${activeTab} tab (7 days, All payment states, Daily frequency)`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };


  // Fetch all payments from API on mount
  React.useEffect(() => {
    const loadAllPayments = async () => {
      try {
        setLoading(true);
        const payments = await fetchPayments();
        setAllPayments(payments);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching payments:', error);
        setLoading(false);
        alert('Failed to load payment data from database. Please try again.');
      }
    };
    
    loadAllPayments();
  }, []);

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
        // Set empty arrays if API fails (no hardcoded fallback)
        setOrderTypeOptions([]);
        setPaymentMethodOptions([]);
        setPaymentStateOptions([]);
        setFiltersLoading(false);
      }
    };
    
    loadFilterOptions();
  }, []);

  // Fetch alert settings from API on mount
  React.useEffect(() => {
    const loadAlertSettings = async () => {
      try {
        const settings = await fetchAlertSettings();
        setCriticalThreshold(settings.criticalThreshold);
        setWarningThreshold(settings.warningThreshold);
        setQueryText(settings.queryText || '');
        setTempCriticalThreshold(settings.criticalThreshold);
        setTempWarningThreshold(settings.warningThreshold);
        setTempQueryText(settings.queryText || '');
      } catch (error) {
        console.error('Error loading alert settings:', error);
        // Use default values if fetching fails
      }
    };
    
    loadAlertSettings();
  }, []);

  // Apply client-side filters whenever tab filters or sample data changes
  React.useEffect(() => {
    // Only apply filters if we have sample data
    if (sampleDataCache.approvals.length > 0 || 
        sampleDataCache.deposit.length > 0 || 
        sampleDataCache.refunds.length > 0 || 
        sampleDataCache.reverseApproval.length > 0) {
      applyFiltersToAllTabs();
    }
  }, [tabFilters, sampleDataCache, applyFiltersToAllTabs, activeTab]);

  // NOTE: Using client-side filtering with tab-specific filters
  // Each tab maintains its own independent filter state and applies filters separately

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
                  <span 
                    className="tab-info-icon-button"
                    role="button"
                    tabIndex={0}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
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
                      }
                    }}
                    onMouseLeave={() => setTimeout(() => setShowTooltip(null), 200)}
                  >
                    <Info size={14} />
                  </span>
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
                onChange={(e) => updateTabFilter('orderType', e.target.value)}
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
                onChange={(e) => updateTabFilter('paymentMethod', e.target.value)}
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
                onChange={(e) => updateTabFilter('paymentState', e.target.value)}
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
                  setDateFilter={(value) => updateTabFilter('dateFilter', value)}
                  customDateRange={customDateRange}
                  setCustomDateRange={(value) => updateTabFilter('customDateRange', value)}
                  idPrefix="aged-metrics"
                />
                <div className="frequency-filter" style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
                  <label htmlFor="aged-metrics-frequency-select" style={{ fontSize: '14px', fontWeight: '500', marginRight: '8px' }}>
                    Frequency:
                  </label>
                  <select
                    id="aged-metrics-frequency-select"
                    value={frequency}
                    onChange={(e) => updateTabFilter('frequency', e.target.value)}
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
                    <div className="chart-title">
                      {activeTab === 'approvals' ? 'Approval Requests Frequency' : 
                       activeTab === 'deposit' ? 'Deposit Requests Frequency' : 
                       activeTab === 'refunds' ? 'Refund Requests Frequency' : 
                       activeTab === 'reverseApproval' ? 'Reverse Approval Requests Frequency' : 
                       'Transaction Frequency'}
                    </div>
                    <div className="chart-subtitle">
                      n = {currentData.total.count} transactions
                      <span style={{ marginLeft: '10px', fontSize: '11px', color: '#667eea', fontStyle: 'italic' }}>
                        (Click bar to view details)
                      </span>
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
                        if (data && data.originalItem) {
                          handleAgeGroupClick(data.originalItem);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {currentData.items.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.highlight ? '#dc2626' : '#667eea'}
                          style={{ cursor: 'pointer' }}
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
                      <span style={{ marginLeft: '10px', fontSize: '11px', color: '#48bb78', fontStyle: 'italic' }}>
                        (Click bar to view details)
                      </span>
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
                        if (data && data.originalItem) {
                          handleAgeGroupClick(data.originalItem);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {currentData.items.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.highlight ? '#dc2626' : '#48bb78'}
                          style={{ cursor: 'pointer' }}
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
        {!loading && (() => {
          // Generate dynamic X-axis label based on date filter and frequency
          const getXAxisLabel = () => {
            const datePeriodLabels = {
              'last_15_min': 'Last 15 Minutes',
              'last_1_hour': 'Last 1 Hour',
              'last_24_hours': 'Last 24 Hours',
              'last_7_days': 'Last 7 Days',
              'last_28_days': 'Last 28 Days',
              'last_3_months': 'Last 3 Months',
              'last_1_year': 'Last 1 Year'
            };
            
            const frequencyLabels = {
              'hourly': 'Hourly',
              'daily': 'Daily',
              'weekly': 'Weekly',
              'monthly': 'Monthly'
            };
            
            const periodText = datePeriodLabels[dateFilter] || 'Selected Period';
            const freqText = frequencyLabels[frequency] || 'Daily';
            
            return `Time Period - ${freqText} (${periodText})`;
          };
          
          // Generate dynamic heading based on active tab
          const getAlertHeading = () => {
            const headings = {
              approvals: 'Alerts for Approvals',
              deposits: 'Alerts for Deposits',
                      refunds: 'Alerts for Refunds',
                      reverseApproval: 'Alerts for Reverse Approval'
                    };
            return headings[activeTab] || 'Alerts';
          };
          
          // Generate dynamic Y-axis label based on active tab
          const getYAxisLabel = () => {
            const labels = {
              approvals: 'Approval Requests',
              deposits: 'Deposit Requests',
              refunds: 'Refund Requests',
              reverseApproval: 'Reverse Approval Requests'
            };
            return labels[activeTab] || 'Transaction Count';
          };
          
          return (
            <div className="alerts-section">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '10px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1e293b',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {getAlertHeading()}
                  {currentAlerts.showGraph && currentAlerts.items.length > 0 && (
                    <span 
                      style={{ 
                        fontSize: '28px',
                        animation: 'pulse 2s ease-in-out infinite',
                        display: 'inline-block'
                      }}
                      title={currentAlerts.alertLevel === 'critical' ? 'Critical Alert' : 'Warning Alert'}
                    >
                      {currentAlerts.alertLevel === 'critical' ? '🚨' : '⚠️'}
                  </span>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setTempCriticalThreshold(criticalThreshold);
                    setTempWarningThreshold(warningThreshold);
                    setTempQueryText(queryText);
                    setShowAlertSettings(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s',
                    color: '#64748b'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Alert Settings"
                >
                  <Settings size={20} />
                </button>
                    </div>


              {currentAlerts.showGraph && currentAlerts.items.length > 0 ? (
                <>
              <div className="alerts-chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={currentAlerts.items.map(item => ({
                      name: item.fullLabel || item.label,
                          count: item.count,
                          stateBreakdown: item.stateBreakdown
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                          label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -10 }}
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      content={<CustomAlertTooltip />}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={currentAlerts.alertLevel === 'critical' ? '#dc2626' : '#d97706'}
                      strokeWidth={3}
                      dot={{ 
                        fill: currentAlerts.alertLevel === 'critical' ? '#dc2626' : '#d97706', 
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
                    ⚠️ Warning alert appears when {warningThreshold}%+ transactions are non-success (Critical at {criticalThreshold}%+)
                  </p>
            </div>
              ) : (
                <p>✓ No non-success transactions - All transactions successful!</p>
              )}
            </div>
          )}
        </div>
          );
        })()}

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
          activeTab={activeTab}
        />
      )}

      {/* Alert Settings Modal */}
      {showAlertSettings && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowAlertSettings(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '24px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Settings size={24} />
              Alert Threshold Settings
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="modal-warning-threshold" style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#475569',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  ⚠️ Warning Threshold (%)
                </label>
                <input
                  id="modal-warning-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={tempWarningThreshold}
                  onChange={(e) => {
                    const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setTempWarningThreshold(value);
                    if (value >= tempCriticalThreshold) {
                      setTempCriticalThreshold(Math.min(100, value + 1));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    marginBottom: '8px'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Show warning alert when ≥ {tempWarningThreshold}% of transactions fail
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="modal-critical-threshold" style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#475569',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  🔴 Critical Threshold (%)
                </label>
                <input
                  id="modal-critical-threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={tempCriticalThreshold}
                  onChange={(e) => {
                    const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setTempCriticalThreshold(value);
                    if (value <= tempWarningThreshold) {
                      setTempWarningThreshold(Math.max(0, value - 1));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    marginBottom: '8px'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Show critical alert when ≥ {tempCriticalThreshold}% of transactions fail
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="modal-query-text" style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#475569',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  📝 Query Text
                </label>
                <textarea
                  id="modal-query-text"
                  value={tempQueryText}
                  onChange={(e) => setTempQueryText(e.target.value)}
                  placeholder="Enter a custom query or note for this alert configuration..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    marginBottom: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Optional: Add a custom query or note to describe this alert configuration
                </p>
              </div>

              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#475569',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  💡 <strong>Tip:</strong> Critical threshold should be higher than warning threshold. 
                  Adjust these values to customize when alerts appear in your dashboard.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setShowAlertSettings(false)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Save to database
                    await saveAlertSettings(tempWarningThreshold, tempCriticalThreshold, tempQueryText);
                    
                    // Update local state
                    setCriticalThreshold(tempCriticalThreshold);
                    setWarningThreshold(tempWarningThreshold);
                    setQueryText(tempQueryText);
                    setShowAlertSettings(false);
                    
                    // Show success message
                    setToastMessage('✓ Alert threshold settings saved successfully');
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                  } catch (error) {
                    console.error('Error saving alert settings:', error);
                    // Show error message
                    setToastMessage('✗ Failed to save alert settings: ' + (error.response?.data?.error || error.message));
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 5000);
                  }
                }}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AgedMetricsTabs;

