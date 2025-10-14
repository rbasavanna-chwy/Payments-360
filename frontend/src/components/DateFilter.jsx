import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, X } from 'lucide-react';
import './DateFilter.css';

function DateFilter({ dateFilter, setDateFilter, customDateRange, setCustomDateRange }) {
  const [showCustomPopup, setShowCustomPopup] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ startDate: '', endDate: '' });

  const dateOptions = [
    { value: 'last_15_min', label: 'Last 15 minutes' },
    { value: 'last_60_min', label: 'Last 60 minutes' },
    { value: 'last_4_hours', label: 'Last 4 hours' },
    { value: 'last_24_hours', label: 'Last 24 hours' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_28_days', label: 'Last 28 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_week', label: 'Last week' },
    { value: 'last_month', label: 'Last 1 month' },
    { value: 'custom', label: 'Custom Date Range' }
  ];

  const handleDateFilterChange = (e) => {
    const value = e.target.value;
    
    if (value === 'custom') {
      // Open the popup for custom date range
      setTempDateRange(customDateRange);
      setShowCustomPopup(true);
    } else {
      setDateFilter(value);
      // Reset custom date range when switching to predefined options
      setCustomDateRange({ startDate: '', endDate: '' });
    }
  };

  const handleTempDateChange = (field, value) => {
    setTempDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyCustomRange = () => {
    setCustomDateRange(tempDateRange);
    setDateFilter('custom');
    setShowCustomPopup(false);
  };

  const handleCancelCustomRange = () => {
    setShowCustomPopup(false);
    setTempDateRange({ startDate: '', endDate: '' });
  };

  return (
    <>
      <div className="date-filter-container">
        <label htmlFor="dateFilter" className="date-filter-label">
          <Calendar size={16} />
          Date Period
        </label>
        <select
          id="dateFilter"
          className="date-filter-select"
          value={dateFilter}
          onChange={handleDateFilterChange}
        >
          <option value="">All Time</option>
          {dateOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {dateFilter === 'custom' && customDateRange.startDate && customDateRange.endDate && (
          <div className="custom-range-display">
            <Calendar size={14} />
            <span>
              {new Date(customDateRange.startDate).toLocaleString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })} - {new Date(customDateRange.endDate).toLocaleString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>
        )}
      </div>

      {/* Custom Date Range Popup */}
      {showCustomPopup && ReactDOM.createPortal(
        <>
          <div 
            className="custom-date-popup-overlay"
            onClick={handleCancelCustomRange}
          />
          <div className="custom-date-popup">
            <div className="custom-date-popup-header">
              <div className="popup-title">
                <Calendar size={18} />
                <h3>Custom Date Range</h3>
              </div>
              <button 
                className="popup-close-btn"
                onClick={handleCancelCustomRange}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="custom-date-popup-content">
              <div className="date-input-group">
                <label htmlFor="popupStartDate">From Date & Time:</label>
                <input
                  id="popupStartDate"
                  type="datetime-local"
                  className="date-input"
                  value={tempDateRange.startDate}
                  onChange={(e) => handleTempDateChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="date-input-group">
                <label htmlFor="popupEndDate">To Date & Time:</label>
                <input
                  id="popupEndDate"
                  type="datetime-local"
                  className="date-input"
                  value={tempDateRange.endDate}
                  onChange={(e) => handleTempDateChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="custom-date-popup-footer">
              <button 
                className="popup-btn popup-btn-cancel"
                onClick={handleCancelCustomRange}
              >
                Cancel
              </button>
              <button 
                className="popup-btn popup-btn-apply"
                onClick={handleApplyCustomRange}
                disabled={!tempDateRange.startDate || !tempDateRange.endDate}
              >
                Apply
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

export default DateFilter;

