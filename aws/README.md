# Puzzle API (DynamoDB + Lambda + HTTP API)

Stores each puzzle’s board and hand in DynamoDB. The React app calls this API when `REACT_APP_PUZZLES_API_URL` is set.

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Deploy

From the repo root:

```bash
cd aws
sam build
sam deploy --guided
```

Suggested answers during `--guided`:

- **Stack name:** `scrabble-puzzles` (or your choice)
- **AllowedOrigin:** your Amplify app URL, e.g. `https://main.d1234.amplifyapp.com` (not `*` in production)
- **EditApiKey:** optional secret; if set, also set `REACT_APP_PUZZLES_EDIT_KEY` in Amplify to the same value

Note the **ApiEndpoint** output (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`).

## Configure Amplify Hosting

In the Amplify console → **Environment variables**:

| Variable | Value |
|----------|--------|
| `REACT_APP_PUZZLES_API_URL` | ApiEndpoint from deploy (no trailing slash) |
| `REACT_APP_PUZZLES_EDIT_KEY` | Same as EditApiKey, if you use one |

Redeploy the frontend after saving variables.

## Seed puzzles (optional)

After first deploy, open `/edit` and save each puzzle, or seed empty boards:

```bash
export TABLE_NAME=scrabble-puzzles-puzzles   # see stack output PuzzlesTableName
node aws/scripts/seed-default-puzzles.mjs
```

(Requires `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` — install once with `npm install --no-save` in the repo root.)

Until a puzzle exists in DynamoDB, the app shows a “Puzzle not found” message on the play page. Use `/edit` to create and save puzzles.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/puzzles/{id}` | Load puzzle `1`, `2`, or `3` (404 if not saved yet) |
| PUT | `/puzzles/{id}` | Save board + hand JSON |
| GET | `/puzzles/{id}/leaderboard/high` | Best score only (`{ highScore }`, no word) |
| GET | `/puzzles/{id}/leaderboard` | Top 20 words (`{ entries: [{ word, score }] }`) |
| POST | `/puzzles/{id}/leaderboard` | Submit `{ word, score }` after a valid play |

After adding leaderboard routes, run `sam build && sam deploy` again.

## Local frontend

`npm start` loads `.env.development`, which points at the same puzzle API as production. Restart the dev server after changing env files.

To save puzzles from `/edit` locally, add `REACT_APP_PUZZLES_EDIT_KEY` to `.env.local` (same value as the stack’s `EditApiKey` parameter).
