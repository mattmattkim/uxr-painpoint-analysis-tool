'use client';

import React, { useState, useEffect } from 'react';
import { Persona } from '../types';
import { PERSONA_COLORS, getNextAvailableColor } from '../utils/personas';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (persona: Persona) => void;
  persona?: Persona | null;
  existingPersonas?: Persona[];
}

export default function PersonaModal({ isOpen, onClose, onSubmit, persona, existingPersonas = [] }: PersonaModalProps) {
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
  const [formData, setFormData] = useState<Partial<Persona>>({
    name: '',
    role: '',
    description: '',
    goals: [''],
    demographics: {
      age: '',
      experience: '',
      department: '',
      companySize: ''
    },
    avatar: {
      color: PERSONA_COLORS[0],
      initials: ''
    }
  });

  useEffect(() => {
    if (persona) {
      setFormData({
        ...persona,
        goals: persona.goals?.length ? persona.goals : ['']
      });
    } else {
      setFormData({
        name: '',
        role: '',
        description: '',
        goals: [''],
        demographics: {
          age: '',
          experience: '',
          department: '',
          companySize: ''
        },
        avatar: {
          color: getNextAvailableColor(existingPersonas),
          initials: ''
        }
      });
    }
  }, [persona, isOpen, existingPersonas]);

  useEffect(() => {
    if (formData.name) {
      const names = formData.name.split(' ');
      const initials = names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : formData.name.substring(0, 2).toUpperCase();
      
      setFormData(prev => ({
        ...prev,
        avatar: {
          ...prev.avatar!,
          initials
        }
      }));
    }
  }, [formData.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.role) {
      // Generate UUID v4 for new personas
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      
      const personaData: Persona = {
        id: persona?.id || generateUUID(),
        name: formData.name,
        role: formData.role,
        description: formData.description,
        goals: formData.goals?.filter(g => g.trim() !== ''),
        demographics: formData.demographics,
        avatar: formData.avatar,
        painPoints: persona?.painPoints || []
      };
      onSubmit(personaData);
      onClose();
    }
  };

  const addGoal = () => {
    setFormData(prev => ({
      ...prev,
      goals: [...(prev.goals || []), '']
    }));
  };

  const updateGoal = (index: number, value: string) => {
    const newGoals = [...(formData.goals || [])];
    newGoals[index] = value;
    setFormData(prev => ({
      ...prev,
      goals: newGoals
    }));
  };

  const removeGoal = (index: number) => {
    const newGoals = formData.goals?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({
      ...prev,
      goals: newGoals.length ? newGoals : ['']
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={onClose}>
      <div className="modal-content persona-modal" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2 className="text-2xl font-semibold mb-4">
          {persona ? 'Edit Persona' : 'Add Persona'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                placeholder="e.g., Sarah Johnson"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Role *</label>
              <input
                type="text"
                placeholder="e.g., Project Manager"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Brief description of this persona's background and context"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Avatar Color</label>
            <div className="color-picker">
              {PERSONA_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.avatar?.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    avatar: { ...prev.avatar!, color }
                  }))}
                />
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Demographics</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Age Range</label>
                <input
                  type="text"
                  placeholder="e.g., 35-45"
                  value={formData.demographics?.age || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics!, age: e.target.value }
                  }))}
                />
              </div>
              
              <div className="form-group">
                <label>Experience</label>
                <input
                  type="text"
                  placeholder="e.g., 10+ years"
                  value={formData.demographics?.experience || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics!, experience: e.target.value }
                  }))}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  placeholder="e.g., Operations"
                  value={formData.demographics?.department || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics!, department: e.target.value }
                  }))}
                />
              </div>
              
              <div className="form-group">
                <label>Company Size</label>
                <input
                  type="text"
                  placeholder="e.g., 500-1000 employees"
                  value={formData.demographics?.companySize || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics!, companySize: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Goals & Objectives</h3>
            {formData.goals?.map((goal, index) => (
              <div key={index} className="goal-input">
                <input
                  type="text"
                  placeholder="Enter a goal or objective"
                  value={goal}
                  onChange={(e) => updateGoal(index, e.target.value)}
                />
                {formData.goals!.length > 1 && (
                  <button
                    type="button"
                    className="remove-goal-btn"
                    onClick={() => removeGoal(index)}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary add-goal-btn" onClick={addGoal}>
              + Add Goal
            </button>
          </div>

          <div className="flex gap-2 mt-5">
            <button type="submit" className="btn">
              {persona ? 'Update Persona' : 'Add Persona'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}