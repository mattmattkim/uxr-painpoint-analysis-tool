import React, { useState, useEffect } from 'react';
import { PainPointAnalysis, Theme, SeverityByStage, Recommendation } from '../types';
import lifecycleConfig from '../lifecycle-stages.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PainPointAnalysis | null;
  isLoading: boolean;
}

export default function AnalysisModal({ isOpen, onClose, analysis, isLoading }: AnalysisModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  const generatePDF = async () => {
    if (!analysis) return;

    setIsGeneratingPDF(true);
    try {
      // Get the original modal element
      const originalModal = document.querySelector('.analysis-modal') as HTMLElement;
      if (!originalModal) {
        throw new Error('Modal not found');
      }

      // Clone the entire modal
      const modalClone = originalModal.cloneNode(true) as HTMLElement;
      
      // Apply styles to remove all constraints
      modalClone.style.position = 'absolute';
      modalClone.style.left = '-9999px';
      modalClone.style.top = '0';
      modalClone.style.maxHeight = 'none';
      modalClone.style.height = 'auto';
      modalClone.style.overflow = 'visible';
      modalClone.style.width = '1200px';
      
      // Find and modify the content area in the clone
      const contentClone = modalClone.querySelector('.analysis-content') as HTMLElement;
      if (contentClone) {
        contentClone.style.height = 'auto';
        contentClone.style.overflow = 'visible';
        contentClone.style.maxHeight = 'none';
      }
      
      // Add the clone to the body
      document.body.appendChild(modalClone);
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin;
      
      // Get all sections
      const sections = modalClone.querySelectorAll('.analysis-section');
      let currentY = margin;
      let pageNumber = 1;
      
      // Process each section separately
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        // Capture this section
        const canvas = await html2canvas(section, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          width: 1200,
          windowWidth: 1200,
        });
        
        // Calculate dimensions
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if we need a new page for this section
        // Add extra buffer for priority matrix to keep it together
        const isPriorityMatrix = section.innerHTML.includes('Priority Matrix');
        const buffer = isPriorityMatrix ? 50 : 0;
        
        if (currentY + Math.min(imgHeight, 100) + buffer > pageHeight - margin && currentY > margin) {
          pdf.addPage();
          currentY = margin;
          pageNumber++;
        }
        
        // If section is larger than a page, we need to split it
        if (imgHeight > contentHeight) {
          const img = canvas.toDataURL('image/png');
          let remainingHeight = imgHeight;
          let sourceY = 0;
          
          while (remainingHeight > 0) {
            const availableSpace = pageHeight - margin - currentY;
            const heightToAdd = Math.min(remainingHeight, availableSpace);
            
            // Calculate source dimensions
            const sourceHeight = (heightToAdd / imgHeight) * canvas.height;
            
            // Create temporary canvas for this portion
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = sourceHeight;
            const ctx = tempCanvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(
                canvas,
                0, sourceY,
                canvas.width, sourceHeight,
                0, 0,
                canvas.width, sourceHeight
              );
              
              // Add to PDF
              pdf.addImage(
                tempCanvas.toDataURL('image/png'),
                'PNG',
                margin,
                currentY,
                imgWidth,
                heightToAdd
              );
            }
            
            remainingHeight -= heightToAdd;
            sourceY += sourceHeight;
            currentY += heightToAdd;
            
            // If there's more content, add a new page
            if (remainingHeight > 0) {
              pdf.addPage();
              currentY = margin;
              pageNumber++;
            }
          }
        } else {
          // Section fits on current page
          pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            margin,
            currentY,
            imgWidth,
            imgHeight
          );
          currentY += imgHeight;
        }
        
        // Add some space between sections
        currentY += 10;
      }
      
      // Remove the clone
      document.body.removeChild(modalClone);

      // Save the PDF
      const fileName = `pain-point-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
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
              <section className="analysis-section pdf-keep-together">
                <h3>Executive Summary</h3>
                <div className="summary-content">
                  {analysis.summary.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </section>

              {/* Themes */}
              <section className="analysis-section pdf-keep-together">
                <h3>Key Themes</h3>
                <div className="themes-grid pdf-keep-together">
                  {analysis.themes.map((theme, idx) => (
                    <div key={idx} className="theme-card pdf-no-break">
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
              <section className="analysis-section pdf-keep-together">
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
              <section className="analysis-section pdf-keep-together">
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
              <section className="analysis-section pdf-keep-together">
                <h3>Priority Matrix</h3>
                <div className="priority-matrix pdf-no-break">
                  <div className="matrix-grid pdf-no-break">
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
                      <div key={idx} className="priority-item pdf-no-break">
                        <span className="item-number" style={{ backgroundColor: getPriorityColor(item.priority) }}>
                          {idx + 1}
                        </span>
                        <div className="priority-item-content">
                          <strong>{item.title}</strong>
                          <p>{item.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Recommendations */}
              <section className="analysis-section pdf-keep-together">
                <h3>Recommendations</h3>
                <div className="recommendations pdf-keep-together">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="recommendation-card pdf-no-break">
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
            <>
              <button 
                className="btn btn-secondary" 
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
                Export as JSON
              </button>
              <button 
                className="btn btn-primary" 
                onClick={generatePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}