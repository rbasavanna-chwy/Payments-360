import React, { useState, useMemo, useEffect } from 'react';
import DateFilter from './DateFilter';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchAgedMetrics } from '../services/api';
import './OverviewChart.css';

function OverviewChart({ onNavigate }) {
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [frequency, setFrequency] = useState('daily'); // 'hourly', 'daily', 'weekly', 'monthly'
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment states configuration with color shades
  const paymentStates = [
    { key: 'success', label: 'Success', shade: 1.0 },      // Full opacity - brightest
    { key: 'processing', label: 'Processing', shade: 0.7 }, // 70% opacity - medium
    { key: 'failed', label: 'Failed', shade: 0.4 }          // 40% opacity - lightest
  ];

  // Metric types configuration with base colors
  const metrics = [
    { key: 'approvals', label: 'Approvals', color: '#667eea' },           // Purple
    { key: 'deposits', label: 'Deposits', color: '#48bb78' },             // Green
    { key: 'refunds', label: 'Refunds', color: '#ed8936' },               // Orange
    { key: 'reverseApproval', label: 'Reverse Approval', color: '#f56565' } // Red
  ];

  // Get dynamic age groups based on selected date filter - Always return 7 categories
  const getDynamicAgeGroups = (filter) => {
    switch (filter) {
      case 'last_15_min':
        return [
          { label: '0-2 min', min: 0, max: 2, unit: 'minutes' },
          { label: '2-4 min', min: 2, max: 4, unit: 'minutes' },
          { label: '4-6 min', min: 4, max: 6, unit: 'minutes' },
          { label: '6-8 min', min: 6, max: 8, unit: 'minutes' },
          { label: '8-10 min', min: 8, max: 10, unit: 'minutes' },
          { label: '10-12 min', min: 10, max: 12, unit: 'minutes' },
          { label: '12-15 min', min: 12, max: 15, unit: 'minutes' }
        ];
      case 'last_60_min':
        return [
          { label: '0-8 min', min: 0, max: 8, unit: 'minutes' },
          { label: '8-16 min', min: 8, max: 16, unit: 'minutes' },
          { label: '16-24 min', min: 16, max: 24, unit: 'minutes' },
          { label: '24-32 min', min: 24, max: 32, unit: 'minutes' },
          { label: '32-40 min', min: 32, max: 40, unit: 'minutes' },
          { label: '40-50 min', min: 40, max: 50, unit: 'minutes' },
          { label: '50-60 min', min: 50, max: 60, unit: 'minutes' }
        ];
      case 'last_4_hours':
        return [
          { label: '0-30 min', min: 0, max: 0.5, unit: 'hours' },
          { label: '30-60 min', min: 0.5, max: 1, unit: 'hours' },
          { label: '1-1.5 hours', min: 1, max: 1.5, unit: 'hours' },
          { label: '1.5-2 hours', min: 1.5, max: 2, unit: 'hours' },
          { label: '2-2.5 hours', min: 2, max: 2.5, unit: 'hours' },
          { label: '2.5-3 hours', min: 2.5, max: 3, unit: 'hours' },
          { label: '3-4 hours', min: 3, max: 4, unit: 'hours' }
        ];
      case 'last_24_hours':
      case 'today':
        return [
          { label: '0-3 hours', min: 0, max: 3, unit: 'hours' },
          { label: '3-6 hours', min: 3, max: 6, unit: 'hours' },
          { label: '6-9 hours', min: 6, max: 9, unit: 'hours' },
          { label: '9-12 hours', min: 9, max: 12, unit: 'hours' },
          { label: '12-15 hours', min: 12, max: 15, unit: 'hours' },
          { label: '15-18 hours', min: 15, max: 18, unit: 'hours' },
          { label: '18-24 hours', min: 18, max: 24, unit: 'hours' }
        ];
      case 'yesterday':
        return [
          { label: '0-3 hours', min: 0, max: 3, unit: 'hours' },
          { label: '3-6 hours', min: 3, max: 6, unit: 'hours' },
          { label: '6-9 hours', min: 6, max: 9, unit: 'hours' },
          { label: '9-12 hours', min: 9, max: 12, unit: 'hours' },
          { label: '12-15 hours', min: 12, max: 15, unit: 'hours' },
          { label: '15-18 hours', min: 15, max: 18, unit: 'hours' },
          { label: '18-24 hours', min: 18, max: 24, unit: 'hours' }
        ];
      case 'last_7_days':
      case 'last_week':
        return [
          { label: 'Day 1', min: 0, max: 1, unit: 'days' },
          { label: 'Day 2', min: 1, max: 2, unit: 'days' },
          { label: 'Day 3', min: 2, max: 3, unit: 'days' },
          { label: 'Day 4', min: 3, max: 4, unit: 'days' },
          { label: 'Day 5', min: 4, max: 5, unit: 'days' },
          { label: 'Day 6', min: 5, max: 6, unit: 'days' },
          { label: 'Day 7', min: 6, max: 7, unit: 'days' }
        ];
      case 'last_28_days':
        return [
          { label: '0-4 days', min: 0, max: 4, unit: 'days' },
          { label: '4-8 days', min: 4, max: 8, unit: 'days' },
          { label: '8-12 days', min: 8, max: 12, unit: 'days' },
          { label: '12-16 days', min: 12, max: 16, unit: 'days' },
          { label: '16-20 days', min: 16, max: 20, unit: 'days' },
          { label: '20-24 days', min: 20, max: 24, unit: 'days' },
          { label: '24-28 days', min: 24, max: 28, unit: 'days' }
        ];
      case 'last_30_days':
      case 'last_month':
      case 'last_1_month':
        return [
          { label: '0-4 days', min: 0, max: 4, unit: 'days' },
          { label: '4-8 days', min: 4, max: 8, unit: 'days' },
          { label: '8-12 days', min: 8, max: 12, unit: 'days' },
          { label: '12-17 days', min: 12, max: 17, unit: 'days' },
          { label: '17-21 days', min: 17, max: 21, unit: 'days' },
          { label: '21-26 days', min: 21, max: 26, unit: 'days' },
          { label: '26-30 days', min: 26, max: 30, unit: 'days' }
        ];
      case 'last_90_days':
        return [
          { label: '0-12 days', min: 0, max: 12, unit: 'days' },
          { label: '12-24 days', min: 12, max: 24, unit: 'days' },
          { label: '24-36 days', min: 24, max: 36, unit: 'days' },
          { label: '36-51 days', min: 36, max: 51, unit: 'days' },
          { label: '51-63 days', min: 51, max: 63, unit: 'days' },
          { label: '63-77 days', min: 63, max: 77, unit: 'days' },
          { label: '77-90 days', min: 77, max: 90, unit: 'days' }
        ];
      case 'custom':
        // For custom ranges, calculate 7 dynamic groups based on the range span
        if (customDateRange.startDate && customDateRange.endDate) {
          const start = new Date(customDateRange.startDate);
          const end = new Date(customDateRange.endDate);
          const diffMs = end - start;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          const segmentSize = diffDays / 7;
          
          return Array.from({ length: 7 }, (_, i) => {
            const minDays = Math.floor(segmentSize * i);
            const maxDays = Math.floor(segmentSize * (i + 1));
            return {
              label: `${minDays}-${maxDays} days`,
              min: minDays,
              max: maxDays,
              unit: 'days'
            };
          });
        }
        // Fallback to default 7 categories
        return [
          { label: 'Day 1', min: 0, max: 1, unit: 'days' },
          { label: 'Day 2', min: 1, max: 2, unit: 'days' },
          { label: 'Day 3', min: 2, max: 3, unit: 'days' },
          { label: 'Day 4', min: 3, max: 4, unit: 'days' },
          { label: 'Day 5', min: 4, max: 5, unit: 'days' },
          { label: 'Day 6', min: 5, max: 6, unit: 'days' },
          { label: 'Day 7', min: 6, max: 7, unit: 'days' }
        ];
      default:
        // Default grouping - 7 categories
        return [
          { label: 'Day 1', min: 0, max: 1, unit: 'days' },
          { label: 'Day 2', min: 1, max: 2, unit: 'days' },
          { label: 'Day 3', min: 2, max: 3, unit: 'days' },
          { label: 'Day 4', min: 3, max: 4, unit: 'days' },
          { label: 'Day 5', min: 4, max: 5, unit: 'days' },
          { label: 'Day 6', min: 5, max: 6, unit: 'days' },
          { label: 'Day 7', min: 6, max: 7, unit: 'days' }
        ];
    }
  };

  // Fetch data from API - separate calls for each payment state
  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        
        // Fetch data for each payment state separately with frequency parameter
        const [successData, processingData, failedData, pendingData, completedData, refundedData, cancelledData, expiredData, declinedData] = await Promise.all([
          fetchAgedMetrics('all', 'all', 'success', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'processing', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'failed', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'pending', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'completed', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'refunded', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'cancelled', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'expired', dateFilter, frequency),
          fetchAgedMetrics('all', 'all', 'declined', dateFilter, frequency)
        ]);
        
        // Aggregate all payment state data
        setApiData({
          success: successData,
          processing: processingData,
          failed: failedData,
          pending: pendingData,
          completed: completedData,
          refunded: refundedData,
          cancelled: cancelledData,
          expired: expiredData,
          declined: declinedData
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching overview data:', error);
        setLoading(false);
        setApiData(null);
      }
    };
    
    loadOverviewData();
  }, [dateFilter, frequency]);

  // Generate chart data based on API data and frequency
  const chartData = useMemo(() => {
    if (loading || !apiData) {
      return [];
    }
    
    // Get the count for each payment state by age group
    const getCountByLabel = (stateData, label) => {
      if (!stateData || !stateData.items) return 0;
      const item = stateData.items.find(i => i.label === label);
      return item ? parseInt(item.count) || 0 : 0;
    };
    
    // For Overview chart, we use different scaling factors to simulate different transaction types
    // (approvals, deposits, refunds, reverse approval)
    const volumeFactors = {
      approvals: 1.0,
      deposits: 1.2,
      refunds: 0.5,
      reverseApproval: 0.4
    };
    
    // Get all unique labels from success data (as reference)
    if (!apiData.success || !apiData.success.items) {
      return [];
    }
    
    // Convert API data to chart format with real payment state data
    // The labels from API will already be formatted based on frequency
    const data = apiData.success.items.map(item => {
      const label = item.label;
      
      // Get actual counts from database for each payment state
      const successCount = getCountByLabel(apiData.success, label);
      const processingCount = getCountByLabel(apiData.processing, label);
      const failedCount = getCountByLabel(apiData.failed, label);
      const pendingCount = getCountByLabel(apiData.pending, label);
      const completedCount = getCountByLabel(apiData.completed, label);
      const refundedCount = getCountByLabel(apiData.refunded, label);
      const cancelledCount = getCountByLabel(apiData.cancelled, label);
      const expiredCount = getCountByLabel(apiData.expired, label);
      const declinedCount = getCountByLabel(apiData.declined, label);
      
      // Group payment states for visualization (success-like vs processing vs failed-like)
      const successLikeCount = successCount + completedCount;
      const processingLikeCount = processingCount + pendingCount;
      const failedLikeCount = failedCount + cancelledCount + expiredCount + declinedCount + refundedCount;
      
      const createMetricData = (factor) => {
        return {
          success: Math.round(successLikeCount * factor),
          processing: Math.round(processingLikeCount * factor),
          failed: Math.round(failedLikeCount * factor),
          total: Math.round((successLikeCount + processingLikeCount + failedLikeCount) * factor)
        };
      };
      
      return {
        date: label,
        approvals: createMetricData(volumeFactors.approvals),
        deposits: createMetricData(volumeFactors.deposits),
        refunds: createMetricData(volumeFactors.refunds),
        reverseApproval: createMetricData(volumeFactors.reverseApproval)
      };
    });
    
    return data;
  }, [apiData, loading, frequency]);

  const maxValue = useMemo(() => {
    const max = Math.max(
      ...chartData.flatMap(d => [d.approvals.total, d.deposits.total, d.refunds.total, d.reverseApproval.total]),
      1 // Minimum value to avoid division by zero
    );
    // Round up to next multiple of 10 for cleaner scale
    return Math.ceil(max / 10) * 10;
  }, [chartData]);

  // Helper function to adjust color opacity based on payment state
  const getColorWithOpacity = (hexColor, opacity) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Helper function to get color for a specific metric and payment state
  const getMetricStateColor = (metricKey, paymentStateKey) => {
    const metric = metrics.find(m => m.key === metricKey);
    const state = paymentStates.find(s => s.key === paymentStateKey);
    
    if (!metric || !state) return '#000000';
    return getColorWithOpacity(metric.color, state.shade);
  };

  // Handle bar click to navigate to respective detail page
  const handleApprovalClick = (data) => {
    if (onNavigate) {
      onNavigate('approvals');
    }
  };

  const handleDepositClick = (data) => {
    if (onNavigate) {
      onNavigate('deposit');
    }
  };

  const handleRefundClick = (data) => {
    console.log('Refunds detail page not yet implemented');
  };

  const handleReverseApprovalClick = (data) => {
    console.log('Reverse Approval detail page not yet implemented');
  };

  return (
    <div className="overview-section">
      <div className="overview-header">
        <div className="overview-title">
          <BarChart3 size={24} />
          <h2>Overview</h2>
          {!isCollapsed && onNavigate && (
            <span style={{ 
              fontSize: '12px', 
              color: '#667eea', 
              fontStyle: 'italic', 
              marginLeft: '12px',
              alignSelf: 'center'
            }}>
              (Click bars to view details)
            </span>
          )}
          {!isCollapsed && (
            <>
              <DateFilter 
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                customDateRange={customDateRange}
                setCustomDateRange={setCustomDateRange}
                idPrefix="overview-chart"
              />
              <div className="frequency-filter">
                <label htmlFor="overview-frequency-select" style={{ fontSize: '14px', fontWeight: '500', marginRight: '8px' }}>
                  Frequency:
                </label>
                <select
                  id="overview-frequency-select"
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
            </>
          )}
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="overview-content">
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#667eea', fontSize: '16px' }}>
              <div style={{ marginBottom: '10px' }}>Loading overview data...</div>
              <div className="loading-spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #f3f4f6', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#9ca3af', fontSize: '16px' }}>
              No data available for the selected period
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={chartData.map(data => ({
                name: data.date,
                'Approvals-Success': data.approvals.success,
                'Approvals-Processing': data.approvals.processing,
                'Approvals-Failed': data.approvals.failed,
                'Deposits-Success': data.deposits.success,
                'Deposits-Processing': data.deposits.processing,
                'Deposits-Failed': data.deposits.failed,
                'Refunds-Success': data.refunds.success,
                'Refunds-Processing': data.refunds.processing,
                'Refunds-Failed': data.refunds.failed,
                'Reverse-Success': data.reverseApproval.success,
                'Reverse-Processing': data.reverseApproval.processing,
                'Reverse-Failed': data.reverseApproval.failed
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                label={{ value: 'Time Period', position: 'insideBottom', offset: 0 }}
                tick={{ fontSize: 12 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '8px',
                  maxWidth: '100%'
                }}
                iconType="rect"
                layout="horizontal"
                align="center"
              />
              
              {/* Approvals bars - using configured colors and shades */}
              <Bar dataKey="Approvals-Success" stackId="approvals" fill={getMetricStateColor('approvals', 'success')} name="Approvals - Success" cursor="pointer" onClick={handleApprovalClick} />
              <Bar dataKey="Approvals-Processing" stackId="approvals" fill={getMetricStateColor('approvals', 'processing')} name="Approvals - Processing" cursor="pointer" onClick={handleApprovalClick} />
              <Bar dataKey="Approvals-Failed" stackId="approvals" fill={getMetricStateColor('approvals', 'failed')} name="Approvals - Failed" cursor="pointer" onClick={handleApprovalClick} />
              
              {/* Deposits bars - using configured colors and shades */}
              <Bar dataKey="Deposits-Success" stackId="deposits" fill={getMetricStateColor('deposits', 'success')} name="Deposits - Success" cursor="pointer" onClick={handleDepositClick} />
              <Bar dataKey="Deposits-Processing" stackId="deposits" fill={getMetricStateColor('deposits', 'processing')} name="Deposits - Processing" cursor="pointer" onClick={handleDepositClick} />
              <Bar dataKey="Deposits-Failed" stackId="deposits" fill={getMetricStateColor('deposits', 'failed')} name="Deposits - Failed" cursor="pointer" onClick={handleDepositClick} />
              
              {/* Refunds bars - using configured colors and shades */}
              <Bar dataKey="Refunds-Success" stackId="refunds" fill={getMetricStateColor('refunds', 'success')} name="Refunds - Success" cursor="pointer" onClick={handleRefundClick} />
              <Bar dataKey="Refunds-Processing" stackId="refunds" fill={getMetricStateColor('refunds', 'processing')} name="Refunds - Processing" cursor="pointer" onClick={handleRefundClick} />
              <Bar dataKey="Refunds-Failed" stackId="refunds" fill={getMetricStateColor('refunds', 'failed')} name="Refunds - Failed" cursor="pointer" onClick={handleRefundClick} />
              
              {/* Reverse Approval bars - using configured colors and shades */}
              <Bar dataKey="Reverse-Success" stackId="reverse" fill={getMetricStateColor('reverseApproval', 'success')} name="Reverse - Success" cursor="pointer" onClick={handleReverseApprovalClick} />
              <Bar dataKey="Reverse-Processing" stackId="reverse" fill={getMetricStateColor('reverseApproval', 'processing')} name="Reverse - Processing" cursor="pointer" onClick={handleReverseApprovalClick} />
              <Bar dataKey="Reverse-Failed" stackId="reverse" fill={getMetricStateColor('reverseApproval', 'failed')} name="Reverse - Failed" cursor="pointer" onClick={handleReverseApprovalClick} />
            </BarChart>
          </ResponsiveContainer>
          )}
      </div>
      )}
    </div>
  );
}

export default OverviewChart;

