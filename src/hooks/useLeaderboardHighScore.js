import { useCallback, useEffect, useState } from 'react';
import { fetchHighScore } from '../utils/leaderboardApi';

export function useLeaderboardHighScore(puzzleId) {
  const [highScore, setHighScore] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!puzzleId) {
      setHighScore(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const score = await fetchHighScore(puzzleId);
      setHighScore(score);
    } catch {
      setHighScore(null);
    } finally {
      setLoading(false);
    }
  }, [puzzleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { highScore, loading, reload };
}
