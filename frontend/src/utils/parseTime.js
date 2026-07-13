export const formatPackDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month}, ${year}`;
};
