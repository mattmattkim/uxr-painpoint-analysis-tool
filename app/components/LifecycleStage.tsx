'use client';

import React, { useState, useRef } from 'react';
import { StageInfo, PainPoint, Stage } from '../types';
import PainPointCard from './PainPointCard';
import PainPointStack from './PainPointStack';

interface LifecycleStageProps {
  stage: StageInfo;
  painPoints: PainPoint[];
  groupedPainPoints?: {
    painPoint: PainPoint;
    count: number;
    subPoints?: PainPoint[];
  }[];
  onAddPainPoint: (stage: Stage) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: Stage) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  draggedElement: HTMLElement | null;
  setDraggedElement: (element: HTMLElement | null) => void;
  isGrouped?: boolean;
  onDeletePainPoint: (id: string, stage: Stage) => void;
}

export default function LifecycleStage({
  stage,
  painPoints,
  groupedPainPoints,
  onAddPainPoint,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  draggedElement,
  setDraggedElement,
  isGrouped = false,
  onDeletePainPoint,
}: LifecycleStageProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    setDraggedElement(target);
    target.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    setDraggedElement(null);
  };

  const getHeatClass = () => {
    const count = isGrouped 
      ? groupedPainPoints?.reduce((sum, group) => sum + group.count, 0) || 0
      : painPoints?.length || 0;
    
    if (count >= 10) return 'heat-5';
    if (count >= 7) return 'heat-4';
    if (count >= 5) return 'heat-3';
    if (count >= 3) return 'heat-2';
    if (count >= 1) return 'heat-1';
    return '';
  };

  return (
    <div
      ref={dropZoneRef}
      className={`lifecycle-stage drop-zone ${getHeatClass()}`}
      data-stage={stage.id}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <div className="stage-header">
        <div className="stage-number">{stage.number}</div>
        <div className="stage-title">{stage.title}</div>
        <div className="stage-subtitle">{stage.subtitle}</div>
      </div>
      <div className="pain-points" id={`${stage.id}-points`}>
        {isGrouped && groupedPainPoints ? (
          groupedPainPoints.map((group, index) => (
            <PainPointStack
              key={`${group.painPoint.id}-${index}`}
              mainPainPoint={group.painPoint}
              subPoints={group.subPoints || []}
              count={group.count}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        ) : (
          painPoints.map((painPoint) => (
            <PainPointCard
              key={painPoint.id}
              painPoint={painPoint}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDelete={(id) => onDeletePainPoint(id, stage.id)}
            />
          ))
        )}
      </div>
      <div
        className="add-pain-point"
        onClick={() => onAddPainPoint(stage.id)}
      >
        + Add pain point
      </div>
    </div>
  );
}