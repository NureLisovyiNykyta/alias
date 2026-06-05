import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const Board = ({ url }) => {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} />;
};

const Piece = ({ modelUrl, textureUrl, position }) => {
  const { scene } = useGLTF(modelUrl);
  const texture = useTexture(textureUrl);
  texture.flipY = false;

  const groupRef = useRef();
  const jumpStartDist = useRef(0);

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

  useFrame(() => {
    if (!groupRef.current) return;

    const currentX = groupRef.current.position.x;
    const currentZ = groupRef.current.position.z;
    const targetX = position[0];
    const targetY = position[1];
    const targetZ = position[2];

    // Вычисляем оставшуюся дистанцию до цели по плоской земле (X и Z)
    const dx = targetX - currentX;
    const dz = targetZ - currentZ;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    // Если цель далеко (больше 0.1), значит мы начали новый прыжок
    if (distToTarget > 0.1 && jumpStartDist.current === 0) {
      jumpStartDist.current = distToTarget;
    }

    // Если долетели — сбрасываем состояние прыжка
    if (distToTarget <= 0.1) {
      jumpStartDist.current = 0;
    }

    // 1. Двигаем фишку по X и Z
    groupRef.current.position.x = THREE.MathUtils.lerp(currentX, targetX, 0.08);
    groupRef.current.position.z = THREE.MathUtils.lerp(currentZ, targetZ, 0.08);

    // 2. Управляем высотой (Y)
    if (jumpStartDist.current > 0) {
      // Вычисляем прогресс прыжка (от 0 до 1)
      let progress = 1 - (distToTarget / jumpStartDist.current);
      progress = THREE.MathUtils.clamp(progress, 0, 1);

      // Формула дуги (синусоида). Множитель 2.5 - это максимальная высота прыжка.
      const jumpHeight = Math.sin(progress * Math.PI) * 2.5;
      groupRef.current.position.y = targetY + jumpHeight;
    } else {
      // Обычное падение при спавне фишки
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
    }
  });

  return (
    // При спавне забрасываем фишку на +5 по Y, чтобы она упала
    <group ref={groupRef} position={[position[0], position[1] + 5, position[2]]}>
      <primitive object={clonedPiece} scale={1.5} />
    </group>
  );
};

export default function ThemeCanvas({ mapUrl, pieceUrl, pieces }) {
  return (
    <div className="absolute inset-0 bg-yellow-100 overflow-hidden">
      <Canvas camera={{ position: [0, 15, 15], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />

        <Suspense fallback={null}>
          <Board url={mapUrl} />
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
