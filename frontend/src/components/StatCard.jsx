import React from 'react';
import './StatCard.css';

function StatCard({ title, value, subtext, color, icon }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        <div className="stat-card-icon">{icon}</div>
      </div>
      <div className={`stat-value ${color}`}>{value}</div>
      <div className="stat-subtext">{subtext}</div>
    </div>
  );
}

export default StatCard;


