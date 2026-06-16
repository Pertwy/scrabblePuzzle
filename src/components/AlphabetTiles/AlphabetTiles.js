import React from 'react';
import Tile from '../Tile/Tile';
import styles from './AlphabetTiles.module.scss';
import { LETTER_VALUES } from '../../constants/scrabbleConstants';

function AlphabetTiles({ onTilePointerDown }) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className={styles.alphabetContainer}>
      <div className={styles.title}>Alphabet Tiles</div>
      <div className={styles.tilesGrid}>
        {alphabet.map((letter) => (
          <Tile
            key={`alphabet-${letter}`}
            id={`alphabet-${letter}`}
            letter={letter}
            value={LETTER_VALUES[letter]}
            onTilePointerDown={onTilePointerDown}
            used={false}
            sourceType="alphabet"
          />
        ))}
      </div>
    </div>
  );
}

export default AlphabetTiles;
