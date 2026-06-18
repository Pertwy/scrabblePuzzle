import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Board from '../components/Board/Board';
import { listPuzzles } from '../utils/puzzleApi';
import styles from './EditGalleryPage.module.scss';
import appStyles from '../App.module.scss';

function sortPuzzles(puzzles) {
  const drafts = puzzles
    .filter((p) => p.status === 'draft')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const published = puzzles
    .filter((p) => p.status === 'published')
    .map((p) => ({
      ...p,
      number:
        typeof p.number === 'number' ? p.number : Number(p.puzzleId),
    }))
    .sort((a, b) => b.number - a.number);

  return { drafts, published };
}

function EditGalleryPage() {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPuzzles();
      setPuzzles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load puzzles')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { drafts, published } = sortPuzzles(puzzles);

  return (
    <div className={appStyles.app}>
      <div className={appStyles.header}>
        <h1>
          Edit <em>puzzles</em>
        </h1>
        <p>
          Pick a puzzle to edit, resume a draft, or start a new one. Drafts are
          published to the next available puzzle number.
        </p>
      </div>

      {loading && (
        <p className={appStyles.statusMessage}>Loading puzzles…</p>
      )}
      {error && (
        <p className={`${appStyles.statusMessage} ${appStyles.statusError}`}>
          {error.message ||
            'Could not load puzzles. Check your connection and API settings.'}
        </p>
      )}

      {!loading && !error && (
        <div className={styles.grid}>
          <Link
            to="/edit/new"
            className={`${styles.tile} ${styles.newTile}`}
            aria-label="Create a new puzzle"
          >
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span className={styles.newLabel}>New puzzle</span>
          </Link>

          {drafts.map((puzzle) => (
            <Link
              key={puzzle.puzzleId}
              to={`/edit/${puzzle.puzzleId}`}
              className={styles.tile}
            >
              <div className={styles.thumb}>
                <Board board={puzzle.board} thumbnail />
              </div>
              <span className={`${styles.caption} ${styles.draftCaption}`}>
                <span className={styles.draftBadge}>Draft</span>
              </span>
            </Link>
          ))}

          {published.map((puzzle) => (
            <Link
              key={puzzle.puzzleId}
              to={`/edit/${puzzle.puzzleId}`}
              className={styles.tile}
            >
              <div className={styles.thumb}>
                <Board board={puzzle.board} thumbnail />
              </div>
              <span className={styles.caption}>Puzzle {puzzle.number}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default EditGalleryPage;
