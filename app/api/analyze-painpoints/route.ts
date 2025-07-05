import { NextRequest, NextResponse } from 'next/server';
import { PainPoint } from '@/app/types';
import lifecycleConfig from '@/app/lifecycle-stages.json';

export async function POST(request: NextRequest) {
  try {
    const { painPoints, model } = await request.json();
    
    if (!painPoints || !Array.isArray(painPoints)) {
      return NextResponse.json({ error: 'Invalid pain points data' }, { status: 400 });
    }

    // Analyze pain points using OpenAI API
    const analysis = await analyzePainPoints(painPoints, model || 'gpt-4o-mini');
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing pain points:', error);
    return NextResponse.json(
      { error: 'Failed to analyze pain points' },
      { status: 500 }
    );
  }
}

async function analyzePainPoints(painPoints: PainPoint[], model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Ensure all pain points have IDs
  const painPointsWithIds = painPoints.map((pp, index) => ({
    ...pp,
    id: pp.id || `pp-${index}`
  }));

  // Prepare pain points summary by stage
  const painPointsByStage: Record<string, PainPoint[]> = {};
  lifecycleConfig.stages.forEach(stage => {
    painPointsByStage[stage.id] = painPointsWithIds.filter(pp => pp.stage === stage.id);
  });

  const painPointsSummary = Object.entries(painPointsByStage)
    .map(([stage, points]) => {
      const stageInfo = lifecycleConfig.stages.find(s => s.id === stage);
      return `\n${stageInfo?.title} (${points.length} pain points):
${points.map(pp => `- [ID: ${pp.id}] [${pp.severity}] ${pp.title}: ${pp.details || 'No details'}`).join('\n')}`;
    })
    .join('\n');

  const prompt = `As a UX research expert, analyze the following pain points from a SOW (Statement of Work) lifecycle process and provide comprehensive insights.

Pain Points by Stage:
${painPointsSummary}

Please provide a detailed analysis in the following JSON format:
{
  "themes": [
    {
      "name": "Theme name",
      "description": "Brief description of the theme",
      "frequency": number (how many pain points relate to this),
      "stages": ["stage1", "stage2"] (which stages are affected),
      "painPointIds": ["id1", "id2"] (IDs of related pain points)
    }
  ],
  "severityDistribution": [
    {
      "stage": "stage_id",
      "high": number,
      "medium": number,
      "low": number,
      "criticalityScore": number (0-10 based on severity and volume)
    }
  ],
  "rootCauses": [
    {
      "cause": "Root cause description",
      "impact": "high|medium|low",
      "affectedStages": ["stage1", "stage2"],
      "relatedThemes": ["theme1", "theme2"]
    }
  ],
  "priorityMatrix": [
    {
      "painPointId": "id",
      "title": "Pain point title",
      "impact": number (1.0-5.0 with decimals, where 1=low impact, 5=high impact, use values like 2.3, 3.7, 4.2),
      "effort": number (1.0-5.0 with decimals, where 1=low effort, 5=high effort, use values like 1.8, 2.5, 4.1),
      "priority": "immediate|high|medium|low",
      "rationale": "Why this priority"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "targetStages": ["stage1", "stage2"],
      "expectedImpact": "Description of expected impact",
      "implementationTime": "quick-win|short-term|long-term"
    }
  ],
  "summary": "Executive summary of the analysis (2-3 paragraphs)"
}

Focus on:
1. Identifying cross-cutting themes and patterns
2. Understanding systemic vs isolated issues
3. Providing actionable recommendations
4. Prioritizing based on business impact
5. Considering implementation feasibility

IMPORTANT for Priority Matrix:
- Create a NATURAL, REALISTIC scatter plot distribution
- DO NOT cluster items at quadrant boundaries or corners
- Spread items THROUGHOUT each quadrant with organic variation
- Use diverse decimal values across the ENTIRE range within each quadrant:
  * Quick wins (top-left): 
    - Impact: vary between 3.2 to 4.8 (e.g., 3.2, 3.6, 3.9, 4.1, 4.3, 4.6, 4.8)
    - Effort: vary between 1.1 to 2.8 (e.g., 1.1, 1.4, 1.7, 2.0, 2.3, 2.5, 2.8)
  * Major projects (top-right):
    - Impact: vary between 3.4 to 4.9 (e.g., 3.4, 3.7, 4.0, 4.2, 4.5, 4.7, 4.9)
    - Effort: vary between 3.1 to 4.9 (e.g., 3.1, 3.4, 3.8, 4.1, 4.4, 4.6, 4.9)
  * Fill-ins (bottom-left):
    - Impact: vary between 1.1 to 2.7 (e.g., 1.1, 1.3, 1.6, 1.9, 2.2, 2.4, 2.7)
    - Effort: vary between 1.2 to 2.9 (e.g., 1.2, 1.5, 1.8, 2.1, 2.4, 2.6, 2.9)
  * Thankless tasks (bottom-right):
    - Impact: vary between 1.1 to 2.6 (e.g., 1.1, 1.4, 1.7, 2.0, 2.3, 2.6)
    - Effort: vary between 3.2 to 4.9 (e.g., 3.2, 3.5, 3.9, 4.2, 4.5, 4.7, 4.9)
- CRITICAL: Items should look naturally scattered, NOT lined up or clustered at edges
- Mix values randomly - don't follow a pattern or sequence
- Some items can be near quadrant centers (e.g., impact 2.5, effort 2.5)`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a UX research expert specializing in process optimization and pain point analysis. Provide detailed, actionable insights based on user research data. Always respond with valid JSON. CRITICAL: Use actual numbers (1, 2, 3) not words (one, two, three) in JSON values.'
        },
        {
          role: 'user',
          content: prompt + '\n\nIMPORTANT: Return only valid JSON, no markdown formatting or code blocks. All numeric values must be actual numbers (like 14) not words (like "fourteen"). Ensure all JSON is properly formatted with correct commas and quotes.'
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error details:', errorData);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  let result;
  try {
    const content = data.choices[0].message.content;
    // With response_format, OpenAI guarantees valid JSON, so we can parse directly
    result = JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', data.choices[0].message.content);
    console.error('Parse error:', error);
    
    // Provide a fallback response if parsing fails
    result = {
      themes: [],
      severityDistribution: lifecycleConfig.stages.map(stage => ({
        stage: stage.id,
        high: 0,
        medium: 0,
        low: 0,
        criticalityScore: 0
      })),
      rootCauses: [],
      priorityMatrix: [],
      recommendations: [],
      summary: "Analysis failed to complete. Please try again."
    };
  }

  // Post-process priority matrix to ensure natural distribution
  if (result.priorityMatrix && result.priorityMatrix.length > 0) {
    result.priorityMatrix = spreadPriorityMatrix(result.priorityMatrix);
  }

  return result;
}

// Helper function to spread clustered items in priority matrix
function spreadPriorityMatrix(items: any[]): any[] {
  const processed = [...items];
  const threshold = 0.3; // Minimum distance between items
  
  // Sort by priority to process similar items together
  const groups = {
    immediate: processed.filter(p => p.priority === 'immediate'),
    high: processed.filter(p => p.priority === 'high'),
    medium: processed.filter(p => p.priority === 'medium'),
    low: processed.filter(p => p.priority === 'low')
  };
  
  // Process each priority group
  Object.entries(groups).forEach(([priority, groupItems]) => {
    // Check for clustering within each group
    for (let i = 0; i < groupItems.length; i++) {
      for (let j = i + 1; j < groupItems.length; j++) {
        const item1 = groupItems[i];
        const item2 = groupItems[j];
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(item1.impact - item2.impact, 2) + 
          Math.pow(item1.effort - item2.effort, 2)
        );
        
        // If too close, spread them apart
        if (distance < threshold) {
          // Add small random offsets to separate items
          const angle = Math.random() * Math.PI * 2;
          const offset = threshold / 2;
          
          // Adjust item2 position
          item2.impact += Math.sin(angle) * offset;
          item2.effort += Math.cos(angle) * offset;
          
          // Keep within bounds (1-5)
          item2.impact = Math.max(1, Math.min(5, item2.impact));
          item2.effort = Math.max(1, Math.min(5, item2.effort));
        }
      }
    }
  });
  
  // Additional spread for edge clustering
  processed.forEach(item => {
    // If item is too close to edges, pull it in slightly
    const edgeBuffer = 0.15;
    
    if (item.impact < 1 + edgeBuffer) item.impact = 1 + edgeBuffer + Math.random() * 0.2;
    if (item.impact > 5 - edgeBuffer) item.impact = 5 - edgeBuffer - Math.random() * 0.2;
    if (item.effort < 1 + edgeBuffer) item.effort = 1 + edgeBuffer + Math.random() * 0.2;
    if (item.effort > 5 - edgeBuffer) item.effort = 5 - edgeBuffer - Math.random() * 0.2;
    
    // Round to 1 decimal place for cleaner values
    item.impact = Math.round(item.impact * 10) / 10;
    item.effort = Math.round(item.effort * 10) / 10;
  });
  
  return processed;
}