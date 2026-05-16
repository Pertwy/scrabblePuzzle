import { getAllWords } from './scoring';

/** True when every new tile shares the same row or the same column. */
export function areNewTilesInSingleLine(newTilePositions) {
  if (!newTilePositions || newTilePositions.length === 0) return false;
  if (newTilePositions.length === 1) return true;

  const rows = new Set(newTilePositions.map(([row]) => row));
  const cols = new Set(newTilePositions.map(([, col]) => col));

  return rows.size === 1 || cols.size === 1;
}

/** Words of length 2+ on the board that include at least one newly placed tile. */
export function getWordsIncludingNewTiles(board, newTilePositions) {
  return getAllWords(board, newTilePositions).filter((wordData) =>
    wordData.positions.some(([row, col]) =>
      newTilePositions.some(([nr, nc]) => nr === row && nc === col)
    )
  );
}

/**
 * Validates that new tiles form a single straight play and spell exactly one word.
 * @returns {{ valid: true, word: string } | { valid: false, error: string }}
 */
export function validatePlayGeometry(board, newTilePositions) {
  if (!newTilePositions || newTilePositions.length === 0) {
    return {
      valid: false,
      error: 'Please place at least one tile on the board!',
    };
  }

  if (!areNewTilesInSingleLine(newTilePositions)) {
    return {
      valid: false,
      error:
        'All played tiles must be in one row or one column (no L-shaped plays).',
    };
  }

  const words = getWordsIncludingNewTiles(board, newTilePositions);

  if (words.length === 0) {
    return {
      valid: false,
      error: 'No valid word formed! Tiles must connect to existing letters.',
    };
  }

  if (words.length > 1) {
    return {
      valid: false,
      error: 'Only one word can be played at a time.',
    };
  }

  return { valid: true, word: words[0].word };
}
