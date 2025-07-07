export interface PainPoint {
  id?: string;
  title: string;
  details?: string;
  severity: 'high' | 'medium' | 'low';
  source?: string;
  stage: string;
}

export interface PainPointWithCount {
  painPoint: PainPoint;
  count: number;
  subPoints?: PainPoint[];
}

export type Stage = 
  | 'requirements'
  | 'alignment'
  | 'creation'
  | 'review'
  | 'presentation'
  | 'negotiation'
  | 'signature'
  | 'handoff'
  | 'tracking'
  | 'retrospective';

export interface StageInfo {
  id: Stage;
  number: number;
  title: string;
  subtitle: string;
}

// Analysis Types
export interface Theme {
  name: string;
  description: string;
  frequency: number;
  stages: string[];
  painPointIds: string[];
}

export interface SeverityByStage {
  stage: string;
  high: number;
  medium: number;
  low: number;
  criticalityScore: number;
}

export interface RootCause {
  cause: string;
  impact: 'high' | 'medium' | 'low';
  affectedStages: string[];
  relatedThemes: string[];
}

export interface PriorityItem {
  painPointId: string;
  title: string;
  impact: number;
  effort: number;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  rationale: string;
}

export interface Recommendation {
  title: string;
  description: string;
  targetStages: string[];
  expectedImpact: string;
  implementationTime: 'quick-win' | 'short-term' | 'long-term';
}

export interface SolutionTool {
  id: string;
  name: string;
  category: 'automation' | 'collaboration' | 'analytics' | 'ai-ml' | 'integration' | 'document-mgmt';
  description: string;
  maturity: 'emerging' | 'established' | 'mature';
  examples?: string[];
}

export interface SolutionRecommendation {
  title: string;
  description: string;
  tools: string[]; // Tool IDs from lifecycle-stages.json
  complexity: number; // 1-5 scale
  businessValue: number; // 1-5 scale
  implementationTime: string;
  targetPainPoints: string[];
  estimatedROI?: string;
}

export interface PainPointAnalysis {
  themes: Theme[];
  severityDistribution: SeverityByStage[];
  rootCauses: RootCause[];
  priorityMatrix: PriorityItem[];
  recommendations: Recommendation[];
  solutionMatrix: SolutionRecommendation[];
  summary: string;
}