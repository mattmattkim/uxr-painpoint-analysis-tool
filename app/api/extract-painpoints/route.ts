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
    
    // Extract pain points using OpenAI API
    const painPoints = await extractPainPointsFromTranscript(text, model);
    
    return NextResponse.json({ painPoints });
  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}

async function extractPainPointsFromTranscript(transcript: string, model: string): Promise<PainPoint[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }


  const stages: Stage[] = lifecycleConfig.stages.map(s => s.id as Stage);
  
  const stageDescriptions = lifecycleConfig.stages
    .map(s => `- ${s.id}: ${s.title} - ${s.subtitle}`)
    .join('\n');

  const prompt = `Analyze the following transcript and extract pain points related to the SOW (Statement of Work) lifecycle process. 

For each pain point, identify:
1. A clear, concise title (2-5 words)
2. Detailed description of the issue
3. Severity (high, medium, or low)
4. Which stage of the SOW lifecycle it belongs to

SOW Lifecycle Stages:
${stageDescriptions}

Return the pain points as a JSON object with a single "painPoints" property containing an array. Each pain point should have: title (string), details (string), severity (string: "high", "medium", or "low"), stage (string: must be one of the stage IDs listed above), and source (string).

Example format:
{
  "painPoints": [
    {
      "title": "Requirements unclear",
      "details": "Client requirements are often vague and change frequently",
      "severity": "high",
      "stage": "requirements",
      "source": "Interview participant"
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
          content: 'You are a UX expert at analyzing user interviews and extracting pain points. Extract specific, actionable pain points from the transcript. Always respond with valid JSON containing a "painPoints" array.'
        },
        {
          role: 'user',
          content: prompt + '\n\nRemember to return valid JSON with a "painPoints" array.'
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
    
    // If we found some pain points, use them
    if (fallbackPainPoints.length > 0) {
      return fallbackPainPoints;
    }
    
    throw new Error('Failed to parse AI response and no pain points could be extracted');
  }
  
  // Ensure each pain point has a unique ID and valid stage
  interface RawPainPoint {
    title?: string;
    details?: string;
    description?: string;
    severity?: string;
    stage?: string;
    source?: string;
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
  }));

  return painPoints;
}