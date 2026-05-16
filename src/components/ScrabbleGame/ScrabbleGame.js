import React, { useState, useCallback, useRef } from 'react';
import Board from '../Board/Board';
import Hand from '../Hand/Hand';
import AlphabetTiles from '../AlphabetTiles/AlphabetTiles';
import { calculateTotalScore } from '../../utils/scoring';
import { validatePlayGeometry } from '../../utils/playValidation';
import { validateWord } from '../../utils/wordValidator';
import { LETTER_VALUES } from '../../constants/scrabbleConstants';
import { normalizeBoardFromStorage, normalizeHandFromStorage } from '../../utils/defaultPuzzle';
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
 */
function ScrabbleGame({ mode, initialBoard, initialHand, onSaveSetup }) {
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
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback(
    (e, row, col) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const sourceType = e.dataTransfer.getData('sourceType');
      if (!board[row][col] || sourceType === 'board') {
        setDropTarget([row, col]);
      }
    },
    [board]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e, row, col) => {
      e.preventDefault();
      setDropTarget(null);

      const tileId = e.dataTransfer.getData('tileId');
      const letter = e.dataTransfer.getData('letter');
      const value = parseInt(e.dataTransfer.getData('value'), 10);
      const sourceType = e.dataTransfer.getData('sourceType');
      const sourceRow = e.dataTransfer.getData('sourceRow');
      const sourceCol = e.dataTransfer.getData('sourceCol');

      if (sourceType === 'board' && sourceRow && sourceCol) {
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

  const handleHandDrop = useCallback(
    (e) => {
      e.preventDefault();
      const sourceType = e.dataTransfer.getData('sourceType');
      const sourceRow = e.dataTransfer.getData('sourceRow');
      const sourceCol = e.dataTransfer.getData('sourceCol');

      if (sourceType === 'board' && sourceRow && sourceCol) {
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
        const letter = e.dataTransfer.getData('letter');
        const value = parseInt(e.dataTransfer.getData('value'), 10);
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

  const handleSubmit = async () => {
    const geometry = validatePlayGeometry(board, newTilePositions);
    if (!geometry.valid) {
      setMessage({ type: 'error', text: geometry.error });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: 'info', text: 'Checking Scrabble dictionary...' });

    try {
      const validation = await validateWord(geometry.word);

      if (validation.valid) {
        const finalScore = calculateTotalScore(board, newTilePositions);
        setMessage({
          type: 'success',
          text: `Success! "${geometry.word}" is valid. Score: ${finalScore}`,
        });
      } else {
        setMessage({
          type: 'error',
          text: validation.error || 'Invalid word!',
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

  const handleTileDragStart = useCallback(() => {}, []);

  const handleHandLetterChange = useCallback((tileId, letter) => {
    const L = typeof letter === 'string' ? letter.toUpperCase() : '';
    if (LETTER_VALUES[L] === undefined) return;
    setHand((prev) =>
      prev.map((t) =>
        t.id === tileId ? { ...t, letter: L, value: LETTER_VALUES[L] } : t
      )
    );
  }, []);

  const handleSaveSetup = () => {
    const setup = buildSerializableSetup(board, hand);

    if (onSaveSetup) {
      onSaveSetup(setup);
      setMessage({
        type: 'success',
        text: 'Puzzle saved.',
      });
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
      <div className={styles.scoreSection}>
        {editMode ? 'Edit Mode' : `Current Score: ${currentScore}`}
      </div>

      {editMode && (
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.button} ${styles.save}`}
            onClick={handleSaveSetup}
          >
            Save puzzle
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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        dropTarget={dropTarget}
        editMode={editMode}
        onTileRemove={editMode ? handleRemoveBoardTile : undefined}
      />

      {editMode && <AlphabetTiles onDragStart={handleTileDragStart} />}

      <Hand
        tiles={hand}
        onDragStart={handleTileDragStart}
        usedTileIds={editMode ? new Set() : usedTileIds}
        onDrop={handleHandDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
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
    </div>
  );
}

export default ScrabbleGame;
