import React from 'react';
import Tile from '../Tile/Tile';
import { LETTER_VALUES, SCRABBLE_LETTERS } from '../../constants/scrabbleConstants';
import styles from './Hand.module.scss';

function Hand({
  tiles,
  onDragStart,
  usedTileIds,
  onDrop,
  onDragOver,
  editMode = false,
  onHandLetterChange,
}) {
  if (!tiles || tiles.length === 0) {
    return (
      <div 
        className={styles.hand}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className={styles.emptyHand}>No tiles remaining</div>
      </div>
    );
  }

  return (
    <div 
      className={styles.hand}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {tiles.map((tile) => {
        const letterUpper =
          typeof tile.letter === 'string' ? tile.letter.toUpperCase() : '';
        const selectValue = LETTER_VALUES[letterUpper] !== undefined ? letterUpper : 'A';

        return (
          <div key={tile.id} className={styles.tileSlot}>
            <Tile
              id={tile.id}
              letter={tile.letter}
              value={tile.value}
              onDragStart={onDragStart}
              used={usedTileIds.has(tile.id)}
            />
            {editMode && onHandLetterChange && (
              <select
                className={styles.letterSelect}
                value={selectValue}
                onChange={(e) => onHandLetterChange(tile.id, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={`Letter for tile ${selectValue}`}
              >
                {SCRABBLE_LETTERS.map((L) => (
                  <option key={L} value={L}>
                    {L} ({LETTER_VALUES[L]})
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Hand;
