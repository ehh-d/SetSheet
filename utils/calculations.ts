// Brzycki Formula for 1RM estimation
export function calculate1RM(weight: number, reps: number): number {
  if (reps >= 37) return weight; // Formula breaks down at high reps
  return weight * (36 / (37 - reps));
}

// Total volume for a workout
export function calculateVolume(sets: { reps: number; weight: number }[]): number {
  return sets.reduce((total, set) => total + (set.reps * set.weight), 0);
}

// Check if this set is a PR
export function isPR(
  currentVolume: number,
  previousBestVolume: number | null
): boolean {
  if (!previousBestVolume) return true;
  return currentVolume > previousBestVolume;
}
