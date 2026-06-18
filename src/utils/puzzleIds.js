export const DEFAULT_PUZZLE_ID = '1';

/** Parse puzzle id from URL segment; returns the string if it is numeric, else null. */
export function parsePuzzleId(s) {
  if (typeof s !== 'string') return null;
  return /^\d+$/.test(s) ? s : null;
}

export function isPuzzleIdAllowed(puzzleId) {
  return parsePuzzleId(puzzleId) !== null;
}

/**
 * Return the adjacent published puzzle id in the given direction.
 * @param {string} puzzleId current puzzle id
 * @param {number} delta -1 (previous) or +1 (next)
 * @param {string[]} orderedIds published ids sorted ascending
 * @returns {string | null} the neighbour id, or null at the ends
 */
export function getAdjacentPuzzleId(puzzleId, delta, orderedIds) {
  const parsed = parsePuzzleId(puzzleId);
  if (!parsed || !Array.isArray(orderedIds)) return null;
  const index = orderedIds.indexOf(parsed);
  if (index === -1) return null;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= orderedIds.length) return null;
  return orderedIds[nextIndex];
}
