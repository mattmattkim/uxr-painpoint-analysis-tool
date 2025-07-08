import { NextRequest, NextResponse } from 'next/server';
import { PainPoint, Stage } from '@/app/types';
import lifecycleConfig from '@/app/lifecycle-stages.json';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string || 'gpt-4-turbo-preview';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    
    // Extract pain points and personas using OpenAI API
    const { painPoints, personas } = await extractPainPointsAndPersonasFromTranscript(text, model);
    
    return NextResponse.json({ painPoints, personas });
  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}

interface ExtractedPersona {
  id: string;
  name: string;
  role: string;
  description: string;
}

async function extractPainPointsAndPersonasFromTranscript(transcript: string, model: string): Promise<{ painPoints: PainPoint[], personas: ExtractedPersona[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }


  const stages: Stage[] = lifecycleConfig.stages.map(s => s.id as Stage);
  
  const stageDescriptions = lifecycleConfig.stages
    .map(s => `- ${s.id}: ${s.title} - ${s.subtitle}`)
    .join('\n');

  const prompt = `Analyze the following transcript and extract both user personas and pain points related to the SOW (Statement of Work) lifecycle process.

First, identify distinct personas from the transcript:
- Look for different speakers, roles, or perspectives
- Extract their characteristics, goals, and context
- Create 1-3 distinct personas based on the content

For each persona, identify:
1. Name (can be generic like "Senior Project Manager" if no name given)
2. Role/title
3. Brief description
4. Key goals (2-3 goals)
5. Demographics if mentioned (age range, experience, department, company size)

Then, for each pain point, identify:
1. A clear, concise title (2-5 words)
2. Detailed description of the issue
3. Severity (high, medium, or low)
4. Which stage of the SOW lifecycle it belongs to
5. Which persona expressed this pain point (if identifiable)

SOW Lifecycle Stages:
${stageDescriptions}

Return the result as a JSON object with two properties: "personas" and "painPoints".

Example format:
{
  "personas": [
    {
      "id": "persona-1",
      "name": "Sarah Johnson",
      "role": "Project Manager",
      "description": "Experienced PM managing complex enterprise projects",
      "goals": ["Streamline SOW creation", "Reduce revision cycles"],
      "demographics": {
        "experience": "10+ years",
        "department": "Operations"
      },
      "avatar": {
        "color": "#3b82f6",
        "initials": "SJ"
      }
    }
  ],
  "painPoints": [
    {
      "title": "Requirements unclear",
      "details": "Client requirements are often vague and change frequently",
      "severity": "high",
      "stage": "requirements",
      "source": "Interview participant",
      "personaId": "persona-1"
    }
  ]
}

Transcript:
${transcript}`;

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
          content: 'You are a UX expert at analyzing user interviews, identifying user personas, and extracting pain points. Extract distinct personas and specific, actionable pain points from the transcript. Always respond with valid JSON containing both "personas" and "painPoints" arrays.'
        },
        {
          role: 'user',
          content: prompt + '\n\nRemember to return valid JSON with both "personas" and "painPoints" arrays.'
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error details:', errorData);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
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
    
    // Try to extract pain points manually from the response
    const fallbackPainPoints: PainPoint[] = [];
    const content = data.choices[0].message.content;
    
    // Look for pain points in the response even if JSON parsing failed
    const lines = content.split('\n');
    let currentStage = 'requirements';
    
    for (const line of lines) {
      // Check if line mentions a stage
      for (const stage of stages) {
        if (line.toLowerCase().includes(stage)) {
          currentStage = stage;
          break;
        }
      }
      
      // Extract pain points from bullet points
      const bulletMatch = line.match(/^[-*]\s*(.+)/);
      if (bulletMatch) {
        const text = bulletMatch[1];
        const severityMatch = text.match(/\[(high|medium|low)\]/i);
        const severity = severityMatch ? severityMatch[1].toLowerCase() : 'medium';
        
        fallbackPainPoints.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: text.replace(/\[.*?\]/g, '').trim().substring(0, 50),
          details: text.replace(/\[.*?\]/g, '').trim(),
          severity: severity as 'high' | 'medium' | 'low',
          stage: currentStage,
          source: 'Transcript'
        });
      }
    }
    
    // If we found some pain points, use them with empty personas
    if (fallbackPainPoints.length > 0) {
      return { painPoints: fallbackPainPoints, personas: [] };
    }
    
    throw new Error('Failed to parse AI response and no pain points could be extracted');
  }
  
  // Generate unique colors for personas
  const PERSONA_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
  ];
  
  // Ensure each persona has required fields
  interface RawPersona {
    id?: string;
    name?: string;
    role?: string;
    description?: string;
    goals?: string[];
    demographics?: {
      age?: string;
      location?: string;
      experience?: string;
    };
    avatar?: {
      initials?: string;
      color?: string;
    };
  }
  
  const personasArray = result.personas || [];
  const personas = personasArray.map((p: RawPersona, index: number) => {
    const name = p.name || `User ${index + 1}`;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    return {
      id: p.id || `persona-${Date.now()}-${index}`,
      name,
      role: p.role || 'Stakeholder',
      description: p.description || '',
      goals: p.goals || [],
      demographics: p.demographics || {},
      avatar: p.avatar || {
        color: PERSONA_COLORS[index % PERSONA_COLORS.length],
        initials
      },
      painPoints: []
    };
  });
  
  // Ensure each pain point has a unique ID and valid stage
  interface RawPainPoint {
    title?: string;
    details?: string;
    description?: string;
    severity?: string;
    stage?: string;
    source?: string;
    personaId?: string;
  }
  
  // Handle both direct array and object with painPoints property
  const painPointsArray = Array.isArray(result) ? result : (result.painPoints || []);
  
  const painPoints: PainPoint[] = painPointsArray.map((pp: RawPainPoint, index: number) => ({
    id: Date.now().toString() + '-' + index + '-' + Math.random().toString().slice(2, 8),
    title: pp.title || 'Untitled Pain Point',
    details: pp.details || pp.description || '',
    severity: pp.severity || 'medium',
    stage: (pp.stage && stages.includes(pp.stage as Stage)) ? pp.stage as Stage : 'requirements',
    source: pp.source || 'Transcript',
    personaId: pp.personaId || undefined,
  }));

  return { painPoints, personas };
}