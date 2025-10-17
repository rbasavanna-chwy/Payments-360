import React, { useState } from 'react';
import { Search, Settings } from 'lucide-react';
import './Header.css';

function Header({ searchQuery, setSearchQuery, onSearchOrderId }) {
  const [showSettings, setShowSettings] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() && onSearchOrderId) {
      onSearchOrderId(searchQuery);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Payments 360</h1>
        
        <div className="search-section">
          <label htmlFor="orderSearch" className="search-label">Order id</label>
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              id="orderSearch"
              type="text"
              className="search-input"
              placeholder="Search by Order ID... (Press Enter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="settings-button"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings size={24} />
          </button>
          
          {showSettings && (
            <div className="settings-dropdown">
              <div className="settings-header">
                <h3>Settings</h3>
                <button 
                  className="close-settings"
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </button>
              </div>
              <div className="settings-content">
                <div className="settings-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span>Auto-refresh data</span>
                  </label>
                </div>
                <div className="settings-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    <span>Enable notifications</span>
                  </label>
                </div>
                <div className="settings-item">
                  <label>
                    <input type="checkbox" />
                    <span>Dark mode</span>
                  </label>
                </div>
                <div className="settings-divider"></div>
                <div className="settings-item">
                  <button className="settings-link">Preferences</button>
                </div>
                <div className="settings-item">
                  <button className="settings-link">Export Data</button>
                </div>
                <div className="settings-item">
                  <button className="settings-link">Help & Support</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showSettings && (
        <div 
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}

export default Header;

