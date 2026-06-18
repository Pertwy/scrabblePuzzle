const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const LEADERBOARD_TABLE_NAME = process.env.LEADERBOARD_TABLE_NAME;
const EDIT_API_KEY = process.env.EDIT_API_KEY || '';
const LEADERBOARD_LIMIT = 20;

const AMPLIFY_ORIGIN_SUFFIX = '.ddfup0xv0rhdf.amplifyapp.com';

function normalizeOrigin(origin) {
  const value = (origin || '').trim();
  if (!value || value === '*') return value || '*';
  return value.replace(/\/$/, '');
}

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '*';
  return raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function resolveCorsOrigin(event) {
  const allowed = parseAllowedOrigins();
  if (allowed.includes('*')) {
    return '*';
  }

  const requestOrigin = normalizeOrigin(
    event.headers?.origin || event.headers?.Origin || ''
  );

  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (
    requestOrigin &&
    requestOrigin.startsWith('https://') &&
    requestOrigin.endsWith(AMPLIFY_ORIGIN_SUFFIX)
  ) {
    return requestOrigin;
  }

  return allowed[0] || '*';
}

function corsHeaders(event) {
  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type,X-Edit-Key',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(event, statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function isPublishedId(puzzleId) {
  return /^\d+$/.test(puzzleId);
}

function isDraftId(puzzleId) {
  return /^draft-[\w-]+$/.test(puzzleId);
}

function isValidPuzzleId(puzzleId) {
  return isPublishedId(puzzleId) || isDraftId(puzzleId);
}

function statusOf(item) {
  if (item.status) return item.status;
  return isPublishedId(item.puzzleId) ? 'published' : 'draft';
}

function numberOf(item) {
  if (typeof item.number === 'number') return item.number;
  return isPublishedId(item.puzzleId) ? Number(item.puzzleId) : null;
}

/**
 * @returns {object | null} a 401 response when the edit key is required and
 * missing/incorrect, otherwise null (authorized).
 */
function requireEditKey(event) {
  if (!EDIT_API_KEY) return null;
  const provided =
    event.headers?.['x-edit-key'] || event.headers?.['X-Edit-Key'];
  if (provided !== EDIT_API_KEY) {
    return jsonResponse(event, 401, { error: 'Unauthorized' });
  }
  return null;
}

async function scanAllPuzzles() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await docClient.send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey })
    );
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

function validateSetup(data) {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.board) &&
    Array.isArray(data.hand) &&
    data.board.length === 15 &&
    data.board.every((row) => Array.isArray(row) && row.length === 15)
  );
}

function getHttpMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod;
}

function getPuzzleId(event) {
  return event.pathParameters?.puzzleId;
}

function getRequestPath(event) {
  return event.requestContext?.http?.path || event.path || '';
}

function getRoute(event, puzzleId) {
  const path = getRequestPath(event);
  const base = `/puzzles/${puzzleId}`;
  if (path === `${base}/leaderboard/high`) return 'leaderboard-high';
  if (path === `${base}/leaderboard`) return 'leaderboard';
  if (path === `${base}/publish`) return 'publish';
  if (path === base) return 'puzzle';
  return null;
}

function normalizeWord(word) {
  if (typeof word !== 'string') return null;
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z]{2,15}$/.test(normalized)) return null;
  return normalized;
}

function validateLeaderboardEntry(body) {
  const word = normalizeWord(body?.word);
  const score = body?.score;
  if (!word) return null;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 1) {
    return null;
  }
  return { word, score: Math.round(score) };
}

async function queryTopScores(puzzleId, limit) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: LEADERBOARD_TABLE_NAME,
      IndexName: 'ByScore',
      KeyConditionExpression: 'puzzleId = :pid',
      ExpressionAttributeValues: { ':pid': puzzleId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return result.Items || [];
}

async function handleGetLeaderboardHigh(event, puzzleId) {
  const items = await queryTopScores(puzzleId, 1);
  const highScore = items.length > 0 ? items[0].score : null;
  return jsonResponse(event, 200, { highScore });
}

async function handleGetLeaderboard(event, puzzleId) {
  const items = await queryTopScores(puzzleId, LEADERBOARD_LIMIT);
  const entries = items.map((item) => ({
    word: item.word,
    score: item.score,
  }));
  return jsonResponse(event, 200, { entries });
}

async function handlePostLeaderboard(event, puzzleId) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(event, 400, { error: 'Invalid JSON body' });
  }

  const entry = validateLeaderboardEntry(body);
  if (!entry) {
    return jsonResponse(event, 400, { error: 'Invalid word or score' });
  }

  const existing = await docClient.send(
    new GetCommand({
      TableName: LEADERBOARD_TABLE_NAME,
      Key: { puzzleId, word: entry.word },
    })
  );

  if (existing.Item && existing.Item.score >= entry.score) {
    return jsonResponse(event, 200, {
      ok: true,
      kept: true,
      score: existing.Item.score,
    });
  }

  await docClient.send(
    new PutCommand({
      TableName: LEADERBOARD_TABLE_NAME,
      Item: {
        puzzleId,
        word: entry.word,
        score: entry.score,
        submittedAt: new Date().toISOString(),
      },
    })
  );

  return jsonResponse(event, 200, { ok: true, score: entry.score });
}

async function handleGetPuzzle(event, puzzleId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { puzzleId },
    })
  );

  if (!result.Item) {
    return jsonResponse(event, 404, { error: 'Puzzle not found' });
  }

  return jsonResponse(event, 200, {
    board: result.Item.board,
    hand: result.Item.hand,
  });
}

async function handlePutPuzzle(event, puzzleId) {
  const unauthorized = requireEditKey(event);
  if (unauthorized) return unauthorized;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(event, 400, { error: 'Invalid JSON body' });
  }

  if (!validateSetup(body)) {
    return jsonResponse(event, 400, { error: 'Invalid puzzle setup' });
  }

  const existing = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { puzzleId } })
  );
  const prev = existing.Item || {};
  const isNumeric = isPublishedId(puzzleId);
  const now = new Date().toISOString();

  const item = {
    puzzleId,
    board: body.board,
    hand: body.hand,
    status: prev.status || (isNumeric ? 'published' : 'draft'),
    updatedAt: now,
  };
  if (prev.createdAt) item.createdAt = prev.createdAt;
  if (prev.publishedAt) item.publishedAt = prev.publishedAt;
  if (typeof prev.number === 'number') {
    item.number = prev.number;
  } else if (isNumeric) {
    item.number = Number(puzzleId);
  }

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  return jsonResponse(event, 200, { ok: true });
}

async function handleListPuzzles(event) {
  const items = await scanAllPuzzles();
  const puzzles = items.map((item) => ({
    puzzleId: item.puzzleId,
    status: statusOf(item),
    number: numberOf(item),
    board: item.board,
    hand: item.hand,
    updatedAt: item.updatedAt || item.createdAt || null,
  }));
  return jsonResponse(event, 200, { puzzles });
}

async function handleCreateDraft(event) {
  const unauthorized = requireEditKey(event);
  if (unauthorized) return unauthorized;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(event, 400, { error: 'Invalid JSON body' });
  }

  if (!validateSetup(body)) {
    return jsonResponse(event, 400, { error: 'Invalid puzzle setup' });
  }

  const puzzleId = `draft-${randomUUID()}`;
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        puzzleId,
        status: 'draft',
        board: body.board,
        hand: body.hand,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  return jsonResponse(event, 201, { puzzleId });
}

async function handlePublishPuzzle(event, puzzleId) {
  const unauthorized = requireEditKey(event);
  if (unauthorized) return unauthorized;

  if (!isDraftId(puzzleId)) {
    return jsonResponse(event, 400, { error: 'Only drafts can be published' });
  }

  const draft = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { puzzleId } })
  );
  if (!draft.Item) {
    return jsonResponse(event, 404, { error: 'Draft not found' });
  }

  const items = await scanAllPuzzles();
  let maxNumber = 0;
  for (const item of items) {
    if (statusOf(item) === 'draft') continue;
    const n = numberOf(item);
    if (typeof n === 'number' && n > maxNumber) maxNumber = n;
  }

  const now = new Date().toISOString();
  let number = maxNumber + 1;
  let published = false;

  for (let attempt = 0; attempt < 25 && !published; attempt += 1) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            puzzleId: String(number),
            number,
            status: 'published',
            board: draft.Item.board,
            hand: draft.Item.hand,
            createdAt: draft.Item.createdAt || now,
            publishedAt: now,
            updatedAt: now,
          },
          ConditionExpression: 'attribute_not_exists(puzzleId)',
        })
      );
      published = true;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        number += 1;
        continue;
      }
      throw err;
    }
  }

  if (!published) {
    return jsonResponse(event, 500, {
      error: 'Could not assign a puzzle number',
    });
  }

  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { puzzleId } })
  );

  return jsonResponse(event, 200, { puzzleId: String(number), number });
}

async function handleDeletePuzzle(event, puzzleId) {
  const unauthorized = requireEditKey(event);
  if (unauthorized) return unauthorized;

  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { puzzleId } })
  );

  return jsonResponse(event, 200, { ok: true });
}

exports.handler = async (event) => {
  const method = getHttpMethod(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) };
  }

  const puzzleId = getPuzzleId(event);

  // Collection routes: /puzzles (list all, create draft)
  if (!puzzleId) {
    if (method === 'GET') {
      return handleListPuzzles(event);
    }
    if (method === 'POST') {
      return handleCreateDraft(event);
    }
    return jsonResponse(event, 405, { error: 'Method not allowed' });
  }

  if (!isValidPuzzleId(puzzleId)) {
    return jsonResponse(event, 404, { error: 'Unknown puzzle' });
  }

  const route = getRoute(event, puzzleId);
  if (!route) {
    return jsonResponse(event, 404, { error: 'Not found' });
  }

  if (route === 'leaderboard-high' && method === 'GET') {
    return handleGetLeaderboardHigh(event, puzzleId);
  }

  if (route === 'leaderboard' && method === 'GET') {
    return handleGetLeaderboard(event, puzzleId);
  }

  if (route === 'leaderboard' && method === 'POST') {
    return handlePostLeaderboard(event, puzzleId);
  }

  if (route === 'publish' && method === 'POST') {
    return handlePublishPuzzle(event, puzzleId);
  }

  if (route === 'puzzle' && method === 'GET') {
    return handleGetPuzzle(event, puzzleId);
  }

  if (route === 'puzzle' && method === 'PUT') {
    return handlePutPuzzle(event, puzzleId);
  }

  if (route === 'puzzle' && method === 'DELETE') {
    return handleDeletePuzzle(event, puzzleId);
  }

  return jsonResponse(event, 405, { error: 'Method not allowed' });
};
