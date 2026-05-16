import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ScrabbleGame from '../components/ScrabbleGame/ScrabbleGame';
import { getPuzzle } from '../utils/defaultPuzzle';
import {
  DEFAULT_PUZZLE_ID,
  getAdjacentPuzzleId,
  isPuzzleIdAllowed,
  parsePuzzleId,
} from '../utils/puzzleIds';
import pageStyles from './PlayPage.module.scss';
import appStyles from '../App.module.scss';

function PlayPage() {
  const { puzzleId: puzzleIdParam } = useParams();
  const puzzleId = parsePuzzleId(puzzleIdParam);

  const puzzle = useMemo(() => {
    if (!puzzleId || !isPuzzleIdAllowed(puzzleId)) return null;
    return getPuzzle(puzzleId);
  }, [puzzleId]);

  if (!puzzleId || !isPuzzleIdAllowed(puzzleId)) {
    return <Navigate to={`/${DEFAULT_PUZZLE_ID}`} replace />;
  }

  const prevId = getAdjacentPuzzleId(puzzleId, -1);
  const nextId = getAdjacentPuzzleId(puzzleId, 1);

  return (
    <div className={appStyles.app}>
      <div className={appStyles.header}>
        <h1>Scrabble Best Pick</h1>
        <p>Find the best word you can play!</p>
      </div>

      <div className={pageStyles.playPage}>
        <p className={pageStyles.dateLabel}>Puzzle {puzzleId}</p>
        <div className={pageStyles.playRow}>
          <div className={pageStyles.navSide}>
            {prevId && (
              <Link
                to={`/${prevId}`}
                className={pageStyles.navButton}
                aria-label="Previous puzzle"
              >
                ‹
              </Link>
            )}
          </div>

          <div className={pageStyles.mainColumn}>
            <ScrabbleGame
              key={puzzleId}
              mode="play"
              initialBoard={puzzle.board}
              initialHand={puzzle.hand}
            />
          </div>

          <div className={pageStyles.navSide}>
            {nextId && (
              <Link
                to={`/${nextId}`}
                className={pageStyles.navButton}
                aria-label="Next puzzle"
              >
                ›
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayPage;
