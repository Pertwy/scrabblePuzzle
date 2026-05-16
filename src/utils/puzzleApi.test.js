import { loadPuzzle, savePuzzle, isCloudPuzzleStorageEnabled } from './puzzleApi';

const originalEnv = process.env;

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

describe('puzzleApi local fallback', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, REACT_APP_PUZZLES_API_URL: '' };
  });

  test('save and load from localStorage when API URL unset', async () => {
    const setup = { board: [[null]], hand: [{ id: 't1', letter: 'A', value: 1 }] };
    await savePuzzle('1', setup);
    await expect(loadPuzzle('1')).resolves.toEqual(setup);
    expect(isCloudPuzzleStorageEnabled()).toBe(false);
  });
});

describe('puzzleApi cloud', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REACT_APP_PUZZLES_API_URL: 'https://api.example.com',
      REACT_APP_PUZZLES_EDIT_KEY: 'secret',
    };
  });

  test('loadPuzzle returns null on 404', async () => {
    fetch.mockResolvedValue({ status: 404, ok: false });
    await expect(loadPuzzle('1')).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/puzzles/1');
  });

  test('loadPuzzle returns data on 200', async () => {
    const setup = { board: [], hand: [] };
    fetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => setup,
    });
    await expect(loadPuzzle('2')).resolves.toEqual(setup);
  });

  test('savePuzzle sends PUT with edit key', async () => {
    const setup = {
      board: Array(15).fill(null).map(() => Array(15).fill(null)),
      hand: [],
    };
    fetch.mockResolvedValue({ status: 200, ok: true });
    await savePuzzle('1', setup);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/puzzles/1',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Edit-Key': 'secret',
        }),
      })
    );
  });
});
