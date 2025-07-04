import React, { useState, useEffect } from 'react';
import { PainPointAnalysis, Theme, SeverityByStage, Recommendation } from '../types';
import lifecycleConfig from '../lifecycle-stages.json';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PainPointAnalysis | null;
  isLoading: boolean;
}

export default function AnalysisModal({ isOpen, onClose, analysis, isLoading }: AnalysisModalProps) {
  if (!isOpen) return null;

  const getStageTitle = (stageId: string) => {
    const stage = lifecycleConfig.stages.find(s => s.id === stageId);
    return stage?.title || stageId;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'immediate': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-header">
          <h2>Pain Points Analysis</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analysis-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Analyzing pain points...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Executive Summary */}
              <section className="analysis-section">
                <h3>Executive Summary</h3>
                <div className="summary-content">
                  {analysis.summary.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </section>

              {/* Themes */}
              <section className="analysis-section">
                <h3>Key Themes</h3>
                <div className="themes-grid">
                  {analysis.themes.map((theme, idx) => (
                    <div key={idx} className="theme-card">
                      <h4>{theme.name}</h4>
                      <p className="theme-description">{theme.description}</p>
                      <div className="theme-meta">
                        <span className="frequency-badge">{theme.frequency} pain points</span>
                        <div className="affected-stages">
                          {theme.stages.map(stage => (
                            <span key={stage} className="stage-tag">{getStageTitle(stage)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Severity Distribution */}
              <section className="analysis-section">
                <h3>Severity Distribution by Stage</h3>
                <div className="severity-chart">
                  {analysis.severityDistribution.map((dist, idx) => (
                    <div key={idx} className="severity-row">
                      <div className="stage-label">{getStageTitle(dist.stage)}</div>
                      <div className="severity-bars">
                        <div 
                          className="severity-bar high" 
                          style={{ width: `${(dist.high / (dist.high + dist.medium + dist.low)) * 100}%` }}
                          title={`High: ${dist.high}`}
                        >
                          {dist.high > 0 && dist.high}
                        </div>
                        <div 
                          className="severity-bar medium" 
                          style={{ width: `${(dist.medium / (dist.high + dist.medium + dist.low)) * 100}%` }}
                          title={`Medium: ${dist.medium}`}
                        >
                          {dist.medium > 0 && dist.medium}
                        </div>
                        <div 
                          className="severity-bar low" 
                          style={{ width: `${(dist.low / (dist.high + dist.medium + dist.low)) * 100}%` }}
                          title={`Low: ${dist.low}`}
                        >
                          {dist.low > 0 && dist.low}
                        </div>
                      </div>
                      <div className="criticality-score">
                        Score: {dist.criticalityScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Root Causes */}
              <section className="analysis-section">
                <h3>Root Causes</h3>
                <div className="root-causes">
                  {analysis.rootCauses.map((cause, idx) => (
                    <div key={idx} className="root-cause-card">
                      <div className="cause-header">
                        <h4>{cause.cause}</h4>
                        <span 
                          className="impact-badge" 
                          style={{ backgroundColor: getSeverityColor(cause.impact) }}
                        >
                          {cause.impact} impact
                        </span>
                      </div>
                      <div className="affected-stages">
                        <strong>Affected stages:</strong>
                        {cause.affectedStages.map(stage => (
                          <span key={stage} className="stage-tag">{getStageTitle(stage)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Priority Matrix */}
              <section className="analysis-section">
                <h3>Priority Matrix</h3>
                <div className="priority-matrix">
                  <div className="matrix-grid">
                    <div className="matrix-axes">
                      <div className="y-axis">
                        <span className="axis-label">High Impact</span>
                        <div className="axis-line"></div>
                        <span className="axis-label">Low Impact</span>
                      </div>
                      <div className="x-axis">
                        <span className="axis-label">Low Effort</span>
                        <div className="axis-line"></div>
                        <span className="axis-label">High Effort</span>
                      </div>
                    </div>
                    <div className="matrix-quadrants">
                      <div className="quadrant q1">
                        <span className="quadrant-label">Quick Wins</span>
                      </div>
                      <div className="quadrant q2">
                        <span className="quadrant-label">Major Projects</span>
                      </div>
                      <div className="quadrant q3">
                        <span className="quadrant-label">Fill Ins</span>
                      </div>
                      <div className="quadrant q4">
                        <span className="quadrant-label">Thankless Tasks</span>
                      </div>
                      {analysis.priorityMatrix.map((item, idx) => (
                        <div 
                          key={idx}
                          className="matrix-item"
                          style={{
                            left: `${((item.effort - 1) / 4) * 100}%`,
                            top: `${((5 - item.impact) / 4) * 100}%`,
                            backgroundColor: getPriorityColor(item.priority)
                          }}
                          title={`${item.title}\n${item.rationale}`}
                        >
                          <span className="matrix-item-label">{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="priority-legend">
                    {analysis.priorityMatrix.map((item, idx) => (
                      <div key={idx} className="priority-item">
                        <span className="item-number" style={{ backgroundColor: getPriorityColor(item.priority) }}>
                          {idx + 1}
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Recommendations */}
              <section className="analysis-section">
                <h3>Recommendations</h3>
                <div className="recommendations">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="recommendation-card">
                      <div className="rec-header">
                        <h4>{rec.title}</h4>
                        <span className={`time-badge ${rec.implementationTime}`}>
                          {rec.implementationTime.replace('-', ' ')}
                        </span>
                      </div>
                      <p>{rec.description}</p>
                      <div className="rec-impact">
                        <strong>Expected Impact:</strong> {rec.expectedImpact}
                      </div>
                      <div className="target-stages">
                        <strong>Target Stages:</strong>
                        {rec.targetStages.map(stage => (
                          <span key={stage} className="stage-tag">{getStageTitle(stage)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">
              <p>No analysis available</p>
            </div>
          )}
        </div>

        <div className="analysis-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {analysis && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                const dataStr = JSON.stringify(analysis, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `pain-point-analysis-${new Date().toISOString().split('T')[0]}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
            >
              Export Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}