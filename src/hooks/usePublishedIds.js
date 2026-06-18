import { useEffect, useState } from 'react';
import { listPuzzles } from '../utils/puzzleApi';

/**
 * Load the catalog of published puzzle ids (numeric strings, ascending).
 * Used to drive prev/next navigation and the default landing page.
 */
export function usePublishedIds() {
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const puzzles = await listPuzzles();
        const published = puzzles
          .filter((p) => p.status === 'published')
          .map((p) =>
            typeof p.number === 'number' ? p.number : Number(p.puzzleId)
          )
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b)
          .map(String);
        if (active) setIds(published);
      } catch {
        if (active) setIds([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { ids, loading };
}
