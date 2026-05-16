import { validateWord } from './wordValidator';

describe('validateWord', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('accepts word when Scrabble API returns valid', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const result = await validateWord('hello');
    expect(result).toEqual({ valid: true, word: 'HELLO' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://wordotron.com/api/v1/check-word',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ word: 'HELLO' }),
      })
    );
  });

  test('rejects word when Scrabble API returns invalid', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false }),
    });

    const result = await validateWord('zzzqqq');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not a valid Scrabble word/i);
  });
});
