// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

export interface ParsedExercise {
  name: string;
  equipment: string | null;
  sets: number;
  repsMin: number;
  repsMax: number | null;
}

export interface ParsedTemplate {
  category: string;
  exercises: ParsedExercise[];
}

export function parseTemplate(text: string): ParsedTemplate {
  const lines = text.trim().split('\n').filter(line => line.trim());

  const exercisePattern = /^(.+?)\s*(?:\(([^)]+)\))?\s+(\d+)x(\d+)(?:-(\d+))?$/;

  // Check if first line is a category header or an exercise
  const firstLineClean = lines[0].trim().replace(/^[-•*]\s*/, '');
  const firstLineIsExercise = exercisePattern.test(firstLineClean);

  const category = firstLineIsExercise ? 'Workout' : lines[0].trim();
  const startIndex = firstLineIsExercise ? 0 : 1;

  const exercises: ParsedExercise[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip stage headers like [Compound] — stages are no longer used
    if (line.startsWith('[') && line.endsWith(']')) continue;

    // Strip list prefix (-, •, *) then match:
    // "Exercise Name (Equipment) 3x10" or "Exercise Name 3x8-10"
    const cleanLine = line.replace(/^[-•*]\s*/, '');
    const match = cleanLine.match(exercisePattern);
    if (match) {
      exercises.push({
        name: match[1].trim(),
        equipment: match[2] ? match[2].trim() : null,
        sets: parseInt(match[3]),
        repsMin: parseInt(match[4]),
        repsMax: match[5] ? parseInt(match[5]) : null,
      });
    }
  }

  return { category, exercises };
}

export async function validateTemplate(
  parsed: ParsedTemplate,
  supabase: SupabaseClient<Database>
): Promise<{ valid: boolean; missingExercises: string[] }> {
  const exerciseNames = parsed.exercises.map(e => e.name);

  const { data: exercises } = await supabase
    .from('exercises')
    .select('name')
    .in('name', exerciseNames);

  const foundNames = new Set((exercises as any)?.map((e: any) => e.name) || []);
  const missing = exerciseNames.filter(name => !foundNames.has(name));

  return {
    valid: missing.length === 0,
    missingExercises: [...new Set(missing)],
  };
}
