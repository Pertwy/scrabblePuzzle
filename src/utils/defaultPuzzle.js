import { LETTER_VALUES } from '../constants/scrabbleConstants';
import { loadPuzzle } from './puzzleStorage';

export function createEmptyBoard() {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));
}

/** Default board layout (~10 words) when no saved puzzle exists. */
export function createDefaultBoard() {
  const board = createEmptyBoard();

  const hello = ['H', 'E', 'L', 'L', 'O'];
  hello.forEach((letter, i) => {
    board[7][5 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-hello-${i}`,
    };
  });

  const help = ['H', 'E', 'L', 'P'];
  help.forEach((letter, i) => {
    if (i === 0) return;
    board[4 + i][5] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-help-${i}`,
    };
  });

  const pear = ['P', 'E', 'A', 'R'];
  pear.forEach((letter, i) => {
    if (i === 0) return;
    board[4][2 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-pear-${i}`,
    };
  });

  const ear = ['E', 'A', 'R'];
  ear.forEach((letter, i) => {
    if (i === 0) return;
    board[5 + i][3] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-ear-${i}`,
    };
  });

  const art = ['A', 'R', 'T'];
  art.forEach((letter, i) => {
    if (i === 0) return;
    board[6][4 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-art-${i}`,
    };
  });

  const low = ['L', 'O', 'W'];
  low.forEach((letter, i) => {
    if (i === 0) return;
    board[5 + i][7] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-low-${i}`,
    };
  });

  const lot = ['L', 'O', 'T'];
  lot.forEach((letter, i) => {
    if (i === 0) return;
    board[5 + i][8] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-lot-${i}`,
    };
  });

  const old = ['O', 'L', 'D'];
  old.forEach((letter, i) => {
    if (i === 0) return;
    board[9][6 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-old-${i}`,
    };
  });

  const tow = ['T', 'O', 'W'];
  tow.forEach((letter, i) => {
    if (i === 0) return;
    board[10][9 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-tow-${i}`,
    };
  });

  const owl = ['O', 'W', 'L'];
  owl.forEach((letter, i) => {
    if (i === 0) return;
    board[9 + i][10] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-owl-${i}`,
    };
  });

  const wall = ['W', 'A', 'L', 'L'];
  wall.forEach((letter, i) => {
    if (i === 0) return;
    board[11][9 + i] = {
      letter,
      value: LETTER_VALUES[letter],
      isNew: false,
      tileId: `board-wall-${i}`,
    };
  });

  return board;
}

export function createDefaultHand() {
  return [
    { id: 'tile-1', letter: 'A', value: LETTER_VALUES.A },
    { id: 'tile-2', letter: 'B', value: LETTER_VALUES.B },
    { id: 'tile-3', letter: 'C', value: LETTER_VALUES.C },
    { id: 'tile-4', letter: 'D', value: LETTER_VALUES.D },
    { id: 'tile-5', letter: 'E', value: LETTER_VALUES.E },
    { id: 'tile-6', letter: 'F', value: LETTER_VALUES.F },
    { id: 'tile-7', letter: 'G', value: LETTER_VALUES.G },
  ];
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

/** Puzzle by id: saved layout or built-in default. */
export function getPuzzle(puzzleId) {
  const stored = loadPuzzle(puzzleId);
  if (stored) {
    return {
      board: normalizeBoardFromStorage(stored.board),
      hand: normalizeHandFromStorage(stored.hand),
    };
  }
  return {
    board: createDefaultBoard(),
    hand: createDefaultHand(),
  };
}
