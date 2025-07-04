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
    const analysis = await analyzePainPoints(painPoints, model || 'gpt-4-turbo-preview');
    
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
      "impact": number (1-5, where 1=low impact, 5=high impact),
      "effort": number (1-5, where 1=low effort, 5=high effort),
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
- Distribute pain points realistically across the entire 1-5 scale for both impact and effort
- Avoid clustering all items with the same scores
- Consider: Quick wins (high impact 4-5, low effort 1-2), Major projects (high impact 4-5, high effort 4-5), Fill-ins (low impact 1-2, low effort 1-2), Thankless tasks (low impact 1-2, high effort 4-5)
- Use decimal values if needed (e.g., 2.5, 3.7) to spread items out
- Ensure a balanced distribution across all quadrants`;

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
          content: 'You are a UX research expert specializing in process optimization and pain point analysis. Provide detailed, actionable insights based on user research data. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt + '\n\nIMPORTANT: Return only valid JSON, no markdown formatting or code blocks.'
        }
      ],
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
    // Remove any potential markdown code blocks
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleanContent);
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

  return result;
}