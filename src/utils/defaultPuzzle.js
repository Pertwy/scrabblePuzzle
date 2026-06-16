import { loadPuzzle } from './puzzleApi';

export function createEmptyBoard() {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));
}

/** Restore board cells from stored JSON. */
export function normalizeBoardFromStorage(board) {
  return board.map((row) =>
    row.map((cell) =>
      cell
        ? {
            letter: cell.letter,
            value: cell.value,
            isNew: cell.isNew !== undefined ? cell.isNew : false,
            tileId: cell.tileId || `board-${Date.now()}-${Math.random()}`,
          }
        : null
    )
  );
}

export function normalizeHandFromStorage(hand) {
  return hand.map((tile) => ({
    id: tile.id || `tile-${Date.now()}-${Math.random()}`,
    letter: tile.letter,
    value: tile.value,
  }));
}

function puzzleFromStored(stored) {
  return {
    board: normalizeBoardFromStorage(stored.board),
    hand: normalizeHandFromStorage(stored.hand),
  };
}

export function createEmptyPuzzle() {
  return {
    board: createEmptyBoard(),
    hand: [],
  };
}

/** Puzzle by id from API or localStorage; null if not saved yet. */
export async function fetchPuzzle(puzzleId) {
  const stored = await loadPuzzle(puzzleId);
  if (stored) {
    return puzzleFromStored(stored);
  }
  return null;
}
