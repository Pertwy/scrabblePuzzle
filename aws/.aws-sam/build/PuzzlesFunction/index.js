const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const LEADERBOARD_TABLE_NAME = process.env.LEADERBOARD_TABLE_NAME;
const EDIT_API_KEY = process.env.EDIT_API_KEY || '';
const ALLOWED_PUZZLE_IDS = (process.env.ALLOWED_PUZZLE_IDS || '1,2,3')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
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
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
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

function isAllowedPuzzleId(puzzleId) {
  return ALLOWED_PUZZLE_IDS.includes(puzzleId);
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
  if (EDIT_API_KEY) {
    const provided =
      event.headers?.['x-edit-key'] || event.headers?.['X-Edit-Key'];
    if (provided !== EDIT_API_KEY) {
      return jsonResponse(event, 401, { error: 'Unauthorized' });
    }
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(event, 400, { error: 'Invalid JSON body' });
  }

  if (!validateSetup(body)) {
    return jsonResponse(event, 400, { error: 'Invalid puzzle setup' });
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        puzzleId,
        board: body.board,
        hand: body.hand,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  return jsonResponse(event, 200, { ok: true });
}

exports.handler = async (event) => {
  const method = getHttpMethod(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) };
  }

  const puzzleId = getPuzzleId(event);
  if (!puzzleId || !isAllowedPuzzleId(puzzleId)) {
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

  if (route === 'puzzle' && method === 'GET') {
    return handleGetPuzzle(event, puzzleId);
  }

  if (route === 'puzzle' && method === 'PUT') {
    return handlePutPuzzle(event, puzzleId);
  }

  return jsonResponse(event, 405, { error: 'Method not allowed' });
};
