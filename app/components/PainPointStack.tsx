'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PainPoint } from '../types';
import PainPointCard from './PainPointCard';

interface PainPointStackProps {
  mainPainPoint: PainPoint;
  subPoints: PainPoint[];
  count: number;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDelete: (id: string) => void;
}

export default function PainPointStack({
  mainPainPoint,
  subPoints,
  count,
  onDragStart,
  onDragEnd,
  onDelete,
}: PainPointStackProps) {
  const [isFanned, setIsFanned] = useState(false);
  const [fanDirection, setFanDirection] = useState<'left' | 'right'>('right');
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stackRef.current && !stackRef.current.contains(event.target as Node)) {
        setIsFanned(false);
      }
    };

    if (isFanned) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isFanned]);

  const toggleFan = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isFanned && stackRef.current) {
      const rect = stackRef.current.getBoundingClientRect();
      const viewportMidpoint = window.innerWidth / 2;
      const stackMidpoint = rect.left + rect.width / 2;
      
      setFanDirection(stackMidpoint > viewportMidpoint ? 'left' : 'right');
    }
    
    setIsFanned(!isFanned);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isFanned && count > 1) {
      toggleFan(e);
    }
  };

  if (count <= 1) {
    return (
      <PainPointCard
        painPoint={mainPainPoint}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div
      ref={stackRef}
      className={`pain-point-with-count ${isFanned ? `fanned-out fan-${fanDirection}` : ''}`}
      onClick={handleCardClick}
    >
      <PainPointCard
        painPoint={mainPainPoint}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDelete={onDelete}
      />
      {subPoints.map((subPoint, index) => (
        <PainPointCard
          key={`${subPoint.id}-sub-${index}`}
          painPoint={subPoint}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDelete={onDelete}
        />
      ))}
      <div className="stack-count" onClick={toggleFan}>
        {count}
      </div>
    </div>
  );
}