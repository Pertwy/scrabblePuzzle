const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const EDIT_API_KEY = process.env.EDIT_API_KEY || '';
const ALLOWED_PUZZLE_IDS = (process.env.ALLOWED_PUZZLE_IDS || '1,2,3')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/** Any Amplify branch for this app (master, main, PR previews, etc.). */
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
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
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

exports.handler = async (event) => {
  const method = getHttpMethod(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) };
  }

  const puzzleId = getPuzzleId(event);
  if (!puzzleId || !isAllowedPuzzleId(puzzleId)) {
    return jsonResponse(event, 404, { error: 'Unknown puzzle' });
  }

  if (method === 'GET') {
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

  if (method === 'PUT') {
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

  return jsonResponse(event, 405, { error: 'Method not allowed' });
};
