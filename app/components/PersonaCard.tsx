'use client';

import React from 'react';
import { Persona } from '../types';

interface PersonaCardProps {
  persona: Persona;
  painPointCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PersonaCard({ 
  persona, 
  painPointCount, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: PersonaCardProps) {
  return (
    <div 
      className={`persona-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="persona-header">
        <div 
          className="persona-avatar"
          style={{ backgroundColor: persona.avatar?.color || '#3b82f6' }}
        >
          {persona.avatar?.initials || persona.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="persona-info">
          <h3>{persona.name}</h3>
          <p className="persona-role">{persona.role}</p>
        </div>
        <div className="persona-actions">
          <button 
            className="persona-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit persona"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"/>
            </svg>
          </button>
          <button 
            className="persona-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete persona"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      </div>
      
      {persona.description && (
        <p className="persona-description">{persona.description}</p>
      )}
      
      <div className="persona-stats">
        <div className="stat-item">
          <span className="stat-value">{painPointCount}</span>
          <span className="stat-label">Pain Points</span>
        </div>
        {persona.demographics?.experience && (
          <div className="stat-item">
            <span className="stat-value">{persona.demographics.experience}</span>
            <span className="stat-label">Experience</span>
          </div>
        )}
      </div>
      
      {persona.goals && persona.goals.length > 0 && (
        <div className="persona-goals">
          <h4>Goals</h4>
          <ul>
            {persona.goals.slice(0, 3).map((goal, index) => (
              <li key={index}>{goal}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}