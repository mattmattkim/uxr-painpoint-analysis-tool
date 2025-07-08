'use client';

import React from 'react';
import { PainPoint, Persona } from '../types';
import PersonaBadge from './PersonaBadge';

interface PainPointCardProps {
  painPoint: PainPoint;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDelete: (id: string) => void;
  persona?: Persona;
}

export default function PainPointCard({ painPoint, onDragStart, onDragEnd, onDelete, persona }: PainPointCardProps) {
  return (
    <div
      className={`pain-point ${persona ? 'has-persona' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-pain-point-id={painPoint.id}
      data-title={painPoint.title.toLowerCase()}
      style={persona ? { borderLeftColor: persona.avatar?.color } : undefined}
    >
      <div className="pain-point-header">
        <span className={`severity ${painPoint.severity}`}>{painPoint.severity}</span>
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (painPoint.id) {
              onDelete(painPoint.id);
            }
          }}
          aria-label="Delete pain point"
        >
          ×
        </button>
      </div>
      {persona && (
        <div className="pain-point-persona">
          <PersonaBadge persona={persona} size="small" showName={true} />
        </div>
      )}
      <div className="pain-point-text"><strong>{painPoint.title}</strong></div>
      {painPoint.details && (
        <div className="pain-point-text text-xs text-gray-500">
          {painPoint.details}
        </div>
      )}
      {painPoint.source && (
        <div className="pain-point-source">Source: {painPoint.source}</div>
      )}
    </div>
  );
}