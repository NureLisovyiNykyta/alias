export const getCellGridStyle = (index, MAX_ROW_WIDTH) => {
  const segmentLength = MAX_ROW_WIDTH + 1;
  const cycleHalf = Math.floor(index / segmentLength);
  const h = index % segmentLength;

  let x, y;
  if (cycleHalf % 2 === 0) {
    if (h < MAX_ROW_WIDTH) {
      y = cycleHalf * 2;
      x = h;
    } else {
      y = cycleHalf * 2 + 1;
      x = MAX_ROW_WIDTH - 1;
    }
  } else {
    if (h < MAX_ROW_WIDTH) {
      y = cycleHalf * 2;
      x = MAX_ROW_WIDTH - 1 - h;
    } else {
      y = cycleHalf * 2 + 1;
      x = 0;
    }
  }

  return {
    gridColumn: x + 1,
    gridRow: y + 1
  };
};
