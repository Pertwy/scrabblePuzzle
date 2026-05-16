/** @returns {data is { board: unknown[], hand: unknown[] }} */
export function validatePuzzleSetup(data) {
  return (
    Boolean(data) &&
    typeof data === 'object' &&
    Array.isArray(data.board) &&
    Array.isArray(data.hand)
  );
}
