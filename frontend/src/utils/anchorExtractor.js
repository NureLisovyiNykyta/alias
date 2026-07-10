export const extractAnchors = (scene) => {
  const extractedAnchors = {};

  if (!scene) return extractedAnchors;

  scene.traverse((child) => {
    const match = child.name.match(/^(\d+)_pos(\d+)$/);

    if (match) {
      const squareIdx = parseInt(match[1], 10);
      const posNum = parseInt(match[2], 10);
      const flatIndex = squareIdx * 4 + (posNum - 1);

      const worldPos = child.getWorldPosition ? child.getWorldPosition(new (child.position.constructor)()) : { x: 0, y: 0, z: 0 };

      extractedAnchors[flatIndex] = [
        parseFloat(worldPos.x.toFixed(3)),
        parseFloat(worldPos.y.toFixed(3)),
        parseFloat(worldPos.z.toFixed(3)),
      ];
    }
  });

  return extractedAnchors;
};
