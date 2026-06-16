import { getApiBase, isCloudPuzzleStorageEnabled } from './puzzleApi';

const HIGH_SCORE_KEY = 'scrabble-leaderboard-high-';
const MY_SUBMISSION_KEY = 'scrabble-my-submission-';

function loadHighScoreLocal(puzzleId) {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY + puzzleId);
    if (!raw) return null;
    const score = JSON.parse(raw);
    return typeof score === 'number' ? score : null;
  } catch {
    return null;
  }
}

function saveHighScoreLocal(puzzleId, score) {
  const current = loadHighScoreLocal(puzzleId);
  if (current === null || score > current) {
    localStorage.setItem(HIGH_SCORE_KEY + puzzleId, JSON.stringify(score));
  }
}

function loadEntriesLocal(puzzleId) {
  try {
    const raw = localStorage.getItem(`scrabble-leaderboard-${puzzleId}`);
    if (!raw) return [];
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function saveEntryLocal(puzzleId, word, score) {
  const entries = loadEntriesLocal(puzzleId);
  const normalized = word.toUpperCase();
  const existing = entries.find((e) => e.word === normalized);
  if (existing && existing.score >= score) {
    return;
  }
  const filtered = entries.filter((e) => e.word !== normalized);
  filtered.push({ word: normalized, score });
  filtered.sort((a, b) => b.score - a.score);
  localStorage.setItem(
    `scrabble-leaderboard-${puzzleId}`,
    JSON.stringify(filtered.slice(0, 20))
  );
  saveHighScoreLocal(puzzleId, score);
}

/**
 * @returns {{ word: string, score: number } | null}
 */
export function loadMySubmission(puzzleId) {
  try {
    const raw = localStorage.getItem(MY_SUBMISSION_KEY + puzzleId);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.word === 'string' && typeof data.score === 'number') {
      return { word: data.word.toUpperCase(), score: data.score };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the player's result for a puzzle, keeping their best score so that
 * replaying with a lower-scoring word never erases a previous high score.
 * @returns {{ word: string, score: number }} the stored (best) submission
 */
export function saveMySubmission(puzzleId, word, score) {
  const existing = loadMySubmission(puzzleId);
  if (existing && existing.score >= score) {
    return existing;
  }
  const entry = { word: word.toUpperCase(), score };
  localStorage.setItem(MY_SUBMISSION_KEY + puzzleId, JSON.stringify(entry));
  return entry;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, options);
  if (!response.ok) {
    throw new Error(`Leaderboard API error (${response.status})`);
  }
  return response.json();
}

/**
 * @returns {Promise<number | null>}
 */
export async function fetchHighScore(puzzleId) {
  if (!isCloudPuzzleStorageEnabled()) {
    return loadHighScoreLocal(puzzleId);
  }
  const data = await apiFetch(
    `/puzzles/${encodeURIComponent(puzzleId)}/leaderboard/high`
  );
  return typeof data.highScore === 'number' ? data.highScore : null;
}

/**
 * @returns {Promise<{ word: string, score: number }[]>}
 */
export async function fetchLeaderboard(puzzleId) {
  if (!isCloudPuzzleStorageEnabled()) {
    return loadEntriesLocal(puzzleId).slice(0, 20);
  }
  const data = await apiFetch(
    `/puzzles/${encodeURIComponent(puzzleId)}/leaderboard`
  );
  return Array.isArray(data.entries) ? data.entries : [];
}

/**
 * @returns {Promise<{ word: string, score: number }[]>}
 */
export async function submitLeaderboardEntry(puzzleId, word, score) {
  saveMySubmission(puzzleId, word, score);

  if (!isCloudPuzzleStorageEnabled()) {
    saveEntryLocal(puzzleId, word, score);
    return fetchLeaderboard(puzzleId);
  }
  await apiFetch(`/puzzles/${encodeURIComponent(puzzleId)}/leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, score }),
  });
  return fetchLeaderboard(puzzleId);
}
