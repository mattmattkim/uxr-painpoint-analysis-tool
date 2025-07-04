import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const models = await openai.models.list();
    
    // Filter for models that support chat completions
    const chatModels = models.data
      .filter(model => 
        model.id.includes('gpt') || 
        model.id.includes('o1') || 
        model.id.includes('o3') ||
        model.id.includes('o4')
      )
      .sort((a, b) => {
        // Sort by model name for better organization
        if (a.id.includes('o4') && !b.id.includes('o4')) return -1;
        if (!a.id.includes('o4') && b.id.includes('o4')) return 1;
        if (a.id.includes('o3') && !b.id.includes('o3')) return -1;
        if (!a.id.includes('o3') && b.id.includes('o3')) return 1;
        if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
        if (!a.id.includes('gpt-4') && b.id.includes('gpt-4')) return 1;
        return a.id.localeCompare(b.id);
      })
      .map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
      }));

    return NextResponse.json({ models: chatModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}