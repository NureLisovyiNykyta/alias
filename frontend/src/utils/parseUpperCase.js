export const parseUpperCase = string => {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
};
