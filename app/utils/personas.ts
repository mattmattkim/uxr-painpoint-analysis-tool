import { Persona } from '../types';

export const PERSONA_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

/**
 * Calculates similarity between two personas based on name and role
 * Now much more conservative - only merges if very confident it's the same person
 */
function calculatePersonaSimilarity(persona1: Persona, persona2: Persona): number {
  const name1 = persona1.name.toLowerCase().trim();
  const name2 = persona2.name.toLowerCase().trim();
  
  // Only merge if EXACT name match (case insensitive)
  if (name1 === name2) {
    return 0.95; // Very high confidence for exact name match
  }
  
  // Check for exact first and last name match
  const name1Parts = name1.split(' ').filter(part => part.length > 0);
  const name2Parts = name2.split(' ').filter(part => part.length > 0);
  
  if (name1Parts.length >= 2 && name2Parts.length >= 2) {
    const firstName1 = name1Parts[0];
    const lastName1 = name1Parts[name1Parts.length - 1];
    const firstName2 = name2Parts[0];
    const lastName2 = name2Parts[name2Parts.length - 1];
    
    // Only merge if both first AND last names match exactly
    if (firstName1 === firstName2 && lastName1 === lastName2) {
      return 0.9; // High confidence for first+last name match
    }
  }
  
  // No merging based on role similarity alone - too risky
  // Each interview participant should be treated as a separate person
  return 0.0;
}

/**
 * Merges two personas, combining their properties intelligently
 */
function mergeTwoPersonas(existing: Persona, incoming: Persona): Persona {
  return {
    id: existing.id, // Keep existing ID
    name: incoming.name || existing.name, // Use incoming name if provided
    role: incoming.role || existing.role, // Use incoming role if provided
    description: incoming.description || existing.description,
    goals: [
      ...(existing.goals || []),
      ...(incoming.goals || [])
    ].filter((goal, index, arr) => arr.indexOf(goal) === index), // Remove duplicates
    painPoints: [
      ...(existing.painPoints || []),
      ...(incoming.painPoints || [])
    ].filter((point, index, arr) => arr.indexOf(point) === index), // Remove duplicates
    demographics: {
      age: incoming.demographics?.age || existing.demographics?.age,
      experience: incoming.demographics?.experience || existing.demographics?.experience,
      department: incoming.demographics?.department || existing.demographics?.department,
      companySize: incoming.demographics?.companySize || existing.demographics?.companySize,
    },
    avatar: incoming.avatar || existing.avatar,
  };
}

/**
 * Generates a unique persona ID using UUID v4
 */
function generateUniquePersonaId(existingPersonas: Persona[]): string {
  const existingIds = new Set(existingPersonas.map(p => p.id));
  
  // Generate a UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  
  let newId = generateUUID();
  
  // Ensure it's truly unique (extremely unlikely with UUID but just in case)
  while (existingIds.has(newId)) {
    newId = generateUUID();
  }
  
  return newId;
}

/**
 * Assigns a unique color to a persona based on existing personas
 */
function assignUniqueColor(existingPersonas: Persona[], personaIndex: number): string {
  const usedColors = new Set(existingPersonas.map(p => p.avatar?.color).filter(Boolean));
  
  // Try to find an unused color
  for (const color of PERSONA_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  
  // If all colors are used, cycle through them
  return PERSONA_COLORS[personaIndex % PERSONA_COLORS.length];
}

/**
 * Generates initials from a persona name
 */
function generateInitials(name: string): string {
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Ensures a persona has a proper avatar with color and initials
 */
function ensurePersonaAvatar(persona: Persona, existingPersonas: Persona[], index: number): Persona {
  if (!persona.avatar || !persona.avatar.color) {
    return {
      ...persona,
      avatar: {
        color: assignUniqueColor(existingPersonas, index),
        initials: generateInitials(persona.name)
      }
    };
  }
  
  // Ensure initials are correct
  if (!persona.avatar.initials) {
    return {
      ...persona,
      avatar: {
        ...persona.avatar,
        initials: generateInitials(persona.name)
      }
    };
  }
  
  return persona;
}

/**
 * Result of merging personas, including ID mappings
 */
export interface MergePersonasResult {
  personas: Persona[];
  idMapping: Record<string, string>; // Maps old IDs to new IDs
}

/**
 * Merges new personas with existing ones, preventing duplicates
 * Returns both the merged personas and a mapping of ID changes
 */
export function mergePersonasWithMapping(existing: Persona[], incoming: Persona[]): MergePersonasResult {
  const merged: Persona[] = [...existing];
  const idMapping: Record<string, string> = {};
  
  for (const incomingPersona of incoming) {
    let bestMatch: { persona: Persona; similarity: number; index: number } | null = null;
    
    // Find the best matching existing persona - only merge if very confident (0.8+ threshold)
    for (let i = 0; i < merged.length; i++) {
      const similarity = calculatePersonaSimilarity(merged[i], incomingPersona);
      if (similarity > 0.8 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { persona: merged[i], similarity, index: i };
      }
    }
    
    if (bestMatch) {
      // Merge with existing persona - map the incoming ID to the existing ID
      merged[bestMatch.index] = mergeTwoPersonas(bestMatch.persona, incomingPersona);
      idMapping[incomingPersona.id] = bestMatch.persona.id;
    } else {
      // Add as new persona - keep the original ID if it doesn't conflict
      const existingIds = new Set(merged.map(p => p.id));
      if (!existingIds.has(incomingPersona.id)) {
        // Keep original ID
        merged.push(incomingPersona);
        idMapping[incomingPersona.id] = incomingPersona.id;
      } else {
        // Generate new ID
        const newId = generateUniquePersonaId(merged);
        const personaWithUniqueId = {
          ...incomingPersona,
          id: newId
        };
        merged.push(personaWithUniqueId);
        idMapping[incomingPersona.id] = newId;
      }
    }
  }
  
  // Final deduplication check - remove any personas with duplicate IDs and ensure proper avatars
  const uniquePersonas: Persona[] = [];
  const seenIds = new Set<string>();
  
  for (let i = 0; i < merged.length; i++) {
    const persona = merged[i];
    if (!seenIds.has(persona.id)) {
      seenIds.add(persona.id);
      uniquePersonas.push(ensurePersonaAvatar(persona, uniquePersonas, i));
    }
  }
  
  return { personas: uniquePersonas, idMapping };
}

/**
 * Merges new personas with existing ones, preventing duplicates
 * Legacy function that returns only the personas array
 */
export function mergePersonas(existing: Persona[], incoming: Persona[]): Persona[] {
  const result = mergePersonasWithMapping(existing, incoming);
  return result.personas;
}

/**
 * Finds a persona by ID
 */
export function findPersonaById(personas: Persona[], id: string): Persona | undefined {
  return personas.find(persona => persona.id === id);
}

/**
 * Validates that a persona has required fields
 */
export function validatePersona(persona: Persona): boolean {
  return !!(persona.id && persona.name && persona.role);
}

/**
 * Ensures all personas in an array have unique IDs
 */
export function ensureUniquePersonaIds(personas: Persona[]): Persona[] {
  const uniquePersonas: Persona[] = [];
  const seenIds = new Set<string>();
  
  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    if (!seenIds.has(persona.id)) {
      seenIds.add(persona.id);
      uniquePersonas.push(ensurePersonaAvatar(persona, uniquePersonas, i));
    } else {
      // Generate new unique ID for duplicate
      console.warn(`Duplicate persona ID detected: ${persona.id} for ${persona.name}. Generating new ID.`);
      const newId = generateUniquePersonaId(uniquePersonas);
      const personaWithNewId = {
        ...persona,
        id: newId
      };
      uniquePersonas.push(ensurePersonaAvatar(personaWithNewId, uniquePersonas, i));
      seenIds.add(newId);
    }
  }
  
  return uniquePersonas;
}

/**
 * Gets the next available color for a new persona
 */
export function getNextAvailableColor(existingPersonas: Persona[]): string {
  return assignUniqueColor(existingPersonas, existingPersonas.length);
}

/**
 * Ensures all personas in an array have proper colors and avatars
 */
export function ensurePersonaColors(personas: Persona[]): Persona[] {
  console.log('ensurePersonaColors called with:', personas.map(p => ({
    name: p.name,
    hasAvatar: !!p.avatar,
    avatarColor: p.avatar?.color
  })));
  
  // Check if all personas have the same color (a common bug scenario)
  const colors = personas.map(p => p.avatar?.color).filter(Boolean);
  const allSameColor = colors.length > 1 && colors.every(c => c === colors[0]);
  
  if (allSameColor) {
    console.log('All personas have the same color, reassigning unique colors...');
  }
  
  // Assign colors to each persona
  let colorIndex = 0;
  const usedColors = new Set<string>();
  
  const result = personas.map((persona, idx) => {
    // Skip if persona already has a unique color (and we're not fixing all same colors)
    if (persona.avatar?.color && !allSameColor && !usedColors.has(persona.avatar.color)) {
      console.log(`${persona.name} keeping unique color: ${persona.avatar.color}`);
      usedColors.add(persona.avatar.color);
      return persona;
    }
    
    // Find next available color
    while (usedColors.has(PERSONA_COLORS[colorIndex % PERSONA_COLORS.length])) {
      colorIndex++;
      if (colorIndex >= PERSONA_COLORS.length * 2) {
        // Prevent infinite loop - just use the color even if duplicate
        break;
      }
    }
    
    const newColor = PERSONA_COLORS[colorIndex % PERSONA_COLORS.length];
    console.log(`Assigning color ${newColor} to ${persona.name}`);
    usedColors.add(newColor);
    colorIndex++;
    
    return {
      ...persona,
      avatar: {
        color: newColor,
        initials: persona.avatar?.initials || generateInitials(persona.name)
      }
    };
  });
  
  console.log('Result after color assignment:', result.map(p => ({
    name: p.name,
    color: p.avatar?.color
  })));
  
  return result;
}

/**
 * Manually merge two personas (for user-initiated merges)
 */
export function manualMergePersonas(primary: Persona, secondary: Persona): Persona {
  return {
    id: primary.id, // Keep primary persona's ID
    name: primary.name || secondary.name,
    role: primary.role || secondary.role,
    description: primary.description || secondary.description,
    goals: [
      ...(primary.goals || []),
      ...(secondary.goals || [])
    ].filter((goal, index, arr) => arr.indexOf(goal) === index), // Remove duplicates
    painPoints: [
      ...(primary.painPoints || []),
      ...(secondary.painPoints || [])
    ].filter((point, index, arr) => arr.indexOf(point) === index), // Remove duplicates
    demographics: {
      age: primary.demographics?.age || secondary.demographics?.age,
      experience: primary.demographics?.experience || secondary.demographics?.experience,
      department: primary.demographics?.department || secondary.demographics?.department,
      companySize: primary.demographics?.companySize || secondary.demographics?.companySize,
    },
    avatar: primary.avatar || secondary.avatar,
  };
}