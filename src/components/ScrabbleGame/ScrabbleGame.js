import React, { useState, useCallback, useRef, useEffect } from 'react';
import Board from '../Board/Board';
import Hand from '../Hand/Hand';
import AlphabetTiles from '../AlphabetTiles/AlphabetTiles';
import { calculateTotalScore } from '../../utils/scoring';
import { validatePlayGeometry } from '../../utils/playValidation';
import { validateWords } from '../../utils/wordValidator';
import { LETTER_VALUES } from '../../constants/scrabbleConstants';
import { normalizeBoardFromStorage, normalizeHandFromStorage } from '../../utils/defaultPuzzle';
import { submitLeaderboardEntry, fetchLeaderboard, loadMySubmission } from '../../utils/leaderboardApi';
import LeaderboardModal from '../LeaderboardModal/LeaderboardModal';
import styles from './ScrabbleGame.module.scss';

function buildSerializableSetup(board, hand) {
  const boardData = board.map((row) =>
    row.map((cell) =>
      cell
        ? {
            letter: cell.letter,
            value: cell.value,
            isNew: cell.isNew,
            tileId: cell.tileId,
          }
        : null
    )
  );
  return {
    board: boardData,
    hand: hand.map((tile) => ({
      id: tile.id,
      letter: tile.letter,
      value: tile.value,
    })),
  };
}

/**
 * @param {Object} props
 * @param {'play' | 'edit'} props.mode
 * @param {Array} props.initialBoard
 * @param {Array} props.initialHand
 * @param {(setup: { board: unknown, hand: unknown }) => void} [props.onSaveSetup] — edit mode: persist puzzle (replaces file download)
 * @param {string} [props.puzzleId] — play mode: puzzle id for leaderboard
 * @param {number | null} [props.highScore] — play mode: best score on this puzzle (word hidden)
 * @param {boolean} [props.highScoreLoading]
 * @param {() => void} [props.onLeaderboardUpdate] — called after a score is submitted
 */
function ScrabbleGame({
  mode,
  initialBoard,
  initialHand,
  onSaveSetup,
  puzzleId,
  highScore = null,
  highScoreLoading = false,
  onLeaderboardUpdate,
}) {
  const editMode = mode === 'edit';

  const [board, setBoard] = useState(() =>
    normalizeBoardFromStorage(initialBoard)
  );
  const [hand, setHand] = useState(() =>
    normalizeHandFromStorage(initialHand)
  );
  const [newTilePositions, setNewTilePositions] = useState([]);
  const [usedTileIds, setUsedTileIds] = useState(new Set());
  const [dropTarget, setDropTarget] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [leaderboardModal, setLeaderboardModal] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const fileInputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [ghost, setGhost] = useState(null);
  const [draggingTileId, setDraggingTileId] = useState(null);
  const [draggingFrom, setDraggingFrom] = useState(null);
  const dragRef = useRef(null);
  const dropOnCellRef = useRef(null);
  const dropOnHandRef = useRef(null);
  const dropTargetRef = useRef(null);

  useEffect(() => {
    if (puzzleId && !editMode) {
      setMySubmission(loadMySubmission(puzzleId));
    } else {
      setMySubmission(null);
    }
  }, [puzzleId, editMode]);

  const dropOnCell = useCallback(
    (payload, row, col) => {
      const { tileId, letter, sourceType } = payload;
      const value = parseInt(payload.value, 10);
      const sourceRow =
        payload.sourceRow !== undefined && payload.sourceRow !== null
          ? String(payload.sourceRow)
          : '';
      const sourceCol =
        payload.sourceCol !== undefined && payload.sourceCol !== null
          ? String(payload.sourceCol)
          : '';

      if (sourceType === 'board' && sourceRow !== '' && sourceCol !== '') {
        const srcRow = parseInt(sourceRow, 10);
        const srcCol = parseInt(sourceCol, 10);

        if (srcRow === row && srcCol === col) {
          return;
        }

        if (
          !editMode &&
          board[row][col] &&
          !(board[row][col].tileId === tileId)
        ) {
          setMessage({ type: 'error', text: 'This cell is already occupied!' });
          return;
        }

        const newBoard = board.map((r) => [...r]);
        const tile = newBoard[srcRow][srcCol];

        newBoard[srcRow][srcCol] = null;

        newBoard[row][col] = {
          ...tile,
          isNew: editMode ? tile.isNew : true,
        };

        let newPositions = newTilePositions;
        if (!editMode) {
          newPositions = newTilePositions
            .filter(([r, c]) => !(r === srcRow && c === srcCol))
            .concat([[row, col]]);
        }

        setBoard(newBoard);
        if (!editMode) {
          setNewTilePositions(newPositions);
          const score = calculateTotalScore(newBoard, newPositions);
          setCurrentScore(score);
        }
        setMessage({ type: '', text: '' });
        return;
      }

      if (sourceType === 'hand') {
        if (!editMode && board[row][col]) {
          setMessage({ type: 'error', text: 'This cell is already occupied!' });
          return;
        }

        if (!editMode && usedTileIds.has(tileId)) {
          setMessage({
            type: 'error',
            text: 'This tile has already been placed!',
          });
          return;
        }

        const tileIndex = hand.findIndex((t) => t.id === tileId);
        if (tileIndex === -1) {
          return;
        }

        const newBoard = board.map((r) => [...r]);
        newBoard[row][col] = {
          letter,
          value,
          isNew: editMode ? false : true,
          tileId,
        };

        if (!editMode) {
          const newPositions = [...newTilePositions, [row, col]];
          setNewTilePositions(newPositions);
          setUsedTileIds((prev) => new Set([...prev, tileId]));
          const score = calculateTotalScore(newBoard, newPositions);
          setCurrentScore(score);
        }

        setBoard(newBoard);
        setMessage({ type: '', text: '' });
        return;
      }

      if (sourceType === 'alphabet') {
        if (board[row][col] && !editMode) {
          setMessage({ type: 'error', text: 'This cell is already occupied!' });
          return;
        }

        const newBoard = board.map((r) => [...r]);
        const newTileId = `alphabet-${letter}-${Date.now()}`;
        newBoard[row][col] = {
          letter,
          value,
          isNew: false,
          tileId: newTileId,
        };

        if (!editMode) {
          const newPositions = [...newTilePositions, [row, col]];
          setNewTilePositions(newPositions);
          const score = calculateTotalScore(newBoard, newPositions);
          setCurrentScore(score);
        }

        setBoard(newBoard);
        setMessage({ type: '', text: '' });
        return;
      }
    },
    [board, hand, newTilePositions, usedTileIds, editMode]
  );

  const dropOnHand = useCallback(
    (payload) => {
      const { sourceType } = payload;
      const sourceRow =
        payload.sourceRow !== undefined && payload.sourceRow !== null
          ? String(payload.sourceRow)
          : '';
      const sourceCol =
        payload.sourceCol !== undefined && payload.sourceCol !== null
          ? String(payload.sourceCol)
          : '';

      if (sourceType === 'board' && sourceRow !== '' && sourceCol !== '') {
        const srcRow = parseInt(sourceRow, 10);
        const srcCol = parseInt(sourceCol, 10);
        const tile = board[srcRow][srcCol];

        if (tile && (editMode || tile.isNew)) {
          const newBoard = board.map((r) => [...r]);
          newBoard[srcRow][srcCol] = null;

          let newPositions = newTilePositions;
          if (!editMode) {
            newPositions = newTilePositions.filter(
              ([r, c]) => !(r === srcRow && c === srcCol)
            );
          }

          const newUsedTileIds = new Set(usedTileIds);
          if (tile.tileId && tile.tileId.startsWith('tile-')) {
            newUsedTileIds.delete(tile.tileId);
          }

          setBoard(newBoard);
          if (!editMode) {
            setNewTilePositions(newPositions);
            setUsedTileIds(newUsedTileIds);
            const score = calculateTotalScore(newBoard, newPositions);
            setCurrentScore(score);
          }
          setMessage({ type: '', text: '' });
        }
        return;
      }

      if (sourceType === 'alphabet' && editMode) {
        const letter = payload.letter;
        const value = parseInt(payload.value, 10);
        if (hand.length < 7) {
          const newTileId = `tile-${Date.now()}`;
          setHand((prev) => [...prev, { id: newTileId, letter, value }]);
          setMessage({ type: '', text: '' });
        } else {
          setMessage({
            type: 'error',
            text: 'Hand is full! Maximum 7 tiles.',
          });
        }
      }
    },
    [board, newTilePositions, usedTileIds, editMode, hand]
  );

  const handleViewLeaderboard = async () => {
    if (!puzzleId || !mySubmission) return;

    setIsLoadingLeaderboard(true);
    setMessage({ type: '', text: '' });
    try {
      const entries = await fetchLeaderboard(puzzleId);
      setLeaderboardModal({
        word: mySubmission.word,
        score: mySubmission.score,
        entries,
        revisit: true,
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      setMessage({
        type: 'error',
        text: 'Could not load leaderboard. Try again.',
      });
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleSubmit = async () => {
    const geometry = validatePlayGeometry(board, newTilePositions);
    if (!geometry.valid) {
      setMessage({ type: 'error', text: geometry.error });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: 'info', text: 'Checking Scrabble dictionary...' });

    try {
      const validation = await validateWords(geometry.words);

      if (validation.valid) {
        const finalScore = calculateTotalScore(board, newTilePositions);
        const playedWord = geometry.word.toUpperCase();

        if (puzzleId) {
          try {
            const entries = await submitLeaderboardEntry(
              puzzleId,
              playedWord,
              finalScore
            );
            setLeaderboardModal({
              word: playedWord,
              score: finalScore,
              entries,
            });
            setMySubmission(loadMySubmission(puzzleId));
            onLeaderboardUpdate?.();
            setMessage({ type: '', text: '' });
          } catch (lbError) {
            console.error('Leaderboard error:', lbError);
            // The result is still saved locally (saveMySubmission runs before
            // the network call), so keep the player's progress visible.
            setMySubmission(loadMySubmission(puzzleId));
            setMessage({
              type: 'success',
              text: `Valid word! Score: ${finalScore} (leaderboard unavailable)`,
            });
          }
        } else {
          setMessage({
            type: 'success',
            text: `Success! "${playedWord}" is valid. Score: ${finalScore}`,
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: validation.errors?.join(' ') || 'Invalid word!',
        });
      }
    } catch (error) {
      console.error('Error submitting:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while validating your word.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    const newBoard = board.map((row) =>
      row.map((cell) => (cell && cell.isNew ? null : cell))
    );

    setBoard(newBoard);
    setNewTilePositions([]);
    setUsedTileIds(new Set());
    setCurrentScore(0);
    setDropTarget(null);
    setMessage({ type: '', text: '' });
  };

  const handleClearBoard = () => {
    setBoard(board.map((row) => row.map(() => null)));
    setNewTilePositions([]);
    setUsedTileIds(new Set());
    setCurrentScore(0);
    setDropTarget(null);
    setMessage({ type: '', text: '' });
  };

  const handleRemoveBoardTile = useCallback((row, col) => {
    if (!board[row][col]) return;
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = null;
    setBoard(newBoard);
    setMessage({ type: '', text: '' });
  }, [board]);

  dropOnCellRef.current = dropOnCell;
  dropOnHandRef.current = dropOnHand;

  const handleTilePointerDown = useCallback((e, payload) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    dragRef.current = payload;
    setDragging(true);
    setDraggingTileId(payload.tileId);
    setDraggingFrom(
      payload.sourceType === 'board' &&
        payload.sourceRow !== undefined &&
        payload.sourceRow !== null
        ? [payload.sourceRow, payload.sourceCol]
        : null
    );
    setGhost({
      x: e.clientX,
      y: e.clientY,
      letter: payload.letter,
      value: payload.value,
    });
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;

    const updateDropTarget = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const cell = el && el.closest('[data-cell]');
      let next = null;
      if (cell) {
        next = [
          parseInt(cell.getAttribute('data-row'), 10),
          parseInt(cell.getAttribute('data-col'), 10),
        ];
      }
      const prev = dropTargetRef.current;
      if (
        (prev === null && next === null) ||
        (prev &&
          next &&
          prev[0] === next[0] &&
          prev[1] === next[1])
      ) {
        return;
      }
      dropTargetRef.current = next;
      setDropTarget(next);
    };

    const handleMove = (e) => {
      e.preventDefault();
      const { clientX: x, clientY: y } = e;
      setGhost((g) => (g ? { ...g, x, y } : g));
      updateDropTarget(x, y);
    };

    const handleUp = (e) => {
      const { clientX: x, clientY: y } = e;
      const payload = dragRef.current;
      const el = document.elementFromPoint(x, y);
      if (payload && el) {
        const cell = el.closest('[data-cell]');
        const handArea = el.closest('[data-hand]');
        if (cell) {
          dropOnCellRef.current(
            payload,
            parseInt(cell.getAttribute('data-row'), 10),
            parseInt(cell.getAttribute('data-col'), 10)
          );
        } else if (handArea) {
          dropOnHandRef.current(payload);
        }
      }
      dragRef.current = null;
      dropTargetRef.current = null;
      setDragging(false);
      setGhost(null);
      setDraggingTileId(null);
      setDraggingFrom(null);
      setDropTarget(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging]);

  const handleHandLetterChange = useCallback((tileId, letter) => {
    const L = typeof letter === 'string' ? letter.toUpperCase() : '';
    if (LETTER_VALUES[L] === undefined) return;
    setHand((prev) =>
      prev.map((t) =>
        t.id === tileId ? { ...t, letter: L, value: LETTER_VALUES[L] } : t
      )
    );
  }, []);

  const handleSaveSetup = async () => {
    const setup = buildSerializableSetup(board, hand);

    if (onSaveSetup) {
      setIsSaving(true);
      setMessage({ type: '', text: '' });
      try {
        await onSaveSetup(setup);
        setMessage({
          type: 'success',
          text: 'Puzzle saved.',
        });
      } catch {
        setMessage({
          type: 'error',
          text: 'Failed to save puzzle. Try again.',
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const dataStr = JSON.stringify(setup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scrabble-setup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({ type: 'success', text: 'Setup saved to scrabble-setup.json' });
  };

  const handleImportSetup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const setup = JSON.parse(e.target.result);

        if (!setup.board || !setup.hand) {
          setMessage({ type: 'error', text: 'Invalid setup file format.' });
          return;
        }

        const restoredBoard = normalizeBoardFromStorage(setup.board);
        const restoredHand = normalizeHandFromStorage(setup.hand);

        setBoard(restoredBoard);
        setHand(restoredHand);
        setNewTilePositions([]);
        setUsedTileIds(new Set());
        setCurrentScore(0);
        setMessage({ type: 'success', text: 'Setup imported successfully!' });
      } catch (error) {
        console.error('Error importing setup:', error);
        setMessage({ type: 'error', text: 'Error reading setup file.' });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.gameContainer}>
      {editMode ? (
        <div className={styles.scoreSection}>Edit Mode</div>
      ) : (
        <div className={styles.statusBar}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Score</span>
            <span className={styles.statValue}>{currentScore}</span>
          </div>
          {puzzleId && (
            <>
              <span className={styles.statDivider} aria-hidden="true" />
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Best</span>
                <span className={styles.statValue}>
                  {highScoreLoading
                    ? '…'
                    : highScore != null
                      ? highScore
                      : '—'}
                </span>
              </div>
              {mySubmission && (
                <>
                  <span className={styles.statDivider} aria-hidden="true" />
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>You</span>
                    <span
                      className={`${styles.statValue} ${styles.statValueYou}`}
                    >
                      {mySubmission.score}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.leaderboardButton}
                    onClick={handleViewLeaderboard}
                    disabled={isLoadingLeaderboard}
                  >
                    {isLoadingLeaderboard ? 'Loading…' : 'Leaderboard'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {editMode && (
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.button} ${styles.save}`}
            onClick={handleSaveSetup}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save puzzle'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.clear}`}
            onClick={handleClearBoard}
          >
            Clear board
          </button>
          <label className={`${styles.button} ${styles.import}`}>
            Import Setup
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSetup}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      <Board
        board={board}
        onTilePointerDown={handleTilePointerDown}
        dropTarget={dropTarget}
        draggingFrom={draggingFrom}
        editMode={editMode}
        onTileRemove={editMode ? handleRemoveBoardTile : undefined}
      />

      {editMode && (
        <AlphabetTiles onTilePointerDown={handleTilePointerDown} />
      )}

      <Hand
        tiles={hand}
        onTilePointerDown={handleTilePointerDown}
        usedTileIds={editMode ? new Set() : usedTileIds}
        draggingTileId={draggingTileId}
        editMode={editMode}
        onHandLetterChange={editMode ? handleHandLetterChange : undefined}
      />

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {!editMode && (
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.button} ${styles.submit}`}
            onClick={handleSubmit}
            disabled={isSubmitting || newTilePositions.length === 0}
          >
            {isSubmitting ? 'Validating...' : 'Submit'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.clear}`}
            onClick={handleClear}
            disabled={newTilePositions.length === 0}
          >
            Clear
          </button>
        </div>
      )}

      {leaderboardModal && (
        <LeaderboardModal
          word={leaderboardModal.word}
          score={leaderboardModal.score}
          entries={leaderboardModal.entries}
          revisit={leaderboardModal.revisit}
          onClose={() => setLeaderboardModal(null)}
        />
      )}

      {ghost && (
        <div
          className={styles.dragGhost}
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          {ghost.letter}
          <span className={styles.dragGhostValue}>{ghost.value}</span>
        </div>
      )}
    </div>
  );
}

export default ScrabbleGame;
