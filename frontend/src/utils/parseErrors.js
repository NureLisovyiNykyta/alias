function parseSnakeWord(word) {
  if (!word || typeof word !== 'string') return word;
  const spaced = word.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function parseErrors(errorData) {
  if (errorData && Array.isArray(errorData.detail)) {
    return errorData.detail.map(err => {
      const fieldName = err.loc[err.loc.length - 1];
      return `${parseSnakeWord(fieldName)} ${err.msg}`;
    }).join(', ');
  }

  if (errorData && typeof errorData.detail === 'string') {
    return errorData.detail;
  }

  return '';
}
