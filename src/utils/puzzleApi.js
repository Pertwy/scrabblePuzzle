import { validatePuzzleSetup } from './puzzleValidation';

const LOCAL_PREFIX = 'scrabble-puzzle-';
const LOCAL_INDEX_KEY = 'scrabble-puzzle-index';

export function isPublishedPuzzleId(puzzleId) {
  return /^\d+$/.test(puzzleId);
}

export function isDraftPuzzleId(puzzleId) {
  return /^draft-[\w-]+$/.test(puzzleId);
}

export function getApiBase() {
  const raw = process.env.REACT_APP_PUZZLES_API_URL?.trim() || '';
  return raw.replace(/\/$/, '');
}

function getEditKey() {
  return process.env.REACT_APP_PUZZLES_EDIT_KEY?.trim() || '';
}

function editHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const editKey = getEditKey();
  if (editKey) {
    headers['X-Edit-Key'] = editKey;
  }
  return headers;
}

export function isCloudPuzzleStorageEnabled() {
  return Boolean(getApiBase());
}

function generateDraftId() {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `draft-${uuid}`;
}

function readLocalIndex() {
  try {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeLocalIndex(index) {
  localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
}

function upsertLocalIndex(puzzleId, patch) {
  const index = readLocalIndex();
  index[puzzleId] = { ...(index[puzzleId] || {}), ...patch };
  writeLocalIndex(index);
}

function removeLocalIndex(puzzleId) {
  const index = readLocalIndex();
  delete index[puzzleId];
  writeLocalIndex(index);
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
  const isNumeric = isPublishedPuzzleId(puzzleId);
  upsertLocalIndex(puzzleId, {
    status: isNumeric ? 'published' : 'draft',
    ...(isNumeric ? { number: Number(puzzleId) } : {}),
    updatedAt: new Date().toISOString(),
  });
}

function deletePuzzleLocal(puzzleId) {
  localStorage.removeItem(LOCAL_PREFIX + puzzleId);
  removeLocalIndex(puzzleId);
}

function listPuzzlesLocal() {
  const index = readLocalIndex();
  const ids = new Set(Object.keys(index));

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_PREFIX) && key !== LOCAL_INDEX_KEY) {
      ids.add(key.slice(LOCAL_PREFIX.length));
    }
  }

  const puzzles = [];
  for (const puzzleId of ids) {
    const setup = loadPuzzleLocal(puzzleId);
    if (!setup) continue;
    const meta = index[puzzleId] || {};
    const isNumeric = isPublishedPuzzleId(puzzleId);
    puzzles.push({
      puzzleId,
      status: meta.status || (isNumeric ? 'published' : 'draft'),
      number:
        typeof meta.number === 'number'
          ? meta.number
          : isNumeric
            ? Number(puzzleId)
            : null,
      board: setup.board,
      hand: setup.hand,
      updatedAt: meta.updatedAt || null,
    });
  }
  return puzzles;
}

function createDraftLocal(setup) {
  const puzzleId = generateDraftId();
  savePuzzleLocal(puzzleId, setup);
  return { puzzleId };
}

function publishDraftLocal(draftId) {
  const setup = loadPuzzleLocal(draftId);
  if (!setup) {
    throw new Error('Draft not found');
  }

  let maxNumber = 0;
  for (const puzzle of listPuzzlesLocal()) {
    if (puzzle.status === 'draft') continue;
    if (typeof puzzle.number === 'number' && puzzle.number > maxNumber) {
      maxNumber = puzzle.number;
    }
  }

  const number = maxNumber + 1;
  const puzzleId = String(number);
  localStorage.setItem(LOCAL_PREFIX + puzzleId, JSON.stringify(setup));
  upsertLocalIndex(puzzleId, {
    status: 'published',
    number,
    updatedAt: new Date().toISOString(),
  });
  deletePuzzleLocal(draftId);
  return { puzzleId, number };
}

/**
 * @returns {Promise<{ board: unknown[], hand: unknown[] } | null>}
 */
export async function loadPuzzle(puzzleId) {
  if (!isCloudPuzzleStorageEnabled()) {
    return loadPuzzleLocal(puzzleId);
  }

  const url = `${getApiBase()}/puzzles/${encodeURIComponent(puzzleId)}`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `Could not reach puzzle API at ${url} (network or CORS). In Amplify, set REACT_APP_PUZZLES_API_URL to your ApiEndpoint (no trailing slash) and redeploy.`
    );
  }

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

  const response = await fetch(
    `${getApiBase()}/puzzles/${encodeURIComponent(puzzleId)}`,
    {
      method: 'PUT',
      headers: editHeaders(),
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

/**
 * List every puzzle (drafts and published) with board/hand and metadata.
 * @returns {Promise<Array<{ puzzleId: string, status: 'draft' | 'published', number: number | null, board: unknown[], hand: unknown[], updatedAt: string | null }>>}
 */
export async function listPuzzles() {
  if (!isCloudPuzzleStorageEnabled()) {
    return listPuzzlesLocal();
  }

  const response = await fetch(`${getApiBase()}/puzzles`);
  if (!response.ok) {
    throw new Error(`Failed to list puzzles (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data.puzzles) ? data.puzzles : [];
}

/**
 * Create a new draft puzzle.
 * @returns {Promise<{ puzzleId: string }>}
 */
export async function createDraft(setup) {
  if (!validatePuzzleSetup(setup)) {
    throw new Error('Invalid puzzle setup');
  }

  if (!isCloudPuzzleStorageEnabled()) {
    return createDraftLocal(setup);
  }

  const response = await fetch(`${getApiBase()}/puzzles`, {
    method: 'POST',
    headers: editHeaders(),
    body: JSON.stringify(setup),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to create draft (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }

  const data = await response.json();
  return { puzzleId: data.puzzleId };
}

/**
 * Publish a draft, assigning the next available puzzle number.
 * @returns {Promise<{ puzzleId: string, number: number }>}
 */
export async function publishDraft(draftId) {
  if (!isCloudPuzzleStorageEnabled()) {
    return publishDraftLocal(draftId);
  }

  const response = await fetch(
    `${getApiBase()}/puzzles/${encodeURIComponent(draftId)}/publish`,
    {
      method: 'POST',
      headers: editHeaders(),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to publish puzzle (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }

  const data = await response.json();
  return { puzzleId: data.puzzleId, number: data.number };
}

/**
 * Delete a draft (or any puzzle) by id.
 * @returns {Promise<void>}
 */
export async function deleteDraft(puzzleId) {
  if (!isCloudPuzzleStorageEnabled()) {
    deletePuzzleLocal(puzzleId);
    return;
  }

  const response = await fetch(
    `${getApiBase()}/puzzles/${encodeURIComponent(puzzleId)}`,
    {
      method: 'DELETE',
      headers: editHeaders(),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to delete puzzle (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }
}
