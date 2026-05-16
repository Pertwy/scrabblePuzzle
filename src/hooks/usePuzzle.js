import { useCallback, useEffect, useState } from 'react';
import { fetchPuzzle } from '../utils/defaultPuzzle';

/**
 * Load puzzle board/hand for a puzzle id (cloud API or local fallback).
 */
export function usePuzzle(puzzleId) {
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
      setPuzzle(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load puzzle'));
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }, [puzzleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { puzzle, loading, error, reload: load };
}
