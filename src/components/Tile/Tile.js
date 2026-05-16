import React from 'react';
import styles from './Tile.module.scss';

function Tile({ letter, value, id, onDragStart, used, sourceType = 'hand' }) {
  const handleDragStart = (e) => {
    if (used) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('tileId', id);
    e.dataTransfer.setData('letter', letter);
    e.dataTransfer.setData('value', value);
    e.dataTransfer.setData('sourceType', sourceType);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(id);
    }
  };

  return (
    <div
      className={`${styles.tile} ${used ? styles.used : ''}`}
      draggable={!used}
      onDragStart={handleDragStart}
    >
      {letter}
      <span className={styles.tileValue}>{value}</span>
    </div>
  );
}

export default Tile;
