'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PainPoint, Stage, StageInfo, PainPointAnalysis, Persona } from './types';
import PainPointModal from './components/PainPointModal';
import LifecycleStage from './components/LifecycleStage';
import AnalysisModal from './components/AnalysisModal';
import PersonaCard from './components/PersonaCard';
import PersonaModal from './components/PersonaModal';
import lifecycleConfig from './lifecycle-stages.json';
import { mergePersonas, mergePersonasWithMapping, manualMergePersonas, ensureUniquePersonaIds, ensurePersonaColors } from './utils/personas';

const stages: StageInfo[] = lifecycleConfig.stages as StageInfo[];

const STORAGE_KEY_PAIN_POINTS = 'uxr-pain-points';
const STORAGE_KEY_ANALYSIS = 'uxr-analysis';
const STORAGE_KEY_MODEL = 'uxr-selected-model';
const STORAGE_KEY_ANALYSIS_HASH = 'uxr-analysis-hash';
const STORAGE_KEY_PERSONAS = 'uxr-personas';

export default function Home() {
  // Initialize with all stages from lifecycle config
  const initialPainPointsByStage = stages.reduce((acc, stage) => {
    acc[stage.id as Stage] = [];
    return acc;
  }, {} as Record<Stage, PainPoint[]>);

  const [painPointsByStage, setPainPointsByStage] = useState<Record<Stage, PainPoint[]>>(initialPainPointsByStage);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState<Stage | undefined>();
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const draggedPainPoint = useRef<PainPoint | null>(null);
  
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Persona | null>(null);
  
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<PainPointAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [processingTranscripts, setProcessingTranscripts] = useState<Array<{id: string; name: string}>>([]);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4-turbo-preview');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [lastAnalysisHash, setLastAnalysisHash] = useState<string | null>(null);

  // Generate a hash of pain points data to detect changes
  const generatePainPointsHash = (data: Record<Stage, PainPoint[]>): string => {
    const allPainPoints: PainPoint[] = [];
    Object.values(data).forEach(stagePainPoints => {
      allPainPoints.push(...stagePainPoints);
    });
    
    // Sort by ID to ensure consistent hash
    const sortedPainPoints = allPainPoints.sort((a, b) => 
      (a.id || '').localeCompare(b.id || '')
    );
    
    // Create a simple hash based on IDs, stages, severity, and titles
    const hashString = sortedPainPoints
      .map(pp => `${pp.id}|${pp.stage}|${pp.severity}|${pp.title}`)
      .join('||');
    
    return hashString;
  };

  // Check if analysis needs to be rerun
  const needsNewAnalysis = (): boolean => {
    const currentHash = generatePainPointsHash(painPointsByStage);
    return currentHash !== lastAnalysisHash || !analysis;
  };

  // Save to localStorage
  const saveToLocalStorage = (data: Record<Stage, PainPoint[]>) => {
    try {
      localStorage.setItem(STORAGE_KEY_PAIN_POINTS, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  const saveAnalysisToLocalStorage = (analysisData: PainPointAnalysis | null) => {
    try {
      if (analysisData) {
        localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(analysisData));
      } else {
        localStorage.removeItem(STORAGE_KEY_ANALYSIS);
      }
    } catch (error) {
      console.error('Failed to save analysis to localStorage:', error);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPainPoints = localStorage.getItem(STORAGE_KEY_PAIN_POINTS);
      if (savedPainPoints) {
        const parsed = JSON.parse(savedPainPoints);
        setPainPointsByStage(parsed);
      }

      const savedPersonas = localStorage.getItem(STORAGE_KEY_PERSONAS);
      if (savedPersonas) {
        const parsedPersonas = JSON.parse(savedPersonas);
        setPersonas(ensurePersonaColors(ensureUniquePersonaIds(parsedPersonas)));
      }

      const savedAnalysis = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      if (savedAnalysis) {
        const parsedAnalysis = JSON.parse(savedAnalysis);
        setAnalysis(parsedAnalysis);
      }

      const savedHash = localStorage.getItem(STORAGE_KEY_ANALYSIS_HASH);
      if (savedHash) {
        setLastAnalysisHash(savedHash);
      }

      const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  // Save to localStorage whenever pain points change
  useEffect(() => {
    if (isLoaded) {
      saveToLocalStorage(painPointsByStage);
    }
  }, [painPointsByStage, isLoaded]);

  // Save analysis whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveAnalysisToLocalStorage(analysis);
    }
  }, [analysis, isLoaded]);

  // Save personas whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
      } catch (error) {
        console.error('Failed to save personas to localStorage:', error);
      }
    }
  }, [personas, isLoaded]);

  // Save selected model whenever it changes
  useEffect(() => {
    if (isLoaded && selectedModel) {
      try {
        localStorage.setItem(STORAGE_KEY_MODEL, selectedModel);
      } catch (error) {
        console.error('Failed to save model to localStorage:', error);
      }
    }
  }, [selectedModel, isLoaded]);

  const handleFileUpload = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    setProcessingTranscripts(prev => [...prev, {id: fileId, name: file.name}]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);
      formData.append('existingPersonas', JSON.stringify(personas));

      const response = await fetch('/api/extract-painpoints', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process transcript');
      }

      const { painPoints, personas: extractedPersonas } = await response.json();
      
      // Debug logging
      console.log('Extracted from API:', {
        personas: extractedPersonas?.map((p: Persona) => ({ id: p.id, name: p.name })),
        painPoints: painPoints?.map((pp: PainPoint) => ({ title: pp.title, personaId: pp.personaId }))
      });
      
      // Merge personas with existing ones and track ID changes
      let finalPersonas = personas;
      let personaIdMap: Record<string, string> = {};
      
      if (extractedPersonas && extractedPersonas.length > 0) {
        // Use the new mergePersonasWithMapping function to get ID mappings
        const mergeResult = mergePersonasWithMapping(personas, extractedPersonas);
        finalPersonas = ensureUniquePersonaIds(mergeResult.personas);
        personaIdMap = mergeResult.idMapping;
        
        setPersonas(finalPersonas);
      }
      
      // Add source information with filename and update personaIds
      const enhancedPainPoints = painPoints.map((pp: PainPoint) => ({
        ...pp,
        source: `${pp.source} (${file.name})`,
        // Update personaId if it was remapped during merge
        personaId: pp.personaId ? (personaIdMap[pp.personaId] || pp.personaId) : undefined
      }));
      
      // Debug logging after mapping
      console.log('After persona ID mapping:', {
        personaIdMap,
        finalPersonas: finalPersonas.map(p => ({ id: p.id, name: p.name })),
        enhancedPainPoints: enhancedPainPoints.map(pp => ({ title: pp.title, personaId: pp.personaId }))
      });
      
      // Merge new pain points with existing ones
      setPainPointsByStage((prevState) => {
        const updatedState = { ...prevState };
        
        enhancedPainPoints.forEach((painPoint: PainPoint) => {
          const stage = painPoint.stage as Stage;
          if (updatedState[stage]) {
            updatedState[stage] = [...updatedState[stage], painPoint];
          }
        });
        
        return updatedState;
      });
      setIsGrouped(false);
      // Invalidate cached analysis when new pain points are added
      setLastAnalysisHash(null);
      localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
    } catch (error) {
      console.error('Error uploading transcript:', error);
      alert('Failed to process transcript. Please make sure you have configured your OpenAI API key.');
    } finally {
      setProcessingTranscripts(prev => prev.filter(t => t.id !== fileId));
    }
  };


  const clearAll = () => {
    if (confirm('Are you sure you want to clear all pain points, personas, and analysis?')) {
      setPainPointsByStage(initialPainPointsByStage);
      setPersonas([]);
      setSelectedPersonaIds([]);
      setIsGrouped(false);
      setAnalysis(null);
      
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY_PAIN_POINTS);
        localStorage.removeItem(STORAGE_KEY_PERSONAS);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
      setLastAnalysisHash(null);
    }
  };

  const exportData = () => {
    const data = {
      painPoints: stages.reduce((acc, stage) => {
        acc[stage.id] = painPointsByStage[stage.id];
        return acc;
      }, {} as Record<Stage, PainPoint[]>),
      personas: personas
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uxr-pain-points-personas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Import personas
        if (data.personas) {
          setPersonas(ensurePersonaColors(ensureUniquePersonaIds(data.personas)));
        }
        
        // Import pain points
        if (data.painPoints) {
          setPainPointsByStage(data.painPoints);
        }
        
        // Clear cached analysis since we're loading new data
        setAnalysis(null);
        setLastAnalysisHash(null);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Clear input
  };

  const openModal = (stage?: Stage) => {
    setModalStage(stage);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStage(undefined);
  };

  const addPainPoint = (painPoint: PainPoint) => {
    setPainPointsByStage((prev) => ({
      ...prev,
      [painPoint.stage]: [...prev[painPoint.stage as Stage], painPoint],
    }));
    // Invalidate cached analysis
    setLastAnalysisHash(null);
    localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
  };

  const deletePainPoint = (id: string, stage: Stage) => {
    setPainPointsByStage((prev) => ({
      ...prev,
      [stage]: prev[stage].filter(pp => pp.id !== id),
    }));
    // Invalidate cached analysis
    setLastAnalysisHash(null);
    localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    const dropZone = (e.target as HTMLElement).closest('.drop-zone');
    if (dropZone) {
      dropZone.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const dropZone = (e.target as HTMLElement).closest('.drop-zone');
    if (dropZone && !dropZone.contains(e.relatedTarget as Node)) {
      dropZone.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    const dropZone = (e.target as HTMLElement).closest('.drop-zone');
    if (dropZone) {
      dropZone.classList.remove('drag-over');
    }

    if (draggedPainPoint.current) {
      const sourceStage = draggedPainPoint.current.stage as Stage;
      if (sourceStage !== targetStage) {
        setPainPointsByStage((prev) => {
          const newState = { ...prev };
          newState[sourceStage] = prev[sourceStage].filter(
            (pp) => pp.id !== draggedPainPoint.current?.id
          );
          newState[targetStage] = [
            ...prev[targetStage],
            { ...draggedPainPoint.current!, stage: targetStage },
          ];
          return newState;
        });
        // Invalidate cached analysis when pain point is moved
        setLastAnalysisHash(null);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS_HASH);
      }
      draggedPainPoint.current = null;
    }
  };

  const getGroupedPainPointsForStage = () => {
    // TODO: Implement grouping logic after pain points are extracted
    return [];
  };

  const handleAddPersona = (persona: Persona) => {
    if (editingPersona) {
      setPersonas(prev => prev.map(p => p.id === persona.id ? persona : p));
    } else {
      setPersonas(prev => ensureUniquePersonaIds([...prev, persona]));
    }
    setEditingPersona(null);
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setIsPersonaModalOpen(true);
  };

  const handleDeletePersona = (personaId: string) => {
    if (confirm('Are you sure you want to delete this persona? Pain points will remain but persona association will be removed.')) {
      setPersonas(prev => prev.filter(p => p.id !== personaId));
      setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
      // Remove persona association from pain points
      setPainPointsByStage(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(stage => {
          updated[stage as Stage] = updated[stage as Stage].map(pp => 
            pp.personaId === personaId ? { ...pp, personaId: undefined } : pp
          );
        });
        return updated;
      });
    }
  };

  const togglePersonaSelection = (personaId: string) => {
    setSelectedPersonaIds(prev => 
      prev.includes(personaId)
        ? prev.filter(id => id !== personaId)
        : [...prev, personaId]
    );
  };

  const startMergeMode = (persona: Persona) => {
    setMergeTarget(persona);
    setMergeMode(true);
  };

  const cancelMergeMode = () => {
    setMergeMode(false);
    setMergeTarget(null);
  };

  const mergePersonasWith = (secondaryPersona: Persona) => {
    if (!mergeTarget) return;
    
    if (confirm(`Are you sure you want to merge "${secondaryPersona.name}" into "${mergeTarget.name}"? This will combine their information and cannot be undone.`)) {
      const mergedPersona = manualMergePersonas(mergeTarget, secondaryPersona);
      
      // Update personas list
      setPersonas(prev => prev
        .map(p => p.id === mergeTarget.id ? mergedPersona : p)
        .filter(p => p.id !== secondaryPersona.id)
      );
      
      // Update pain points to use merged persona ID
      setPainPointsByStage(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(stage => {
          updated[stage as Stage] = updated[stage as Stage].map(pp => 
            pp.personaId === secondaryPersona.id 
              ? { ...pp, personaId: mergeTarget.id }
              : pp
          );
        });
        return updated;
      });
      
      // Update selected personas
      setSelectedPersonaIds(prev => 
        prev.includes(secondaryPersona.id)
          ? prev.filter(id => id !== secondaryPersona.id)
          : prev
      );
      
      cancelMergeMode();
    }
  };

  const getFilteredPainPoints = (stagePainPoints: PainPoint[]) => {
    if (selectedPersonaIds.length === 0) {
      return stagePainPoints;
    }
    return stagePainPoints.filter(pp => 
      pp.personaId && selectedPersonaIds.includes(pp.personaId)
    );
  };

  const getPersonaPainPointCount = (personaId: string) => {
    let count = 0;
    Object.values(painPointsByStage).forEach(stagePainPoints => {
      count += stagePainPoints.filter(pp => pp.personaId === personaId).length;
    });
    return count;
  };

  const analyzePainPoints = async (forceRegenerate: boolean = false) => {
    // Collect all pain points
    const allPainPoints: PainPoint[] = [];
    Object.values(painPointsByStage).forEach(stagePainPoints => {
      allPainPoints.push(...stagePainPoints);
    });

    if (allPainPoints.length === 0) {
      alert('No pain points to analyze. Please add or upload pain points first.');
      return;
    }

    // Check if we can use cached analysis (unless force regenerate is requested)
    if (!forceRegenerate && !needsNewAnalysis()) {
      setIsAnalysisModalOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setIsAnalysisModalOpen(true);

    try {
      const response = await fetch('/api/analyze-painpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ painPoints: allPainPoints, personas, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze pain points');
      }

      const { analysis } = await response.json();
      setAnalysis(analysis);
      
      // Save the hash of current pain points
      const currentHash = generatePainPointsHash(painPointsByStage);
      setLastAnalysisHash(currentHash);
      localStorage.setItem(STORAGE_KEY_ANALYSIS_HASH, currentHash);
    } catch (error) {
      console.error('Error analyzing pain points:', error);
      alert('Failed to analyze pain points. Please try again.');
      setIsAnalysisModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Pain Point Analysis Tool</h1>
        {processingTranscripts.length > 0 && (
          <div className="processing-status">
            <div className="spinner-small"></div>
            <span>
              Processing {processingTranscripts.length} transcript{processingTranscripts.length > 1 ? 's' : ''}: 
              {processingTranscripts.length <= 3 
                ? processingTranscripts.map(t => t.name).join(', ')
                : `${processingTranscripts.slice(0, 2).map(t => t.name).join(', ')} and ${processingTranscripts.length - 2} more...`
              }
            </span>
          </div>
        )}
      </div>

      <div className="canvas">
        {/* Personas Section */}
        {personas.length > 0 && (
          <div className="personas-section">
            <div className="personas-header">
              <h2>User Personas</h2>
              <div className="persona-actions">
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setEditingPersona(null);
                    setIsPersonaModalOpen(true);
                  }}
                >
                  + Add Persona
                </button>
                {personas.length > 1 && (
                  <button 
                    className={`btn btn-small ${mergeMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={mergeMode ? cancelMergeMode : () => setMergeMode(true)}
                  >
                    {mergeMode ? 'Cancel Merge' : 'Merge Personas'}
                  </button>
                )}
              </div>
            </div>
            {mergeMode && (
              <div className="merge-instructions">
                {mergeTarget ? (
                  <p>Select a persona to merge into <strong>{mergeTarget.name}</strong>:</p>
                ) : (
                  <p>Click on a persona to select it as the merge target, then click on another persona to merge them.</p>
                )}
              </div>
            )}
            <div className="personas-grid">
              {personas.map(persona => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  painPointCount={getPersonaPainPointCount(persona.id)}
                  isSelected={selectedPersonaIds.includes(persona.id)}
                  onSelect={() => mergeMode && !mergeTarget 
                    ? startMergeMode(persona)
                    : togglePersonaSelection(persona.id)}
                  onEdit={() => handleEditPersona(persona)}
                  onDelete={() => handleDeletePersona(persona.id)}
                  onMerge={mergeMode && mergeTarget?.id !== persona.id 
                    ? () => mergePersonasWith(persona)
                    : undefined}
                  showMergeButton={mergeMode && mergeTarget?.id !== persona.id}
                />
              ))}
            </div>
            {selectedPersonaIds.length > 0 && (
              <div className="persona-filter-status">
                Filtering by {selectedPersonaIds.length} persona{selectedPersonaIds.length > 1 ? 's' : ''}
                <button 
                  className="clear-filter-btn"
                  onClick={() => setSelectedPersonaIds([])}
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        )}

        <div className="controls">
          <button className="btn" onClick={() => openModal()}>
            + Add Pain Point
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setEditingPersona(null);
              setIsPersonaModalOpen(true);
            }}
          >
            + Add Persona
          </button>
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                // Limit to 10 files at once to prevent overwhelming the API
                const fileArray = Array.from(files).slice(0, 10);
                if (files.length > 10) {
                  alert('Maximum 10 files can be uploaded at once. Only the first 10 will be processed.');
                }
                fileArray.forEach(file => handleFileUpload(file));
              }
              e.target.value = ''; // Clear input to allow re-uploading same files
            }}
            style={{ display: 'none' }}
            id="transcript-upload"
          />
          <label 
            htmlFor="transcript-upload" 
            className="btn btn-secondary"
          >
            Upload Transcript(s)
          </label>
          <button className="btn btn-secondary" onClick={exportData}>
            Export Data
          </button>
          <input
            type="file"
            accept=".json"
            onChange={importData}
            style={{ display: 'none' }}
            id="data-import"
          />
          <label 
            htmlFor="data-import" 
            className="btn btn-secondary"
          >
            Import Data
          </label>
          <div className="button-group">
            <button 
              className={needsNewAnalysis() ? "btn btn-primary" : "btn btn-secondary"} 
              onClick={() => analyzePainPoints(false)}
              title={!needsNewAnalysis() 
                ? "Using cached analysis - no changes detected" 
                : "Analyze pain points"}
            >
              {needsNewAnalysis() ? "Analyze Pain Points" : "View Analysis (Cached)"}
            </button>
            {!needsNewAnalysis() && (
              <button 
                className="btn btn-secondary" 
                onClick={() => analyzePainPoints(true)}
                title="Force regenerate analysis with current pain points"
                style={{ marginLeft: '4px' }}
              >
                ↻ Regenerate
              </button>
            )}
          </div>
          <button className="btn btn-secondary" onClick={clearAll}>
            Clear All
          </button>
          
          <div className="model-selector">
            <label htmlFor="model-select">Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingModels}
              className="model-dropdown"
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              ) : (
                <option value={selectedModel}>{selectedModel}</option>
              )}
            </select>
          </div>
        </div>

        <div className="lifecycle-container" id="lifecycleContainer">
          {stages.map((stage) => (
            <LifecycleStage
              key={stage.id}
              stage={stage}
              painPoints={getFilteredPainPoints(painPointsByStage[stage.id] || [])}
              groupedPainPoints={isGrouped ? getGroupedPainPointsForStage() : undefined}
              onAddPainPoint={openModal}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              draggedElement={draggedElement}
              personas={personas}
              setDraggedElement={(el) => {
                setDraggedElement(el);
                if (el) {
                  const painPointId = el.getAttribute('data-pain-point-id');
                  if (painPointId) {
                    for (const [, points] of Object.entries(painPointsByStage)) {
                      const found = points.find(pp => pp.id === painPointId);
                      if (found) {
                        draggedPainPoint.current = found;
                        break;
                      }
                    }
                  }
                } else {
                  draggedPainPoint.current = null;
                }
              }}
              isGrouped={isGrouped}
              onDeletePainPoint={deletePainPoint}
            />
          ))}
        </div>

        <div className="legend">
          <div className="legend-section">
            <h3>Pain Point Severity</h3>
            <div className="legend-items">
              <div className="legend-item">
                <span className="severity high">High</span>
                <span>Critical blocker or major inefficiency</span>
              </div>
              <div className="legend-item">
                <span className="severity medium">Medium</span>
                <span>Noticeable friction or delay</span>
              </div>
              <div className="legend-item">
                <span className="severity low">Low</span>
                <span>Minor annoyance or improvement opportunity</span>
              </div>
            </div>
          </div>
          
          <div className="legend-section">
            <h3>Stage Heat Map</h3>
            <div className="legend-items heat-legend">
              <div className="legend-item">
                <div className="heat-sample heat-1"></div>
                <span>1-2 pain points</span>
              </div>
              <div className="legend-item">
                <div className="heat-sample heat-2"></div>
                <span>3-4 pain points</span>
              </div>
              <div className="legend-item">
                <div className="heat-sample heat-3"></div>
                <span>5-6 pain points</span>
              </div>
              <div className="legend-item">
                <div className="heat-sample heat-4"></div>
                <span>7-9 pain points</span>
              </div>
              <div className="legend-item">
                <div className="heat-sample heat-5"></div>
                <span>10+ pain points</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PainPointModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={addPainPoint}
        initialStage={modalStage}
        personas={personas}
      />
      
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => {
          setIsPersonaModalOpen(false);
          setEditingPersona(null);
        }}
        onSubmit={handleAddPersona}
        persona={editingPersona}
        existingPersonas={personas}
      />
      
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        analysis={analysis}
        isLoading={isAnalyzing}
      />
    </div>
  );
}