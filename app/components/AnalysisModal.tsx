import React, { useState } from 'react';
import { PainPointAnalysis } from '../types';
import lifecycleConfig from '../lifecycle-stages.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Matrix from './Matrix';
import SeverityBars from './SeverityBars';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PainPointAnalysis | null;
  isLoading: boolean;
}

export default function AnalysisModal({ isOpen, onClose, analysis, isLoading }: AnalysisModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen) return null;

  const normalizeStageId = (stageId: string): string => {
    // Map of underscore-formatted IDs to proper IDs
    const stageMapping: { [key: string]: string } = {
      'requirements_gathering': 'requirements',
      'stakeholder_alignment': 'alignment',
      'initial_sow_creation': 'creation',
      'internal_review': 'review',
      'negotiation_revisions': 'negotiation',
      'signature_collection': 'signature',
      'procurement': 'procurement',
      'handoff_to_delivery': 'handoff',
      'project_tracking': 'tracking',
      'retrospective': 'retrospective'
    };
    
    return stageMapping[stageId] || stageId;
  };

  const getStageTitle = (stageId: string) => {
    // First normalize the stage ID
    const normalizedId = normalizeStageId(stageId);
    const stage = lifecycleConfig.stages.find(s => s.id === normalizedId);
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


  const getSolutionColor = (businessValue: number, complexity: number) => {
    // Quick Tech Wins (High Value, Low Complexity) - Green
    if (businessValue >= 3.5 && complexity <= 2.5) return '#10b981';
    // Strategic Initiatives (High Value, High Complexity) - Blue
    if (businessValue >= 3.5 && complexity >= 3.5) return '#3b82f6';
    // Nice-to-Haves (Low Value, Low Complexity) - Gray
    if (businessValue <= 2.5 && complexity <= 2.5) return '#6b7280';
    // Complex Low-Value (Low Value, High Complexity) - Red
    if (businessValue <= 2.5 && complexity >= 3.5) return '#dc2626';
    // Middle ground - Orange
    return '#f59e0b';
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
        }
        
        // If section is larger than a page, we need to split it
        if (imgHeight > contentHeight) {
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
                  {analysis.severityDistribution.map((dist, idx) => {
                    const total = dist.high + dist.medium + dist.low;
                    const hasData = total > 0;
                    
                    return (
                      <div key={idx} className="severity-row">
                        <div className="stage-label">{getStageTitle(dist.stage)}</div>
                        <div className="severity-bars">
                          {hasData ? (
                            <>
                              {dist.high > 0 && (
                                <div 
                                  className="severity-bar high" 
                                  style={{ width: `${(dist.high / total) * 100}%` }}
                                  title={`High: ${dist.high}`}
                                >
                                  {dist.high}
                                </div>
                              )}
                              {dist.medium > 0 && (
                                <div 
                                  className="severity-bar medium" 
                                  style={{ width: `${(dist.medium / total) * 100}%` }}
                                  title={`Medium: ${dist.medium}`}
                                >
                                  {dist.medium}
                                </div>
                              )}
                              {dist.low > 0 && (
                                <div 
                                  className="severity-bar low" 
                                  style={{ width: `${(dist.low / total) * 100}%` }}
                                  title={`Low: ${dist.low}`}
                                >
                                  {dist.low}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="no-data">No pain points</div>
                          )}
                        </div>
                        <div className="criticality-score">
                          Score: {dist.criticalityScore.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
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

              {/* Priority Matrix - Hidden as per user request */}
              {/* <section className="analysis-section pdf-keep-together">
                <h3>Priority Matrix</h3>
                <div className="priority-matrix pdf-no-break">
                  <Matrix
                    items={analysis.priorityMatrix.map((item, idx) => ({
                      x: item.effort,
                      y: item.impact,
                      color: getPriorityColor(item.priority),
                      label: idx + 1,
                      title: `${item.title}\n${item.rationale}`
                    }))}
                    quadrants={{
                      q1: { label: 'Quick Wins' },
                      q2: { label: 'Major Projects' },
                      q3: { label: 'Fill Ins' },
                      q4: { label: 'Thankless Tasks' }
                    }}
                    axes={{
                      x: { low: 'Low Effort', high: 'High Effort' },
                      y: { low: 'Low Impact', high: 'High Impact' }
                    }}
                    className="pdf-no-break"
                  />
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
              </section> */}

              {/* Solution Matrix */}
              <section className="analysis-section pdf-keep-together">
                <h3>Solution Matrix</h3>
                <div className="solution-matrix pdf-no-break">
                  <Matrix
                    items={analysis.solutionMatrix?.map((solution, idx) => ({
                      x: solution.complexity,
                      y: solution.businessValue,
                      color: getSolutionColor(solution.businessValue, solution.complexity),
                      label: idx + 1,
                      title: `${solution.title}\n${solution.description}`
                    })) || []}
                    quadrants={{
                      q1: { label: 'Quick Tech Wins' },
                      q2: { label: 'Strategic Initiatives' },
                      q3: { label: 'Nice-to-Haves' },
                      q4: { label: 'Complex Low-Value' }
                    }}
                    axes={{
                      x: { low: 'Low Complexity', high: 'High Complexity' },
                      y: { low: 'Low Business Value', high: 'High Business Value' }
                    }}
                    className="solution-grid pdf-no-break"
                  />
                  <div className="solution-legend">
                    {analysis.solutionMatrix?.map((solution, idx) => (
                      <div key={idx} className="solution-item-detail pdf-no-break">
                        <span className="item-number" style={{ backgroundColor: getSolutionColor(solution.businessValue, solution.complexity) }}>
                          {idx + 1}
                        </span>
                        <div className="solution-item-content">
                          <div className="solution-header">
                            <strong>{solution.title}</strong>
                            <span className={`solution-type-badge ${solution.solutionType}`}>
                              {solution.solutionType}
                            </span>
                          </div>
                          <p className="solution-description">{solution.description}</p>
                          
                          {/* Expected Impact */}
                          <div className="solution-impact">
                            <strong>Expected Impact:</strong> {solution.expectedImpact}
                          </div>
                          
                          {/* Target Stages */}
                          <div className="target-stages">
                            <strong>Target Stages:</strong>
                            {solution.targetStages?.map(stage => (
                              <span key={stage} className="stage-tag">{getStageTitle(stage)}</span>
                            ))}
                          </div>
                          
                          <div className="solution-meta">
                            {/* Tools - only show if there are tools */}
                            {solution.tools && solution.tools.length > 0 && (
                              <div className="solution-tools">
                                <strong>Tools:</strong>
                                {solution.tools.map(toolId => {
                                  const tool = lifecycleConfig.tools?.find(t => t.id === toolId);
                                  return tool ? (
                                    <span key={toolId} className="tool-tag">{tool.name}</span>
                                  ) : null;
                                })}
                              </div>
                            )}
                            <div className="solution-timing">
                              <span className={`timing-badge ${solution.implementationTime}`}>
                                {solution.implementationTime.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {solution.estimatedROI && (
                            <div className="solution-roi">
                              <strong>ROI:</strong> {solution.estimatedROI}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Persona Analysis */}
              {analysis.personaAnalysis && analysis.personaAnalysis.length > 0 && (
                <section className="analysis-section pdf-keep-together">
                  <h3>Analysis by Persona</h3>
                  <div className="persona-analysis-grid">
                    {analysis.personaAnalysis.map((personaData, idx) => (
                      <div key={idx} className="persona-analysis-card pdf-no-break">
                        <div className="persona-analysis-header">
                          <h4>{personaData.personaName}</h4>
                          <span className="pain-point-count">{personaData.painPointCount} pain points</span>
                        </div>
                        
                        <div className="severity-breakdown">
                          <h5>Severity Breakdown</h5>
                          <SeverityBars
                            high={personaData.severityBreakdown?.high ?? 0}
                            medium={personaData.severityBreakdown?.medium ?? 0}
                            low={personaData.severityBreakdown?.low ?? 0}
                            total={personaData.painPointCount}
                          />
                        </div>
                        
                        <div className="top-concerns">
                          <h5>Top Concerns</h5>
                          <ul>
                            {personaData.topConcerns.map((concern, i) => (
                              <li key={i}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="affected-stages">
                          <h5>Affected Stages</h5>
                          <div className="stage-tags">
                            {personaData.affectedStages.map(stage => (
                              <span key={stage} className="stage-tag">{getStageTitle(stage)}</span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="specific-recommendations">
                          <h5>Targeted Recommendations</h5>
                          <ul>
                            {personaData.specificRecommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

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