import React from 'react';
import { getMultiplierType } from '../../constants/scrabbleConstants';
import styles from './Board.module.scss';

function Board({
  board,
  onTilePointerDown,
  dropTarget,
  draggingFrom,
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

  const handleTilePointerDown = (e, row, col, cell) => {
    // In edit mode, allow dragging all tiles. Otherwise, only allow dragging new tiles
    if (!editMode && !cell.isNew) {
      return;
    }
    if (onTilePointerDown) {
      onTilePointerDown(e, {
        tileId: cell.tileId || `board-${row}-${col}`,
        letter: cell.letter,
        value: cell.value,
        sourceType: 'board',
        sourceRow: row,
        sourceCol: col,
      });
    }
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

            const isDragging =
              draggingFrom &&
              draggingFrom[0] === rowIndex &&
              draggingFrom[1] === colIndex;
            const isDraggable = editMode || (cell && cell.isNew);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cellClasses}
                data-cell="true"
                data-row={rowIndex}
                data-col={colIndex}
              >
                {renderMultiplier(rowIndex, colIndex)}
                {cell && (
                  <div
                    className={`${styles.tile} ${cell.isNew ? styles.new : styles.existing} ${
                      isDragging ? styles.dragging : ''
                    }`}
                    draggable={false}
                    style={isDraggable ? { touchAction: 'none' } : undefined}
                    onPointerDown={(e) => handleTilePointerDown(e, rowIndex, colIndex, cell)}
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
