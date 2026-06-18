/**
 * Seed DynamoDB with default puzzle layouts (same as the app built-ins).
 *
 * Usage (after SAM deploy):
 *   TABLE_NAME=ScrabblePuzzles-puzzles node aws/scripts/seed-default-puzzles.mjs
 *
 * Requires AWS credentials (aws configure) and @aws-sdk/* installed at repo root
 * or run: npm install --no-save @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tableName = process.env.TABLE_NAME;

if (!tableName) {
  console.error('Set TABLE_NAME to your DynamoDB table (see stack Outputs).');
  process.exit(1);
}

// Minimal seed: empty board + default hand per puzzle id (edit in /edit after deploy).
// For full default board, save from the app once API is wired, or extend this script.
const PUZZLE_IDS = ['1', '2', '3'];

const emptyBoard = () =>
  Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));

const defaultHand = [
  { id: 'tile-1', letter: 'A', value: 1 },
  { id: 'tile-2', letter: 'B', value: 3 },
  { id: 'tile-3', letter: 'C', value: 3 },
  { id: 'tile-4', letter: 'D', value: 2 },
  { id: 'tile-5', letter: 'E', value: 1 },
  { id: 'tile-6', letter: 'F', value: 4 },
  { id: 'tile-7', letter: 'G', value: 2 },
];

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

for (const puzzleId of PUZZLE_IDS) {
  const now = new Date().toISOString();
  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        puzzleId,
        number: Number(puzzleId),
        status: 'published',
        board: emptyBoard(),
        hand: defaultHand,
        createdAt: now,
        publishedAt: now,
        updatedAt: now,
      },
    })
  );
  console.log(`Seeded puzzle ${puzzleId}`);
}

console.log('Done. Open /edit to arrange boards and save to AWS.');
