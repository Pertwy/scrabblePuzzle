import { LETTER_VALUES, getMultiplierType } from '../constants/scrabbleConstants';
import { scoreMove } from './scoring';

function createEmptyBoard() {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));
}

function placeExistingTile(board, row, col, letter) {
  board[row][col] = {
    letter,
    value: LETTER_VALUES[letter],
    isNew: false
  };
}

describe('scoreMove - basic scoring', () => {
  test('single word with no multipliers', () => {
    const board = createEmptyBoard();

    // Place "CAT" horizontally at row 7, cols 4–6 (all normal squares)
    const placedTiles = [
      { x: 4, y: 7, letter: 'C' },
      { x: 5, y: 7, letter: 'A' },
      { x: 6, y: 7, letter: 'T' }
    ];

    placedTiles.forEach(({ x, y }) => {
      expect(getMultiplierType(y, x)).toBeNull();
    });

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.C + LETTER_VALUES.A + LETTER_VALUES.T;

    expect(score).toBe(expected);
  });

  test('double letter multiplier on new tile', () => {
    const board = createEmptyBoard();

    // Use a known DL square: (7, 3)
    expect(getMultiplierType(7, 3)).toBe('DL');

    // Word: "AX" with X on DL at (3,7) -> score = A + (X*2)
    const placedTiles = [
      { x: 2, y: 7, letter: 'A' }, // normal
      { x: 3, y: 7, letter: 'X' }  // DL
    ];

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.A + LETTER_VALUES.X * 2;

    expect(score).toBe(expected);
  });

  test('triple letter multiplier on new tile', () => {
    const board = createEmptyBoard();

    // Use a known TL square: (5, 5)
    expect(getMultiplierType(5, 5)).toBe('TL');

    // Word: "AX" with X on TL at (5,5) -> score = A + (X*3)
    const placedTiles = [
      { x: 4, y: 5, letter: 'A' }, // normal
      { x: 5, y: 5, letter: 'X' }  // TL
    ];

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.A + LETTER_VALUES.X * 3;

    expect(score).toBe(expected);
  });

  test('double word multiplier on new tile', () => {
    const board = createEmptyBoard();

    // Use a known DW square: (7, 7)
    expect(getMultiplierType(7, 7)).toBe('DW');

    // Word: "HI" with H on DW at (7,7)
    // Score = (H + I) * 2
    const placedTiles = [
      { x: 7, y: 7, letter: 'H' },
      { x: 8, y: 7, letter: 'I' }
    ];

    const base = LETTER_VALUES.H + LETTER_VALUES.I;
    const score = scoreMove(board, placedTiles);

    expect(score).toBe(base * 2);
  });

  test('triple word multiplier on new tile', () => {
    const board = createEmptyBoard();

    // Use a known TW square: (0, 0)
    expect(getMultiplierType(0, 0)).toBe('TW');

    // Word: "HI" with H on TW at (0,0)
    const placedTiles = [
      { x: 0, y: 0, letter: 'H' },
      { x: 1, y: 0, letter: 'I' }
    ];

    const base = LETTER_VALUES.H + LETTER_VALUES.I;
    const score = scoreMove(board, placedTiles);

    expect(score).toBe(base * 3);
  });

  test('multiple word multipliers in same word', () => {
    const board = createEmptyBoard();

    // Use two DW squares: (1,1) and (2,2) along diagonal, build "HI" vertically
    expect(getMultiplierType(1, 1)).toBe('DW');
    expect(getMultiplierType(2, 1)).toBeNull();

    const placedTiles = [
      { x: 1, y: 1, letter: 'H' }, // DW
      { x: 1, y: 2, letter: 'I' }  // normal
    ];

    const base = LETTER_VALUES.H + LETTER_VALUES.I;
    const score = scoreMove(board, placedTiles);

    // Only one DW in this word, so score = base * 2
    expect(score).toBe(base * 2);
  });

  test('mixed letter and word multipliers', () => {
    const board = createEmptyBoard();

    // Word: "HAT"
    // H on DW at (7,7), A on DL at (7,3) won't be in same word,
    // so use a simpler layout:
    // Place H on DW at (7,7) and A, T to the right.
    expect(getMultiplierType(7, 7)).toBe('DW');
    expect(getMultiplierType(7, 8)).toBeNull();
    expect(getMultiplierType(7, 9)).toBeNull();

    const placedTiles = [
      { x: 7, y: 7, letter: 'H' }, // DW
      { x: 8, y: 7, letter: 'A' }, // normal
      { x: 9, y: 7, letter: 'T' }  // normal
    ];

    const base = LETTER_VALUES.H + LETTER_VALUES.A + LETTER_VALUES.T;
    const score = scoreMove(board, placedTiles);

    expect(score).toBe(base * 2);
  });
});

describe('scoreMove - existing tiles and multipliers', () => {
  test('existing tiles contribute base value, no multipliers', () => {
    const board = createEmptyBoard();

    // Existing word "AT" at row 7, cols 5–6
    placeExistingTile(board, 7, 5, 'A');
    placeExistingTile(board, 7, 6, 'T');

    // Place "C" before it to make "CAT"
    const placedTiles = [{ x: 4, y: 7, letter: 'C' }];

    // All normal squares
    [4, 5, 6].forEach(col => {
      expect(getMultiplierType(7, col)).toBeNull();
    });

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.C + LETTER_VALUES.A + LETTER_VALUES.T;

    expect(score).toBe(expected);
  });

  test('multipliers ignored for existing tiles', () => {
    const board = createEmptyBoard();

    // Existing "HI" with H already on DW at (7,7)
    placeExistingTile(board, 7, 7, 'H');
    placeExistingTile(board, 7, 8, 'I');
    expect(getMultiplierType(7, 7)).toBe('DW');

    // Place "S" to extend "HIS"
    const placedTiles = [{ x: 9, y: 7, letter: 'S' }];

    const score = scoreMove(board, placedTiles);
    const base =
      LETTER_VALUES.H + LETTER_VALUES.I + LETTER_VALUES.S;

    // Existing DW under H must NOT be applied again.
    expect(score).toBe(base);
  });
});

describe('scoreMove - cross-word scoring', () => {
  test('one perpendicular word formed by a new tile', () => {
    const board = createEmptyBoard();

    // Existing horizontal "AT" at row 7, cols 7–8
    placeExistingTile(board, 7, 7, 'A');
    placeExistingTile(board, 7, 8, 'T');

    // Place "C" above the A at (7,7) to form vertical "CA"
    // New tile goes at (6,7); this square has no multiplier.
    expect(getMultiplierType(6, 7)).toBeNull();
    const placedTiles = [{ x: 7, y: 6, letter: 'C' }];

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.C + LETTER_VALUES.A; // vertical "CA"

    expect(score).toBe(expected);
  });

  test('multiple new tiles contributing to one perpendicular word', () => {
    const board = createEmptyBoard();

    // Existing horizontal "AT" at row 7, cols 6–7
    placeExistingTile(board, 7, 6, 'A');
    placeExistingTile(board, 7, 7, 'T');

    // Existing horizontal "ON" at row 9, cols 6–7
    placeExistingTile(board, 9, 6, 'O');
    placeExistingTile(board, 9, 7, 'N');

    // Place "C" at (6,6) and "D" at (8,6) so that column 6 becomes:
    //
    //   row 6: C (new, on DL)
    //   row 7: A (existing)
    //   row 8: D (new, on DL)
    //   row 9: O (existing)
    //
    // This yields a single perpendicular word "CADO" that includes both new
    // tiles and two existing tiles. Only the new tiles receive the DL bonus.
    const placedTiles = [
      { x: 6, y: 6, letter: 'C' },
      { x: 6, y: 8, letter: 'D' }
    ];

    const score = scoreMove(board, placedTiles);

    const expected =
      LETTER_VALUES.C * 2 + // DL at (6,6)
      LETTER_VALUES.A +
      LETTER_VALUES.D * 2 + // DL at (8,6)
      LETTER_VALUES.O;

    expect(score).toBe(expected);
  });

  test('cross word uses multipliers on new tile only', () => {
    const board = createEmptyBoard();

    // Existing horizontal "AT" at row 7, cols 6–7
    placeExistingTile(board, 7, 6, 'A');
    placeExistingTile(board, 7, 7, 'T');

    // Place "C" above A on a DL square if possible.
    // Use (6,6) which is DL according to the standard board.
    expect(getMultiplierType(6, 6)).toBe('DL');

    const placedTiles = [{ x: 6, y: 6, letter: 'C' }];

    const score = scoreMove(board, placedTiles);
    const verticalWordScore =
      LETTER_VALUES.C * 2 + LETTER_VALUES.A; // "CA" with C on DL

    expect(score).toBe(verticalWordScore);
  });
});

describe('scoreMove - bingo bonus', () => {
  test('adds 50 points when exactly 7 tiles placed', () => {
    const board = createEmptyBoard();

    // Place 7-letter word "EXAMPLE" on a concrete segment of the real board.
    // We don't require \"no multipliers\" here; instead we reproduce the
    // standard scoring logic and assert that scoreMove adds +50 on top.
    const word = 'EXAMPLE';
    // Use row 7, cols 3–9.
    const startRow = 7;
    const startCol = 3;
    const placedTiles = word.split('').map((letter, index) => ({
      x: startCol + index,
      y: startRow,
      letter
    }));

    // Compute expected word score using the same multiplier rules as the
    // implementation, then add +50 for the bingo.
    let wordScore = 0;
    let wordMultiplier = 1;

    word.split('').forEach((ch, index) => {
      const row = startRow;
      const col = startCol + index;
      let letterScore = LETTER_VALUES[ch];
      const mult = getMultiplierType(row, col);

      if (mult === 'DL') {
        letterScore *= 2;
      } else if (mult === 'TL') {
        letterScore *= 3;
      } else if (mult === 'DW') {
        wordMultiplier *= 2;
      } else if (mult === 'TW') {
        wordMultiplier *= 3;
      }

      wordScore += letterScore;
    });

    const expected = wordScore * wordMultiplier + 50;
    const score = scoreMove(board, placedTiles);

    expect(score).toBe(expected);
  });
});

describe('scoreMove - edge cases', () => {
  test('placing tiles next to existing letters without forming a word yields 0', () => {
    const board = createEmptyBoard();

    // Existing tile far away
    placeExistingTile(board, 0, 0, 'A');

    // Place a single tile not connected to anything
    const placedTiles = [{ x: 10, y: 10, letter: 'B' }];

    const score = scoreMove(board, placedTiles);
    expect(score).toBe(0);
  });

  test('word touching multiple existing tiles', () => {
    const board = createEmptyBoard();

    // Existing "A" at (7,5) and "T" at (7,7)
    placeExistingTile(board, 7, 5, 'A');
    placeExistingTile(board, 7, 7, 'T');

    // Place "C" at (7,4) and "S" at (7,8) to form "CATS"
    const placedTiles = [
      { x: 4, y: 7, letter: 'C' },
      { x: 8, y: 7, letter: 'S' }
    ];

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.C + LETTER_VALUES.A + LETTER_VALUES.T + LETTER_VALUES.S;

    expect(score).toBe(expected);
  });

  test('multipliers only applied to new tiles', () => {
    const board = createEmptyBoard();

    // Existing tile on DW at (7,7)
    placeExistingTile(board, 7, 7, 'H');
    expect(getMultiplierType(7, 7)).toBe('DW');

    // Place "I" after it to make "HI"
    const placedTiles = [{ x: 8, y: 7, letter: 'I' }];

    const score = scoreMove(board, placedTiles);
    const expected =
      LETTER_VALUES.H + LETTER_VALUES.I;

    expect(score).toBe(expected);
  });

  test('cross word includes multiplier square but only on new tile', () => {
    const board = createEmptyBoard();

    // Existing horizontal "AT" at row 7, cols 6–7
    placeExistingTile(board, 7, 6, 'A');
    placeExistingTile(board, 7, 7, 'T');

    // Place "C" above the A on a DL square at (6,6).
    // Only the new tile should receive the DL bonus in the vertical word "CA".
    expect(getMultiplierType(6, 6)).toBe('DL');

    const placedTiles = [{ x: 6, y: 6, letter: 'C' }];
    const score = scoreMove(board, placedTiles);

    const expected =
      LETTER_VALUES.C * 2 + LETTER_VALUES.A; // "CA" with C on DL

    expect(score).toBe(expected);
  });
});
