'use client';

import React from 'react';

interface SeverityBarsProps {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export default function SeverityBars({ high, medium, low, total }: SeverityBarsProps) {
  const bars = [
    { label: 'High', value: high, className: 'high', color: 'blue' },
    { label: 'Medium', value: medium, className: 'medium', color: 'green' },
    { label: 'Low', value: low, className: 'low', color: 'orange' }
  ];

  return (
    <div className="persona-severity-bars severity-bars">
      {bars.map((bar) => (
        <div key={bar.label} className="severity-bar">
          <span className="severity-label">{bar.label}</span>
          <div className="bar-container">
            <div 
              className={`bar ${bar.className}`}
              style={{ width: total > 0 && bar.value > 0 ? `${(bar.value / total) * 100}%` : '0%' }}
            />
            <span className="bar-value">{bar.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}