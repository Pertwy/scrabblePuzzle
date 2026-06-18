import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import ScrabbleGame from '../components/ScrabbleGame/ScrabbleGame';
import { usePuzzle } from '../hooks/usePuzzle';
import { createEmptyPuzzle } from '../utils/defaultPuzzle';
import {
  createDraft,
  deleteDraft,
  isDraftPuzzleId,
  isPublishedPuzzleId,
  publishDraft,
  savePuzzle,
} from '../utils/puzzleApi';
import styles from './EditPage.module.scss';
import appStyles from '../App.module.scss';

function EditPuzzlePage() {
  const { editId } = useParams();
  const navigate = useNavigate();

  const isNew = editId === 'new';
  const isValid =
    isNew || isDraftPuzzleId(editId) || isPublishedPuzzleId(editId);
  const isPublished = !isNew && isPublishedPuzzleId(editId);
  const isDraftContext = isNew || isDraftPuzzleId(editId);

  // For drafts, track the persisted draft id (set after the first save of a
  // brand-new puzzle so subsequent saves update the same record).
  const [draftId, setDraftId] = useState(
    isDraftPuzzleId(editId) ? editId : null
  );

  const emptyPuzzle = useMemo(() => createEmptyPuzzle(), []);
  const {
    puzzle: loadedPuzzle,
    loading: hookLoading,
    error,
  } = usePuzzle(isNew ? null : editId, { ifMissing: 'error' });

  const puzzle = isNew ? emptyPuzzle : loadedPuzzle;
  const loading = isNew ? false : hookLoading;

  if (!isValid) {
    return <Navigate to="/edit" replace />;
  }

  const handleSave = async (setup) => {
    if (isPublished) {
      await savePuzzle(editId, setup);
      return;
    }

    if (draftId) {
      await savePuzzle(draftId, setup);
      return;
    }

    const { puzzleId: newId } = await createDraft(setup);
    setDraftId(newId);
    navigate(`/edit/${newId}`, { replace: true });
  };

  const handlePublish = async (setup) => {
    let id = draftId;
    if (id) {
      await savePuzzle(id, setup);
    } else {
      const created = await createDraft(setup);
      id = created.puzzleId;
      setDraftId(id);
    }

    await publishDraft(id);
    navigate('/edit');
  };

  const handleDiscard = async () => {
    if (!draftId) {
      navigate('/edit');
      return;
    }
    try {
      await deleteDraft(draftId);
    } finally {
      navigate('/edit');
    }
  };

  const heading = isPublished
    ? `Puzzle ${editId}`
    : isNew
      ? 'New puzzle'
      : 'Draft';

  return (
    <div className={appStyles.app}>
      <div className={styles.editHeader}>
        <div className={appStyles.header}>
          <span className={appStyles.eyebrow}>Puzzle Studio</span>
          <h1>
            Edit <em>{heading}</em>
          </h1>
          <p>
            Arrange the board and hand. Double-click a board tile to remove it.
            {isDraftContext
              ? ' Save your progress as a draft, then publish to assign the next puzzle number.'
              : ' Saving updates the live puzzle.'}
          </p>
        </div>
        <div className={styles.toolbar}>
          <Link className={styles.playLink} to="/edit">
            Back to puzzles
          </Link>
          {isPublished && (
            <Link className={styles.playLink} to={`/${editId}`}>
              Play this puzzle
            </Link>
          )}
          {isDraftContext && draftId && (
            <button
              type="button"
              className={styles.select}
              onClick={handleDiscard}
            >
              Discard draft
            </button>
          )}
        </div>
      </div>

      {loading && <p className={appStyles.statusMessage}>Loading puzzle…</p>}
      {error && (
        <p className={`${appStyles.statusMessage} ${appStyles.statusError}`}>
          {error.message ||
            'Could not load puzzle. Check your connection and API settings.'}
        </p>
      )}
      {!loading && !error && puzzle && (
        <ScrabbleGame
          key={editId}
          mode="edit"
          initialBoard={puzzle.board}
          initialHand={puzzle.hand}
          onSaveSetup={handleSave}
          onPublish={isDraftContext ? handlePublish : undefined}
          saveLabel={isDraftContext ? 'Save draft' : 'Save puzzle'}
        />
      )}
    </div>
  );
}

export default EditPuzzlePage;
