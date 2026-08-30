'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 3D 4-Point Star Geometry Helper
function createFourPointStarShape() {
  const shape = new THREE.Shape();
  const outerRadius = 1.6;
  const innerRadius = 0.45;
  const points = 4;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function AssembledStar({ isReducedMotion }: { isReducedMotion: boolean }) {
  const starRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const [assembled, setAssembled] = useState(isReducedMotion);
  const progressRef = useRef(isReducedMotion ? 1 : 0);

  const PARTICLE_COUNT = 240;

  // Target positions (surface of 4-point star) and random start positions
  const { startPositions, targetPositions } = useMemo(() => {
    const startPos = new Float32Array(PARTICLE_COUNT * 3);
    const targetPos = new Float32Array(PARTICLE_COUNT * 3);

    const outerR = 1.6;
    const innerR = 0.45;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Off-screen random starting burst
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 8 + Math.random() * 8;

      startPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      startPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      startPos[i * 3 + 2] = r * Math.cos(phi);

      // Target position along 4-point star outline
      const ptIdx = Math.floor(Math.random() * 8);
      const isOuter = ptIdx % 2 === 0;
      const rad = isOuter ? outerR : innerR;
      const angle = (ptIdx * Math.PI) / 4 - Math.PI / 2;
      const nextAngle = ((ptIdx + 1) * Math.PI) / 4 - Math.PI / 2;
      const t = Math.random();

      const curRad = isOuter ? outerR : innerR;
      const nextRad = (ptIdx + 1) % 2 === 0 ? outerR : innerR;

      const x1 = Math.cos(angle) * curRad;
      const y1 = Math.sin(angle) * curRad;
      const x2 = Math.cos(nextAngle) * nextRad;
      const y2 = Math.sin(nextAngle) * nextRad;

      targetPos[i * 3] = THREE.MathUtils.lerp(x1, x2, t);
      targetPos[i * 3 + 1] = THREE.MathUtils.lerp(y1, y2, t);
      targetPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }

    return { startPositions: startPos, targetPositions: targetPos };
  }, []);

  const currentPositions = useMemo(() => new Float32Array(startPositions), [startPositions]);

  const extrudeSettings = useMemo(
    () => ({
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.12,
    }),
    []
  );

  const starShape = useMemo(() => createFourPointStarShape(), []);

  useFrame((state, delta) => {
    // 1. Particle assembly lerp (1.4s duration)
    if (!assembled && progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 0.72);
      const easeT = THREE.MathUtils.smoothstep(progressRef.current, 0, 1);

      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          positions[i] = THREE.MathUtils.lerp(startPositions[i], targetPositions[i], easeT);
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (progressRef.current >= 0.95) {
        setAssembled(true);
      }
    }

    // 2. Continuous rotation & subtle pulse
    if (starRef.current) {
      if (!isReducedMotion) {
        starRef.current.rotation.y += delta * 0.35;
        starRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
      }
    }
  });

  return (
    <group>
      {/* 1. Assembling Particles */}
      {!assembled && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[currentPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            color="#F59E0B"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* 2. Assembled Solid 3D Glowing Star */}
      <group ref={starRef} scale={assembled ? 1 : progressRef.current}>
        <mesh position={[0, 0, -0.18]}>
          <extrudeGeometry args={[starShape, extrudeSettings]} />
          <meshStandardMaterial
            color="#D97706"
            emissive="#F59E0B"
            emissiveIntensity={0.65}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function ThreeStarScene() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[260px] sm:min-h-[320px] relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Warm Moody Silk Road Lighting */}
        <ambientLight intensity={0.4} color="#78350F" />
        <pointLight position={[3, 4, 4]} intensity={3.5} color="#F59E0B" />
        <pointLight position={[-4, -2, 2]} intensity={2.0} color="#D97706" />

        <AssembledStar isReducedMotion={isReducedMotion} />
      </Canvas>
    </div>
  );
}
