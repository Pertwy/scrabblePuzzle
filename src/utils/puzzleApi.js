import { validatePuzzleSetup } from './puzzleValidation';

const LOCAL_PREFIX = 'scrabble-puzzle-';

function getApiBase() {
  return process.env.REACT_APP_PUZZLES_API_URL?.replace(/\/$/, '') || '';
}

function getEditKey() {
  return process.env.REACT_APP_PUZZLES_EDIT_KEY || '';
}

export function isCloudPuzzleStorageEnabled() {
  return Boolean(getApiBase());
}

function loadPuzzleLocal(puzzleId) {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + puzzleId);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return validatePuzzleSetup(data) ? data : null;
  } catch {
    return null;
  }
}

function savePuzzleLocal(puzzleId, setup) {
  localStorage.setItem(LOCAL_PREFIX + puzzleId, JSON.stringify(setup));
}

/**
 * @returns {Promise<{ board: unknown[], hand: unknown[] } | null>}
 */
export async function loadPuzzle(puzzleId) {
  if (!isCloudPuzzleStorageEnabled()) {
    return loadPuzzleLocal(puzzleId);
  }

  const response = await fetch(
    `${getApiBase()}/puzzles/${encodeURIComponent(puzzleId)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load puzzle (${response.status})`);
  }

  const data = await response.json();
  if (!validatePuzzleSetup(data)) {
    throw new Error('Invalid puzzle data from server');
  }

  return data;
}

/**
 * @returns {Promise<void>}
 */
export async function savePuzzle(puzzleId, setup) {
  if (!validatePuzzleSetup(setup)) {
    throw new Error('Invalid puzzle setup');
  }

  if (!isCloudPuzzleStorageEnabled()) {
    savePuzzleLocal(puzzleId, setup);
    return;
  }

  const headers = { 'Content-Type': 'application/json' };
  const editKey = getEditKey();
  if (editKey) {
    headers['X-Edit-Key'] = editKey;
  }

  const response = await fetch(
    `${getApiBase()}/puzzles/${encodeURIComponent(puzzleId)}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(setup),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to save puzzle (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }
}
