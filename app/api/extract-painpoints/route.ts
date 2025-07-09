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
    const { painPoints, personas } = await extractPainPointsAndPersonasFromTranscript(text, model, file.name);
    
    return NextResponse.json({ painPoints, personas });
  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}

// Generate a UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ExtractedPersona {
  id: string;
  name: string;
  role: string;
  description?: string;
  goals?: string[];
  painPoints?: string[];
  demographics?: {
    age?: string;
    experience?: string;
    department?: string;
    companySize?: string;
  };
  avatar?: {
    color: string;
    initials: string;
  };
}

async function extractPainPointsAndPersonasFromTranscript(transcript: string, model: string, filename?: string): Promise<{ painPoints: PainPoint[], personas: ExtractedPersona[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // We don't need a transcript session ID anymore since each persona gets its own UUID


  const stages: Stage[] = lifecycleConfig.stages.map(s => s.id as Stage);
  
  const stageDescriptions = lifecycleConfig.stages
    .map(s => `- ${s.id}: ${s.title} - ${s.subtitle}`)
    .join('\n');

  // We no longer need existing personas context since we're always creating new ones

  const prompt = `Analyze the following transcript and extract both user personas and pain points related to the SOW (Statement of Work) lifecycle process.

STEP 1 - Identify Interview Subjects (NOT Interviewers):
CRITICAL: Only create personas for people being INTERVIEWED, not interviewers or people mentioned in stories.

IMPORTANT: The filename often contains the interviewee's name (e.g., "Brian_Carpio_July_7_transcript.txt" means Brian Carpio is the interviewee).
${filename ? `FILENAME ANALYSIS: The filename "${filename}" suggests the interviewee is likely: ${filename.split(/[_\-\s]/).filter(part => part.length > 0 && !part.includes('transcript') && !part.includes('.txt') && !part.includes('July') && !part.includes('2024') && !part.includes('2025') && isNaN(Number(part))).join(' ')}` : ''}

Identify actual interview subjects by looking for:
- The person whose name appears in the filename
- People directly answering questions about their work experience
- People sharing their own pain points and challenges
- People describing their own goals and processes
- Primary respondents who are the focus of the interview

DO NOT create personas for:
- Interviewers asking questions ("Thanks for joining us today", "Can you tell me about...")
- Colleagues or clients mentioned in stories ("My boss said...", "The client wants...")
- Secondary characters in anecdotes
- People referenced but not directly interviewed
- Anyone who is just asking questions rather than being interviewed

STEP 2 - Create Personas:
CRITICAL: DO NOT generate IDs for personas. The system will assign IDs automatically.

- Create a separate persona for each distinct speaker/participant in the interview
- Look for different speakers, roles, or perspectives
- Use placeholders for missing information (e.g., "Interview Participant A", "Role not specified")
- Do not invent demographic information - use "Not specified" if not mentioned
- ALWAYS create new personas - do not try to match with existing ones

STEP 3 - Extract Pain Points:
SIMPLE RULE: Track which persona (by array index) expressed each pain point.

- Each pain point should have a personaIndex indicating which persona from your personas array expressed it
- Use 0 for the first persona, 1 for the second, etc.
- If the transcript has one interviewee → all pain points get personaIndex: 0
- If the transcript has multiple interviewees → assign each pain point to whoever said it using their index
- Only use null for personaIndex if you truly cannot determine who expressed the pain point

For each persona (new or updated), include:
1. Name (use actual name if provided, otherwise use descriptive placeholder like "Project Manager Interviewee", "Participant A", etc.)
2. Role/title (use actual role if mentioned, otherwise "Role not specified")
3. Brief description (based only on information in transcript, use "Limited information available" if minimal)
4. Key goals (only goals explicitly mentioned or clearly implied, leave empty if none mentioned)
5. Demographics ONLY if explicitly mentioned in transcript:
   - Use "Not specified" for any demographic information not mentioned
   - Do not invent age ranges, experience levels, or company sizes
   - Only include demographic fields that are explicitly stated in the transcript

Then, for each pain point, identify:
1. A clear, concise title (2-5 words)
2. Detailed description of the issue
3. Severity (high, medium, or low)
4. Which stage of the SOW lifecycle it belongs to
5. Which persona expressed this pain point (using personaIndex - 0 for first persona, 1 for second, etc.)

SOW Lifecycle Stages:
${stageDescriptions}

Return the result as a JSON object with two properties: "personas" and "painPoints".

ATTRIBUTION VALIDATION EXAMPLES:

✅ CORRECT Attribution:
If you have one persona (Brian Carpio) in the personas array:
→ Pain point: "Requirements unclear" → personaIndex: 0
→ Pain point: "Manual processes slow" → personaIndex: 0

If you have two personas in array: [Sarah Johnson, John Doe]
→ Sarah's pain point: "Approval delays" → personaIndex: 0
→ John's pain point: "Communication gaps" → personaIndex: 1

❌ INCORRECT Attribution:
→ Using personaId instead of personaIndex
→ Empty personaIndex when speaker is known
→ Using wrong index (personaIndex: 2 when you only have 2 personas [0,1])

Example format:
{
  "personas": [
    {
      "name": "Sarah Johnson",
      "role": "Project Manager",
      "description": "Experienced PM managing complex enterprise projects",
      "goals": ["Streamline SOW creation", "Reduce revision cycles"],
      "demographics": {
        "experience": "10+ years",
        "department": "Operations",
        "age": "Not specified",
        "companySize": "Not specified"
      }
    },
    {
      "name": "Interview Participant B",
      "role": "Role not specified",
      "description": "Limited information available from transcript",
      "goals": [],
      "demographics": {
        "experience": "Not specified",
        "department": "Not specified",
        "age": "Not specified",
        "companySize": "Not specified"
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
      "personaIndex": 0
    },
    {
      "title": "Communication gaps",
      "details": "There are frequent misunderstandings between teams",
      "severity": "medium",
      "stage": "alignment",
      "source": "Interview participant",
      "personaIndex": 0
    }
  ]
}

Transcript${filename ? ` (filename: ${filename})` : ''}:
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
          content: `You are a UX expert at analyzing user interviews, identifying user personas, and extracting pain points. Extract distinct personas and specific, actionable pain points from the transcript. Always respond with valid JSON containing both "personas" and "painPoints" arrays.`
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
    
    // Debug logging to see what LLM returns
    console.log('LLM Response:', {
      personas: result.personas?.map((p: any) => ({ name: p.name })),
      painPoints: result.painPoints?.map((pp: any) => ({ 
        title: pp.title, 
        personaIndex: pp.personaIndex,
        hasPersonaIndex: pp.personaIndex !== undefined 
      }))
    });
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
    name?: string;
    role?: string;
    description?: string;
    goals?: string[];
    demographics?: {
      age?: string;
      location?: string;
      experience?: string;
    };
  }
  
  const personasArray = result.personas || [];
  const personas = personasArray.map((p: RawPersona, index: number) => {
    const name = p.name || `User ${index + 1}`;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    // Generate a unique UUID for each persona
    const uniqueId = generateUUID();
    
    return {
      id: uniqueId,
      name,
      role: p.role || 'Stakeholder',
      description: p.description || '',
      goals: p.goals || [],
      demographics: p.demographics || {},
      avatar: {
        initials
        // Color will be assigned by frontend, so we don't include it here
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
    personaIndex?: number;
  }
  
  // Handle both direct array and object with painPoints property
  const painPointsArray = Array.isArray(result) ? result : (result.painPoints || []);
  
  let painPoints: PainPoint[] = painPointsArray.map((pp: RawPainPoint, index: number) => ({
    id: Date.now().toString() + '-' + index + '-' + Math.random().toString().slice(2, 8),
    title: pp.title || 'Untitled Pain Point',
    details: pp.details || pp.description || '',
    severity: pp.severity || 'medium',
    stage: (pp.stage && stages.includes(pp.stage as Stage)) ? pp.stage as Stage : 'requirements',
    source: pp.source || 'Transcript',
    // Map personaIndex to the actual persona ID
    personaId: (pp.personaIndex !== undefined && pp.personaIndex < personas.length) 
      ? personas[pp.personaIndex].id 
      : undefined,
  }));

  // Fallback: If there's only one persona and pain points don't have personaId, assign them
  if (personas.length === 1) {
    const singlePersonaId = personas[0].id;
    const unassignedCount = painPoints.filter(pp => !pp.personaId).length;
    if (unassignedCount > 0) {
      painPoints = painPoints.map(pp => ({
        ...pp,
        personaId: pp.personaId || singlePersonaId
      }));
      console.log(`Fallback: Assigned ${unassignedCount} unassigned pain points to single persona "${personas[0].name}" (${singlePersonaId})`);
    }
  }
  
  // Debug final mapping
  console.log('Final persona mapping:', {
    personas: personas.map(p => ({ id: p.id, name: p.name })),
    painPointsWithPersona: painPoints.filter(pp => pp.personaId).map(pp => ({
      title: pp.title,
      personaId: pp.personaId
    }))
  });
  
  return { painPoints, personas };
}