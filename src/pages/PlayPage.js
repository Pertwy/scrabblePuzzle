import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ScrabbleGame from '../components/ScrabbleGame/ScrabbleGame';
import { usePuzzle } from '../hooks/usePuzzle';
import { useLeaderboardHighScore } from '../hooks/useLeaderboardHighScore';
import { usePublishedIds } from '../hooks/usePublishedIds';
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
  const { puzzle, loading, error } = usePuzzle(puzzleId);
  const { ids: publishedIds } = usePublishedIds();
  const {
    highScore,
    loading: highScoreLoading,
    reload: reloadHighScore,
  } = useLeaderboardHighScore(puzzleId);

  if (!puzzleId || !isPuzzleIdAllowed(puzzleId)) {
    return <Navigate to={`/${DEFAULT_PUZZLE_ID}`} replace />;
  }

  const prevId = getAdjacentPuzzleId(puzzleId, -1, publishedIds);
  const nextId = getAdjacentPuzzleId(puzzleId, 1, publishedIds);

  return (
    <div className={appStyles.app}>
      <div className={appStyles.header}>
        <h1>
          Scrabble <em>Best Pick</em>
        </h1>
      </div>

      <div className={pageStyles.playPage}>
        <p className={pageStyles.dateLabel}>Puzzle {puzzleId}</p>

        {loading && (
          <p className={appStyles.statusMessage}>Loading puzzle…</p>
        )}
        {error && (
          <p className={`${appStyles.statusMessage} ${appStyles.statusError}`}>
            {error.message ||
              'Could not load puzzle. Check your connection and API settings.'}
          </p>
        )}

        {!loading && !error && puzzle && (
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
                puzzleId={puzzleId}
                initialBoard={puzzle.board}
                initialHand={puzzle.hand}
                highScore={highScore}
                highScoreLoading={highScoreLoading}
                onLeaderboardUpdate={reloadHighScore}
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
        )}
      </div>
    </div>
  );
}

export default PlayPage;
