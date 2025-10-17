import React, { useState } from 'react';
import { Home, FileText, DollarSign, RefreshCw, RotateCcw, Bell, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import './Sidebar.css';

function Sidebar({ activeView, setActiveView, onCollapse }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onCollapse) {
      onCollapse(newState);
    }
  };
  
  const menuItems = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'approvals', label: 'Approvals Order Details', icon: <FileText size={20} /> },
    { id: 'deposit', label: 'Deposit Order Details', icon: <DollarSign size={20} /> },
    { id: 'refunds', label: 'Refund Order Details', icon: <RefreshCw size={20} /> },
    { id: 'reverseApproval', label: 'Reverse Approval Order Details', icon: <RotateCcw size={20} /> },
    { id: 'dataAlerts', label: 'Data Alerts', icon: <Bell size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="chewy-logo">
          <svg viewBox="0 0 100 100" className="chewy-icon">
            <circle cx="50" cy="50" r="45" fill="#667eea" />
            <path
              d="M 30 40 Q 35 35, 40 40 T 50 40 T 60 40 T 70 40"
              stroke="white"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="35" cy="35" r="4" fill="white" />
            <circle cx="65" cy="35" r="4" fill="white" />
            <path
              d="M 30 55 Q 50 70, 70 55"
              stroke="white"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          {!isCollapsed && <span className="chewy-text">Chewy</span>}
        </div>
        <button 
          className="collapse-toggle"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-menu-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
            title={isCollapsed ? item.label : ''}
          >
            <span className="menu-icon">{item.icon}</span>
            {!isCollapsed && <span className="menu-label">{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;

