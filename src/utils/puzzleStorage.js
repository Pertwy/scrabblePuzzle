const PREFIX = 'scrabble-puzzle-';

export function loadPuzzle(puzzleId) {
  try {
    const raw = localStorage.getItem(PREFIX + puzzleId);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.board) || !Array.isArray(data.hand)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function savePuzzle(puzzleId, setup) {
  localStorage.setItem(PREFIX + puzzleId, JSON.stringify(setup));
}
