'use client';

import React from 'react';
import { Persona } from '../types';

interface PersonaBadgeProps {
  persona: Persona | undefined;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  className?: string;
}

export default function PersonaBadge({ 
  persona, 
  size = 'small', 
  showName = true,
  className = '' 
}: PersonaBadgeProps) {
  if (!persona) return null;

  const sizeClasses = {
    small: 'persona-badge-small',
    medium: 'persona-badge-medium',
    large: 'persona-badge-large'
  };

  return (
    <div className={`persona-badge ${sizeClasses[size]} ${className}`}>
      <div 
        className="persona-badge-avatar"
        style={{ backgroundColor: persona.avatar?.color || '#3b82f6' }}
        title={`${persona.name} - ${persona.role}`}
      >
        {persona.avatar?.initials || persona.name.substring(0, 2).toUpperCase()}
      </div>
      {showName && (
        <span className="persona-badge-name">{persona.name}</span>
      )}
    </div>
  );
}