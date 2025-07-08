'use client';

import React, { useState, useEffect } from 'react';
import { PainPoint, Stage, Persona } from '../types';
import lifecycleConfig from '../lifecycle-stages.json';

interface PainPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (painPoint: PainPoint) => void;
  initialStage?: Stage;
  personas?: Persona[];
}

const stages: { value: Stage; label: string }[] = lifecycleConfig.stages.map(stage => ({
  value: stage.id as Stage,
  label: stage.title
}));

export default function PainPointModal({ isOpen, onClose, onSubmit, initialStage, personas = [] }: PainPointModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const [formData, setFormData] = useState<PainPoint>({
    title: '',
    details: '',
    severity: 'medium',
    source: '',
    stage: initialStage || 'requirements',
    personaId: '',
  });

  useEffect(() => {
    if (initialStage) {
      setFormData(prev => ({ ...prev, stage: initialStage }));
    }
  }, [initialStage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.severity && formData.stage) {
      onSubmit({
        ...formData,
        id: Date.now().toString() + Math.random().toString(),
      });
      setFormData({
        title: '',
        details: '',
        severity: 'medium',
        source: '',
        stage: initialStage || 'requirements',
        personaId: '',
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2 className="text-2xl font-semibold mb-4">Add Pain Point</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Brief description of the pain point"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Detailed description or quote from interview"
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          />
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'high' | 'medium' | 'low' })}
            required
          >
            <option value="">Select severity level</option>
            <option value="high">High - Critical blocker</option>
            <option value="medium">Medium - Noticeable friction</option>
            <option value="low">Low - Minor annoyance</option>
          </select>
          <input
            type="text"
            placeholder="Source (e.g., Company A - Project Manager)"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          />
          <select
            value={formData.personaId}
            onChange={(e) => setFormData({ ...formData, personaId: e.target.value })}
          >
            <option value="">Select persona (optional)</option>
            {personas.map(persona => (
              <option key={persona.id} value={persona.id}>
                {persona.name} - {persona.role}
              </option>
            ))}
          </select>
          <select
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value as Stage })}
          >
            <option value="">Select stage</option>
            {stages.map(stage => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-5">
            <button type="submit" className="btn">Add Pain Point</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}