import React from 'react';
import styles from './Tile.module.scss';

function Tile({
  letter,
  value,
  id,
  used,
  sourceType = 'hand',
  onTilePointerDown,
  dragging = false,
}) {
  const handlePointerDown = (e) => {
    if (used) return;
    if (onTilePointerDown) {
      onTilePointerDown(e, { tileId: id, letter, value, sourceType });
    }
  };

  return (
    <div
      className={`${styles.tile} ${used ? styles.used : ''} ${
        dragging ? styles.dragging : ''
      }`}
      draggable={false}
      onPointerDown={handlePointerDown}
    >
      {letter}
      <span className={styles.tileValue}>{value}</span>
    </div>
  );
}

export default Tile;
