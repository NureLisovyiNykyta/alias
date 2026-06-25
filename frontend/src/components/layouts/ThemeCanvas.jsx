import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, useGLTF, useTexture, Environment } from '@react-three/drei';
import * as THREE from 'three';

const Board = ({ url, onAnchorsLoaded }) => {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (!scene) return;
    scene.updateMatrixWorld(true);

    const extractedAnchors = {};

    scene.traverse((child) => {
      const match = child.name.match(/^(\d+)_pos(\d+)$/);

      if (match) {
        const squareIdx = parseInt(match[1], 10);
        const posNum = parseInt(match[2], 10);

        const flatIndex = squareIdx * 4 + (posNum - 1);

        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        const posArray = [
          parseFloat(worldPos.x.toFixed(3)),
          parseFloat(worldPos.y.toFixed(3)),
          parseFloat(worldPos.z.toFixed(3)),
        ];

        extractedAnchors[flatIndex] = posArray;
      }
    });

    if (onAnchorsLoaded) {
      onAnchorsLoaded(extractedAnchors);
    }
  }, [scene, onAnchorsLoaded]);

  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} />;
};

const Piece = ({ modelUrl, textureUrl, position }) => {
  const { scene } = useGLTF(modelUrl);
  const texture = useTexture(textureUrl || '/placeholder.png');
  texture.flipY = false;

  const groupRef = useRef();
  const jumpStartDist = useRef(0);
  const safePosition = position || [0, 0, 0];

  const clonedPiece = useMemo(() => {
    const clone = scene.clone();

    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    clone.position.x = -center.x;
    clone.position.z = -center.z;
    clone.position.y = -box.min.y;

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.map = texture;
        child.material.needsUpdate = true;
      }
    });

    return clone;
  }, [scene, texture]);

  useFrame(() => {
    if (!groupRef.current || !position) return;

    const currentX = groupRef.current.position.x;
    const currentZ = groupRef.current.position.z;
    const targetX = safePosition[0];
    const targetY = safePosition[1];
    const targetZ = safePosition[2];

    const dx = targetX - currentX;
    const dz = targetZ - currentZ;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    if (distToTarget > 0.1 && jumpStartDist.current === 0) {
      jumpStartDist.current = distToTarget;
    }

    if (distToTarget <= 0.1) {
      jumpStartDist.current = 0;
    }

    groupRef.current.position.x = THREE.MathUtils.lerp(currentX, targetX, 0.08);
    groupRef.current.position.z = THREE.MathUtils.lerp(currentZ, targetZ, 0.08);

    if (jumpStartDist.current > 0) {
      let progress = 1 - (distToTarget / jumpStartDist.current);
      progress = THREE.MathUtils.clamp(progress, 0, 1);
      const jumpHeight = Math.sin(progress * Math.PI) * 2.5;
      groupRef.current.position.y = targetY + jumpHeight;
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[safePosition[0], safePosition[1] + 5, safePosition[2]]} scale={1.5}>
      <primitive object={clonedPiece} />
    </group>
  );
};

export default function ThemeCanvas({ mapUrl, pieceUrl, hdrUrl, pieces, onAnchorsLoaded }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Canvas camera={{ position: [0, 15, 15], fov: 45 }}>
        <Environment files={hdrUrl} background backgroundIntensity={0.6} environmentIntensity={0.45} blur={0.5} />
        <ambientLight />
        <directionalLight position={[10, 15, 1000]} intensity={1.2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />

        <Suspense fallback={null}>
          <Board url={mapUrl} onAnchorsLoaded={onAnchorsLoaded} />
        </Suspense>

        {pieces && pieces.map((piece) => (
          <Suspense key={piece.id} fallback={null}>
            <Piece
              modelUrl={pieceUrl}
              textureUrl={piece.textureUrl}
              position={piece.position}
            />
          </Suspense>
        ))}

        <MapControls
          enableDamping={true}
          dampingFactor={0.03}
          zoomSpeed={1}
          minDistance={3}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0}
          target={[5, 0, 5]}
          mouseButtons={{
            RIGHT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            LEFT: THREE.MOUSE.PAN,
          }}
        />
      </Canvas>
    </div>
  );
}
