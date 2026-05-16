export const PUZZLE_IDS = ['1', '2', '3'];

export const DEFAULT_PUZZLE_ID = '1';

/** Parse puzzle id from URL segment; returns the string if valid, else null. */
export function parsePuzzleId(s) {
  if (typeof s !== 'string') return null;
  return PUZZLE_IDS.includes(s) ? s : null;
}

export function isPuzzleIdAllowed(puzzleId) {
  return parsePuzzleId(puzzleId) !== null;
}

export function listPuzzleIds() {
  return [...PUZZLE_IDS];
}

export function getAdjacentPuzzleId(puzzleId, delta) {
  const parsed = parsePuzzleId(puzzleId);
  if (!parsed) return null;
  const index = PUZZLE_IDS.indexOf(parsed);
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= PUZZLE_IDS.length) return null;
  return PUZZLE_IDS[nextIndex];
}
