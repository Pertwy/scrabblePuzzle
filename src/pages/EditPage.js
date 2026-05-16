import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ScrabbleGame from '../components/ScrabbleGame/ScrabbleGame';
import { getPuzzle } from '../utils/defaultPuzzle';
import { savePuzzle } from '../utils/puzzleStorage';
import {
  DEFAULT_PUZZLE_ID,
  listPuzzleIds,
} from '../utils/puzzleIds';
import styles from './EditPage.module.scss';
import appStyles from '../App.module.scss';

function EditPage() {
  const puzzleIds = useMemo(() => listPuzzleIds(), []);
  const [selectedId, setSelectedId] = useState(DEFAULT_PUZZLE_ID);

  const puzzle = useMemo(
    () => getPuzzle(selectedId),
    [selectedId]
  );

  const handleSave = (setup) => {
    savePuzzle(selectedId, setup);
  };

  return (
    <div className={appStyles.app}>
      <div className={styles.editHeader}>
        <div className={appStyles.header}>
          <h1>Edit puzzle</h1>
          <p>
            Choose a puzzle, arrange the board and hand, then save. Players open
            that puzzle at{' '}
            <code className={styles.mono}>
              /{selectedId}
            </code>
            . Double-click a board tile to remove it.
          </p>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Puzzle</span>
            <select
              className={styles.select}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {puzzleIds.map((id) => (
                <option key={id} value={id}>
                  Puzzle {id}
                </option>
              ))}
            </select>
          </label>
          <Link className={styles.playLink} to={`/${selectedId}`}>
            Play this puzzle
          </Link>
        </div>
      </div>

      <ScrabbleGame
        key={selectedId}
        mode="edit"
        initialBoard={puzzle.board}
        initialHand={puzzle.hand}
        onSaveSetup={handleSave}
      />
    </div>
  );
}

export default EditPage;
