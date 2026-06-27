function parseSnakeWord(word) {
  if (!word || typeof word !== 'string') return word;
  return word.split("_").map(w => w[0].toUpperCase().concat(w.slice(1))).join(" ");
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