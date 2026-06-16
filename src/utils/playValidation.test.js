import { LETTER_VALUES } from '../constants/scrabbleConstants';
import {
  areNewTilesInSingleLine,
  getWordsIncludingNewTiles,
  validatePlayGeometry,
} from './playValidation';

function createEmptyBoard() {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));
}

function placeTile(board, row, col, letter, isNew = true) {
  board[row][col] = {
    letter,
    value: LETTER_VALUES[letter],
    isNew,
    tileId: `tile-${row}-${col}`,
  };
}

describe('areNewTilesInSingleLine', () => {
  test('empty is false', () => {
    expect(areNewTilesInSingleLine([])).toBe(false);
  });

  test('single tile is valid', () => {
    expect(areNewTilesInSingleLine([[7, 7]])).toBe(true);
  });

  test('horizontal line is valid', () => {
    expect(
      areNewTilesInSingleLine([
        [7, 5],
        [7, 6],
        [7, 7],
      ])
    ).toBe(true);
  });

  test('vertical line is valid', () => {
    expect(
      areNewTilesInSingleLine([
        [5, 7],
        [6, 7],
        [7, 7],
      ])
    ).toBe(true);
  });

  test('L-shape is invalid', () => {
    expect(
      areNewTilesInSingleLine([
        [7, 5],
        [7, 6],
        [8, 6],
      ])
    ).toBe(false);
  });
});

describe('validatePlayGeometry', () => {
  test('rejects L-shaped placement', () => {
    const board = createEmptyBoard();
    placeTile(board, 7, 5, 'C');
    placeTile(board, 7, 6, 'A');
    placeTile(board, 8, 6, 'T');

    const result = validatePlayGeometry(board, [
      [7, 5],
      [7, 6],
      [8, 6],
    ]);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/row or one column/i);
  });

  test('accepts single horizontal word', () => {
    const board = createEmptyBoard();
    placeTile(board, 7, 5, 'C');
    placeTile(board, 7, 6, 'A');
    placeTile(board, 7, 7, 'T');

    const result = validatePlayGeometry(board, [
      [7, 5],
      [7, 6],
      [7, 7],
    ]);

    expect(result).toEqual({ valid: true, word: 'CAT', words: ['CAT'] });
  });

  test('accepts horizontal word that extends a vertical cross-word', () => {
    const board = createEmptyBoard();
    placeTile(board, 5, 7, 'C', false);
    placeTile(board, 6, 7, 'A', false);
    placeTile(board, 7, 7, 'R', false);
    placeTile(board, 8, 7, 'S');
    placeTile(board, 8, 8, 'T');
    placeTile(board, 8, 9, 'A');
    placeTile(board, 8, 10, 'R');
    placeTile(board, 8, 11, 'T');

    const result = validatePlayGeometry(board, [
      [8, 7],
      [8, 8],
      [8, 9],
      [8, 10],
      [8, 11],
    ]);

    expect(result).toEqual({
      valid: true,
      word: 'START',
      words: ['START', 'CARS'],
    });
  });

  test('rejects play that forms two words on a straight line', () => {
    const board = createEmptyBoard();
    placeTile(board, 7, 6, 'A', false);
    placeTile(board, 7, 8, 'T', false);
    placeTile(board, 6, 6, 'C');
    placeTile(board, 6, 8, 'S');

    const words = getWordsIncludingNewTiles(board, [
      [6, 6],
      [6, 8],
    ]);
    expect(words.length).toBe(2);

    const result = validatePlayGeometry(board, [
      [6, 6],
      [6, 8],
    ]);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/contiguous word/i);
  });
});
