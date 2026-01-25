// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

export interface ParsedExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number | null;
}

export interface ParsedStage {
  name: string;
  exercises: ParsedExercise[];
}

export interface ParsedTemplate {
  category: string;
  stages: ParsedStage[];
}

export function parseTemplate(text: string): ParsedTemplate {
  const lines = text.trim().split('\n').filter(line => line.trim());

  // First line is category (e.g., "Pull Day")
  const categoryLine = lines[0];
  const category = categoryLine.replace(/\s*Day\s*$/i, '').trim();

  const stages: ParsedStage[] = [];
  let currentStage: ParsedStage | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stage header: [Stage Name]
    if (line.startsWith('[') && line.endsWith(']')) {
      if (currentStage) stages.push(currentStage);
      currentStage = { name: line.slice(1, -1), exercises: [] };
      continue;
    }

    // Exercise line: "Exercise Name 3x10" or "Exercise Name 3x8-10"
    const match = line.match(/^(.+?)\s+(\d+)x(\d+)(?:-(\d+))?$/);
    if (match) {
      if (!currentStage) {
        currentStage = { name: 'General Workout', exercises: [] };
      }
      currentStage.exercises.push({
        name: match[1].trim(),
        sets: parseInt(match[2]),
        repsMin: parseInt(match[3]),
        repsMax: match[4] ? parseInt(match[4]) : null,
      });
    }
  }

  if (currentStage) stages.push(currentStage);

  // If no stages defined, wrap everything in default stage
  if (stages.length === 0) {
    stages.push({ name: 'General Workout', exercises: [] });
  }

  return { category, stages };
}

export async function validateTemplate(
  parsed: ParsedTemplate,
  supabase: SupabaseClient<Database>
): Promise<{ valid: boolean; missingExercises: string[] }> {
  const exerciseNames = parsed.stages.flatMap(s => s.exercises.map(e => e.name));

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
