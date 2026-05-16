import { LETTER_VALUES, getMultiplierType } from '../constants/scrabbleConstants';

// Calculate score for a word on the board
export function calculateWordScore(wordPositions, board, isNewWord = false) {
  let wordScore = 0;
  let wordMultiplier = 1;
  const usedMultipliers = new Set();

  for (const [row, col] of wordPositions) {
    const tile = board[row][col];
    if (!tile) continue;

    // Use the tile's stored value when available so existing tiles
    // always contribute correctly, then fall back to the letter map.
    let letterValue = tile.value ?? LETTER_VALUES[tile.letter] ?? 0;
    const multiplierType = getMultiplierType(row, col);
    const multiplierKey = `${row}-${col}`;

    // Only apply multipliers if this is a new tile (not already on board)
    if (isNewWord && tile.isNew && multiplierType && !usedMultipliers.has(multiplierKey)) {
      if (multiplierType === 'DL') {
        letterValue *= 2;
      } else if (multiplierType === 'TL') {
        letterValue *= 3;
      } else if (multiplierType === 'DW') {
        wordMultiplier *= 2;
        usedMultipliers.add(multiplierKey);
      } else if (multiplierType === 'TW') {
        wordMultiplier *= 3;
        usedMultipliers.add(multiplierKey);
      }
    }

    wordScore += letterValue;
  }

  return wordScore * wordMultiplier;
}

// Get all words formed by new tiles
export function getAllWords(board, newTilePositions) {
  const words = [];
  const visited = new Set();

  for (const [row, col] of newTilePositions) {
    // Check horizontal word
    const hWord = getHorizontalWord(board, row, col, visited);
    if (hWord && hWord.positions.length > 1) {
      words.push(hWord);
    }

    // Check vertical word
    const vWord = getVerticalWord(board, row, col, visited);
    if (vWord && vWord.positions.length > 1) {
      words.push(vWord);
    }
  }

  return words;
}

// Get horizontal word at position
function getHorizontalWord(board, row, col, visited) {
  const key = `h-${row}-${col}`;
  if (visited.has(key)) return null;

  let startCol = col;
  while (startCol > 0 && board[row][startCol - 1]) {
    startCol--;
  }

  let endCol = col;
  while (endCol < 14 && board[row][endCol + 1]) {
    endCol++;
  }

  const positions = [];
  const letters = [];
  for (let c = startCol; c <= endCol; c++) {
    if (board[row][c]) {
      positions.push([row, c]);
      letters.push(board[row][c].letter);
      visited.add(`h-${row}-${c}`);
    }
  }

  if (positions.length === 0) return null;

  return {
    word: letters.join(''),
    positions,
    direction: 'horizontal'
  };
}

// Get vertical word at position
function getVerticalWord(board, row, col, visited) {
  const key = `v-${row}-${col}`;
  if (visited.has(key)) return null;

  let startRow = row;
  while (startRow > 0 && board[startRow - 1][col]) {
    startRow--;
  }

  let endRow = row;
  while (endRow < 14 && board[endRow + 1][col]) {
    endRow++;
  }

  const positions = [];
  const letters = [];
  for (let r = startRow; r <= endRow; r++) {
    if (board[r][col]) {
      positions.push([r, col]);
      letters.push(board[r][col].letter);
      visited.add(`v-${r}-${col}`);
    }
  }

  if (positions.length === 0) return null;

  return {
    word: letters.join(''),
    positions,
    direction: 'vertical'
  };
}

// Calculate total score for all words formed
export function calculateTotalScore(board, newTilePositions) {
  // Backwards-compatible wrapper around scoreMove that adapts from
  // the board + position format used in the app.
  const placedTiles = newTilePositions.map(([row, col]) => {
    const tile = board[row][col];
    if (!tile) {
      return { x: col, y: row, letter: '' };
    }
    return { x: col, y: row, letter: tile.letter };
  });

  return scoreMove(board, placedTiles);
}

// Score a full move given the current board and the tiles placed this turn.
// - board: 15x15 array of cells (existing tiles already on the board)
// - placedTiles: [{ x: col, y: row, letter }]
// Scoring rules:
// - Letter multipliers apply only to newly placed tiles.
// - Word multipliers apply only to newly placed tiles (and multiply together).
// - Existing tiles always contribute their base letter value and never trigger multipliers.
// - Cross-words formed by new tiles are scored independently and added to the total.
// - Bingo: placing exactly 7 tiles in a single move adds +50 points.
export function scoreMove(board, placedTiles) {
  if (!placedTiles || placedTiles.length === 0) {
    return 0;
  }

  // Clone the board and explicitly mark all existing tiles as not new.
  const tempBoard = board.map(row =>
    row.map(cell => (cell ? { ...cell, isNew: false } : null))
  );

  const newTilePositions = [];

  // Apply the placed tiles as "new" tiles on the temporary board.
  for (const { x, y, letter } of placedTiles) {
    const row = y;
    const col = x;

    // Ignore out-of-bounds placements defensively.
    if (row < 0 || row >= 15 || col < 0 || col >= 15) {
      // Skip invalid tiles rather than throwing; tests can cover valid cases.
      continue;
    }

    tempBoard[row][col] = {
      letter,
      value: LETTER_VALUES[letter] ?? 0,
      isNew: true
    };

    newTilePositions.push([row, col]);
  }

  if (newTilePositions.length === 0) {
    return 0;
  }

  const words = getAllWords(tempBoard, newTilePositions);
  let totalScore = 0;

  for (const wordData of words) {
    // Only score words that actually include at least one newly placed tile.
    const hasNewTile = wordData.positions.some(([r, c]) =>
      newTilePositions.some(([nr, nc]) => nr === r && nc === c)
    );

    if (hasNewTile) {
      const wordScore = calculateWordScore(wordData.positions, tempBoard, true);
      totalScore += wordScore;
    }
  }

  // Bingo bonus: exactly 7 tiles placed in this move.
  if (placedTiles.length === 7) {
    totalScore += 50;
  }

  return totalScore;
}
