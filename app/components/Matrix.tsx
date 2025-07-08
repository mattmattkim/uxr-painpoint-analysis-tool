import React from 'react';

interface MatrixProps {
  items: Array<{
    x: number; // 1-5 scale
    y: number; // 1-5 scale
    color: string;
    label: string | number;
    title?: string;
  }>;
  quadrants: {
    q1: { label: string; color?: string };
    q2: { label: string; color?: string };
    q3: { label: string; color?: string };
    q4: { label: string; color?: string };
  };
  axes: {
    x: { low: string; high: string };
    y: { low: string; high: string };
  };
  className?: string;
}

export default function Matrix({ items, quadrants, axes, className = '' }: MatrixProps) {
  return (
    <div className={`matrix-grid ${className}`}>
      <div className="matrix-axes">
        <div className="y-axis">
          <span className="axis-label">{axes.y.high}</span>
          <div className="axis-line"></div>
          <span className="axis-label">{axes.y.low}</span>
        </div>
        <div className="x-axis">
          <span className="axis-label">{axes.x.low}</span>
          <div className="axis-line"></div>
          <span className="axis-label">{axes.x.high}</span>
        </div>
      </div>
      <div className="matrix-quadrants">
        <div className="quadrant q1" style={{ backgroundColor: quadrants.q1.color }}>
          <span className="quadrant-label">{quadrants.q1.label}</span>
        </div>
        <div className="quadrant q2" style={{ backgroundColor: quadrants.q2.color }}>
          <span className="quadrant-label">{quadrants.q2.label}</span>
        </div>
        <div className="quadrant q3" style={{ backgroundColor: quadrants.q3.color }}>
          <span className="quadrant-label">{quadrants.q3.label}</span>
        </div>
        <div className="quadrant q4" style={{ backgroundColor: quadrants.q4.color }}>
          <span className="quadrant-label">{quadrants.q4.label}</span>
        </div>
        {items.map((item, idx) => (
          <div 
            key={idx}
            className="matrix-item"
            style={{
              left: `${((item.x - 1) / 4) * 100}%`,
              top: `${((5 - item.y) / 4) * 100}%`,
              backgroundColor: item.color
            }}
            title={item.title}
          >
            <span className="matrix-item-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}