import React from 'react';
import { getMultiplierType } from '../../constants/scrabbleConstants';
import styles from './Board.module.scss';

function Board({
  board,
  onDrop,
  onDragOver,
  onDragLeave,
  dropTarget,
  editMode = false,
  onTileRemove,
}) {
  const renderMultiplier = (row, col) => {
    const multiplierType = getMultiplierType(row, col);
    if (!multiplierType) return null;

    const labels = {
      TW: 'TW',
      DW: 'DW',
      TL: 'TL',
      DL: 'DL'
    };

    return (
      <span className={styles.multiplier}>{labels[multiplierType]}</span>
    );
  };

  const handleTileDragStart = (e, row, col, cell) => {
    // In edit mode, allow dragging all tiles. Otherwise, only allow dragging new tiles
    if (!editMode && !cell.isNew) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('tileId', cell.tileId || `board-${row}-${col}`);
    e.dataTransfer.setData('letter', cell.letter);
    e.dataTransfer.setData('value', cell.value);
    e.dataTransfer.setData('sourceType', 'board');
    e.dataTransfer.setData('sourceRow', row);
    e.dataTransfer.setData('sourceCol', col);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={styles.board}>
      <div className={styles.grid}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isDropTarget = dropTarget && dropTarget[0] === rowIndex && dropTarget[1] === colIndex;
            const multiplierType = getMultiplierType(rowIndex, colIndex);
            const cellClasses = [
              styles.cell,
              multiplierType ? styles[multiplierType.toLowerCase()] : '',
              isDropTarget ? styles.dropTarget : ''
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cellClasses}
                onDrop={(e) => onDrop(e, rowIndex, colIndex)}
                onDragOver={(e) => onDragOver(e, rowIndex, colIndex)}
                onDragLeave={onDragLeave}
              >
                {renderMultiplier(rowIndex, colIndex)}
                {cell && (
                  <div
                    className={`${styles.tile} ${cell.isNew ? styles.new : styles.existing}`}
                    draggable={editMode || cell.isNew}
                    onDragStart={(e) => handleTileDragStart(e, rowIndex, colIndex, cell)}
                    onDoubleClick={
                      editMode && onTileRemove
                        ? () => onTileRemove(rowIndex, colIndex)
                        : undefined
                    }
                    title={editMode ? 'Double-click to remove' : undefined}
                  >
                    {cell.letter}
                    <span className={styles.tileValue}>{cell.value}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Board;
