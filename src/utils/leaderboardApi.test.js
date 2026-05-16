import {
  fetchHighScore,
  fetchLeaderboard,
  submitLeaderboardEntry,
} from './leaderboardApi';

const originalEnv = process.env;

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('leaderboardApi local', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, REACT_APP_PUZZLES_API_URL: '' };
  });

  test('tracks high score and top entries locally', async () => {
    await submitLeaderboardEntry('1', 'hello', 42);
    await submitLeaderboardEntry('1', 'world', 30);
    await expect(fetchHighScore('1')).resolves.toBe(42);
    const board = await fetchLeaderboard('1');
    expect(board).toHaveLength(2);
    expect(board[0]).toEqual({ word: 'HELLO', score: 42 });
  });

  test('keeps best score per word', async () => {
    await submitLeaderboardEntry('1', 'quiz', 20);
    await submitLeaderboardEntry('1', 'quiz', 15);
    const board = await fetchLeaderboard('1');
    expect(board).toHaveLength(1);
    expect(board[0].score).toBe(20);
  });
});

describe('leaderboardApi cloud', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REACT_APP_PUZZLES_API_URL: 'https://api.example.com',
    };
  });

  test('fetchHighScore', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ highScore: 99 }),
    });
    await expect(fetchHighScore('2')).resolves.toBe(99);
  });

  test('submitLeaderboardEntry returns entries', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [{ word: 'CAT', score: 10 }],
        }),
      });
    const entries = await submitLeaderboardEntry('1', 'cat', 10);
    expect(entries).toEqual([{ word: 'CAT', score: 10 }]);
  });
});
