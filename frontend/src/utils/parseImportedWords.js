export const parseImportedWords = (text) => {
  if (typeof text !== 'string') return [];

  const newWords = text
    .split(',')
    .map(word => word.trim())
    .filter(word => word.length > 0);

  return [...new Set(newWords)];
};
