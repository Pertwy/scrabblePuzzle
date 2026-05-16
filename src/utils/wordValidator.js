const WORDOTRON_API = 'https://wordotron.com/api/v1/check-word';
const LOCAL_DICTIONARY_URL = '/dictionary/sowpods.txt';

let localDictionary = null;

async function loadLocalScrabbleDictionary() {
  if (localDictionary) return localDictionary;

  const response = await fetch(LOCAL_DICTIONARY_URL);
  if (!response.ok) {
    throw new Error('Failed to load Scrabble dictionary');
  }

  const text = await response.text();
  localDictionary = new Set(
    text
      .split('\n')
      .map((word) => word.trim().toUpperCase())
      .filter(Boolean)
  );

  return localDictionary;
}

async function checkWordWithScrabbleApi(word) {
  const response = await fetch(WORDOTRON_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });

  if (!response.ok) {
    throw new Error(`Scrabble API responded with ${response.status}`);
  }

  const data = await response.json();
  return Boolean(data.valid);
}

function checkWordWithLocalDictionary(word, dictionary) {
  return dictionary.has(word);
}

export async function validateWord(word) {
  if (!word || word.length === 0) {
    return { valid: false, error: 'Word cannot be empty' };
  }

  const wordToCheck = word.toUpperCase();

  try {
    const valid = await checkWordWithScrabbleApi(wordToCheck);
    if (valid) {
      return { valid: true, word: wordToCheck };
    }
    return {
      valid: false,
      error: `"${wordToCheck}" is not a valid Scrabble word`,
    };
  } catch (apiError) {
    console.warn('Scrabble API unavailable, using local dictionary:', apiError);
  }

  try {
    const dictionary = await loadLocalScrabbleDictionary();
    const valid = checkWordWithLocalDictionary(wordToCheck, dictionary);
    if (valid) {
      return { valid: true, word: wordToCheck };
    }
    return {
      valid: false,
      error: `"${wordToCheck}" is not a valid Scrabble word`,
    };
  } catch (error) {
    console.error('Error validating word:', error);
    return {
      valid: false,
      error: 'Unable to validate word. Please try again.',
    };
  }
}

export async function validateWords(words) {
  const validationResults = await Promise.all(
    words.map((word) => validateWord(word))
  );

  const invalidWords = validationResults
    .map((result, index) => ({ result, word: words[index] }))
    .filter(({ result }) => !result.valid);

  if (invalidWords.length > 0) {
    return {
      valid: false,
      errors: invalidWords.map(
        ({ result, word }) => result.error || `"${word}" is not valid`
      ),
    };
  }

  return { valid: true };
}
