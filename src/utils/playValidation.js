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

/** Play direction when two or more tiles are placed; null for a single tile. */
function getPlayDirection(newTilePositions) {
  if (newTilePositions.length <= 1) return null;

  const rows = new Set(newTilePositions.map(([row]) => row));
  return rows.size === 1 ? 'horizontal' : 'vertical';
}

function wordContainsAllPositions(wordData, positions) {
  return positions.every(([row, col]) =>
    wordData.positions.some(([r, c]) => r === row && c === col)
  );
}

/** The word spelled in the play direction that includes every new tile. */
function getMainWord(words, newTilePositions, direction) {
  if (!direction) {
    return words[0] ?? null;
  }

  return (
    words.find(
      (wordData) =>
        wordData.direction === direction &&
        wordContainsAllPositions(wordData, newTilePositions)
    ) ?? null
  );
}

/**
 * Validates that new tiles form a single straight play and spell a main word.
 * Cross-words formed perpendicular to the play are allowed.
 * @returns {{ valid: true, word: string, words: string[] } | { valid: false, error: string }}
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

  const direction = getPlayDirection(newTilePositions);
  const mainWord = getMainWord(words, newTilePositions, direction);

  if (newTilePositions.length > 1 && !mainWord) {
    return {
      valid: false,
      error: 'Played tiles must form one contiguous word.',
    };
  }

  const allWords = [...new Set(words.map((wordData) => wordData.word))];

  return {
    valid: true,
    word: mainWord?.word ?? words[0].word,
    words: allWords,
  };
}
