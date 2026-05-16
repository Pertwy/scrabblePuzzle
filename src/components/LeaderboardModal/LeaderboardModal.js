import React from 'react';
import styles from './LeaderboardModal.module.scss';

function LeaderboardModal({ word, score, entries, onClose }) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close leaderboard"
        >
          ×
        </button>

        <h2 id="leaderboard-title" className={styles.title}>
          Great play!
        </h2>
        <p className={styles.subtitle}>
          <strong>{word}</strong> scored <strong>{score}</strong> points
        </p>

        <h3 className={styles.listHeading}>Top words</h3>
        {entries.length === 0 ? (
          <p className={styles.empty}>You&apos;re the first on the board!</p>
        ) : (
          <ol className={styles.list}>
            {entries.map((entry, index) => (
              <li
                key={`${entry.word}-${index}`}
                className={
                  entry.word === word.toUpperCase() && entry.score === score
                    ? styles.highlight
                    : undefined
                }
              >
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.entryWord}>{entry.word}</span>
                <span className={styles.entryScore}>{entry.score}</span>
              </li>
            ))}
          </ol>
        )}

        <button type="button" className={styles.doneButton} onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default LeaderboardModal;
