'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PainPoint, Stage, StageInfo, PainPointAnalysis } from './types';
import PainPointModal from './components/PainPointModal';
import LifecycleStage from './components/LifecycleStage';
import AnalysisModal from './components/AnalysisModal';
import lifecycleConfig from './lifecycle-stages.json';

const stages: StageInfo[] = lifecycleConfig.stages as StageInfo[];

const STORAGE_KEY_PAIN_POINTS = 'uxr-pain-points';
const STORAGE_KEY_ANALYSIS = 'uxr-analysis';
const STORAGE_KEY_MODEL = 'uxr-selected-model';

export default function Home() {
  // Initialize with all stages from lifecycle config
  const initialPainPointsByStage = stages.reduce((acc, stage) => {
    acc[stage.id as Stage] = [];
    return acc;
  }, {} as Record<Stage, PainPoint[]>);

  const [painPointsByStage, setPainPointsByStage] = useState<Record<Stage, PainPoint[]>>(initialPainPointsByStage);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState<Stage | undefined>();
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const draggedPainPoint = useRef<PainPoint | null>(null);
  
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<PainPointAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [processingTranscripts, setProcessingTranscripts] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4-turbo-preview');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

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

      const savedAnalysis = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      if (savedAnalysis) {
        const parsedAnalysis = JSON.parse(savedAnalysis);
        setAnalysis(parsedAnalysis);
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
    setProcessingTranscripts(prev => [...prev, fileId]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);

      const response = await fetch('/api/extract-painpoints', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process transcript');
      }

      const { painPoints } = await response.json();
      
      // Add source information with filename
      const enhancedPainPoints = painPoints.map((pp: PainPoint) => ({
        ...pp,
        source: `${pp.source} (${file.name})`
      }));
      
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
    } catch (error) {
      console.error('Error uploading transcript:', error);
      alert('Failed to process transcript. Please make sure you have configured your OpenAI API key.');
    } finally {
      setProcessingTranscripts(prev => prev.filter(id => id !== fileId));
    }
  };


  const clearAll = () => {
    if (confirm('Are you sure you want to clear all pain points and analysis?')) {
      setPainPointsByStage(initialPainPointsByStage);
      setIsGrouped(false);
      setAnalysis(null);
      
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY_PAIN_POINTS);
        localStorage.removeItem(STORAGE_KEY_ANALYSIS);
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
    }
  };

  const exportData = () => {
    const data = stages.reduce((acc, stage) => {
      acc[stage.id] = painPointsByStage[stage.id];
      return acc;
    }, {} as Record<Stage, PainPoint[]>);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sow-pain-points.json';
    a.click();
    URL.revokeObjectURL(url);
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
  };

  const deletePainPoint = (id: string, stage: Stage) => {
    setPainPointsByStage((prev) => ({
      ...prev,
      [stage]: prev[stage].filter(pp => pp.id !== id),
    }));
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
      }
      draggedPainPoint.current = null;
    }
  };

  const getGroupedPainPointsForStage = () => {
    // TODO: Implement grouping logic after pain points are extracted
    return [];
  };

  const analyzePainPoints = async () => {
    // Collect all pain points
    const allPainPoints: PainPoint[] = [];
    Object.values(painPointsByStage).forEach(stagePainPoints => {
      allPainPoints.push(...stagePainPoints);
    });

    if (allPainPoints.length === 0) {
      alert('No pain points to analyze. Please add or upload pain points first.');
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
        body: JSON.stringify({ painPoints: allPainPoints, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze pain points');
      }

      const { analysis } = await response.json();
      setAnalysis(analysis);
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
            <span>Processing {processingTranscripts.length} transcript{processingTranscripts.length > 1 ? 's' : ''}...</span>
          </div>
        )}
      </div>

      <div className="canvas">
        <div className="controls">
          <button className="btn" onClick={() => openModal()}>
            + Add Pain Point
          </button>
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = ''; // Clear input to allow re-uploading same file
            }}
            style={{ display: 'none' }}
            id="transcript-upload"
          />
          <label 
            htmlFor="transcript-upload" 
            className="btn btn-secondary"
          >
            Upload Transcript
          </label>
          <button className="btn btn-secondary" onClick={exportData}>
            Export Data
          </button>
          <button className="btn btn-primary" onClick={analyzePainPoints}>
            Analyze Pain Points
          </button>
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
              painPoints={painPointsByStage[stage.id] || []}
              groupedPainPoints={isGrouped ? getGroupedPainPointsForStage() : undefined}
              onAddPainPoint={openModal}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              draggedElement={draggedElement}
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