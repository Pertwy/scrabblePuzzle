import { useCallback, useEffect, useState } from 'react';
import { createEmptyPuzzle, fetchPuzzle } from '../utils/defaultPuzzle';

/**
 * Load puzzle board/hand for a puzzle id (cloud API or localStorage).
 * @param {string | null} puzzleId
 * @param {{ ifMissing?: 'error' | 'empty' }} [options]
 */
export function usePuzzle(puzzleId, { ifMissing = 'error' } = {}) {
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!puzzleId) {
      setPuzzle(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPuzzle(puzzleId);
      if (data) {
        setPuzzle(data);
      } else if (ifMissing === 'empty') {
        setPuzzle(createEmptyPuzzle());
      } else {
        setPuzzle(null);
        setError(
          new Error('Puzzle not found. Save it from /edit first.')
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load puzzle'));
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }, [puzzleId, ifMissing]);

  useEffect(() => {
    load();
  }, [load]);

  return { puzzle, loading, error, reload: load };
}
