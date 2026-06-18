import React, { useEffect, useMemo, useState } from 'react';
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
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    if (!isInfoOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsInfoOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInfoOpen]);

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

  const editControls = (
    <>
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
    </>
  );

  return (
    <div className={appStyles.app}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label="Information"
        aria-expanded={isInfoOpen}
        onClick={() => setIsInfoOpen(true)}
      >
        i
      </button>

      {isInfoOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsInfoOpen(false)}
        />
      )}

      <aside
        className={`${styles.drawer} ${isInfoOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Editing instructions"
        aria-hidden={!isInfoOpen}
      >
        <button
          type="button"
          className={styles.drawerClose}
          aria-label="Close information"
          onClick={() => setIsInfoOpen(false)}
        >
          ×
        </button>
        <h2 className={styles.drawerTitle}>How to edit</h2>
        <p className={styles.drawerText}>
          Arrange the board and hand. Double-click a board tile to remove it.
          {isDraftContext
            ? ' Save your progress as a draft, then publish to assign the next puzzle number.'
            : ' Saving updates the live puzzle.'}
        </p>
      </aside>

      <div className={styles.editHeader}>
        <div className={appStyles.header}>
          <h1>
            Edit <em>{heading}</em>
          </h1>
        </div>
      </div>

      {(loading || error) && (
        <div className={styles.toolbar}>{editControls}</div>
      )}
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
          leadingControls={editControls}
        />
      )}
    </div>
  );
}

export default EditPuzzlePage;
