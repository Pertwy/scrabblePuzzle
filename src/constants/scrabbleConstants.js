// Scrabble letter values
export const LETTER_VALUES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

/** A–Z in sorted order for letter pickers. */
export const SCRABBLE_LETTERS = Object.keys(LETTER_VALUES).sort();

// Board multiplier positions (0-indexed)
// TW = Triple Word, DW = Double Word, TL = Triple Letter, DL = Double Letter
export const BOARD_MULTIPLIERS = {
  // Triple Word Score positions
  TW: [
    [0, 0], [0, 7], [0, 14],
    [7, 0], [7, 14],
    [14, 0], [14, 7], [14, 14]
  ],
  // Double Word Score positions
  DW: [
    [1, 1], [1, 13], [2, 2], [2, 12], [3, 3], [3, 11],
    [4, 4], [4, 10], [7, 7], [10, 4], [10, 10], [11, 3],
    [11, 11], [12, 2], [12, 12], [13, 1], [13, 13]
  ],
  // Triple Letter Score positions
  TL: [
    [1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]
  ],
  // Double Letter Score positions
  DL: [
    [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14],
    [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11],
    [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14],
    [12, 6], [12, 8], [14, 3], [14, 11]
  ]
};

// Get multiplier type for a position
export function getMultiplierType(row, col) {
  const pos = [row, col];
  if (BOARD_MULTIPLIERS.TW.some(p => p[0] === row && p[1] === col)) return 'TW';
  if (BOARD_MULTIPLIERS.DW.some(p => p[0] === row && p[1] === col)) return 'DW';
  if (BOARD_MULTIPLIERS.TL.some(p => p[0] === row && p[1] === col)) return 'TL';
  if (BOARD_MULTIPLIERS.DL.some(p => p[0] === row && p[1] === col)) return 'DL';
  return null;
}
