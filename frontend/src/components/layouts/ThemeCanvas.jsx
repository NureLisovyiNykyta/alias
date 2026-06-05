import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei';

const Board = ({ url }) => {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} />;
};

const Piece = ({ modelUrl, textureUrl }) => {
  const { scene } = useGLTF(modelUrl);
  const texture = useTexture(textureUrl);
  texture.flipY = false;

  const clonedPiece = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    });
    return clone;
  }, [scene, texture]);

  return <primitive object={clonedPiece} position={[0, 0.5, 0]} scale={1.5} />;
};

export default function ThemeCanvas({ mapUrl, pieceUrl, colorTextureUrl }) {
  return (
    <div className="absolute inset-0 bg-slate-200 overflow-hidden rounded-xl border border-slate-800">
      <Canvas camera={{ position: [5, 5, 8], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />

        <Suspense fallback={null}>
          <Board url={mapUrl} />
          <Piece modelUrl={pieceUrl} textureUrl={colorTextureUrl} />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
