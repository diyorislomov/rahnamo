'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Deterministic PRNG. The particle field is built during render, so it has to
 * be idempotent — `Math.random()` would hand back a different star on every
 * re-render. A fixed seed also means the hero looks identical on every visit.
 */
function mulberry32(seed: number) {
  let state = seed;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renderer settings are read once, when the WebGL context is created — they
 * cannot be changed from an effect afterwards. Cached at module scope so the
 * value is stable across renders.
 */
let deviceProfile: {
  antialias: boolean;
  particleCount: number;
  maxDpr: number;
  isSmall: boolean;
} | null = null;

function getDeviceProfile() {
  if (!deviceProfile) {
    const isSmall = window.innerWidth < 640;
    deviceProfile = {
      // A 3x phone renders ~9x the fragments of a 1x screen for no visible gain
      // here, and MSAA on top of that is pure waste on a dense display.
      antialias: window.devicePixelRatio < 2,
      particleCount: isSmall ? 110 : 240,
      // Rendering a 390x844 hero at 3x costs ~5.8x the fragments of 1.25x for
      // no visible gain at that size, and burns battery for it. Kept low on
      // phones as a power/thermal guard rather than a frame-rate fix.
      maxDpr: isSmall ? 1.25 : 1.75,
      isSmall,
    };
  }
  return deviceProfile;
}

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

/**
 * Warm bloom behind the star, drawn as a single additive sprite.
 * Generated into an offscreen 2D canvas so there's no asset request, and no
 * postprocessing pass — an EffectComposer bloom is far too expensive for the
 * mobile budget this hero has to hit.
 */
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
  gradient.addColorStop(0.32, 'rgba(245, 158, 11, 0.22)');
  gradient.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

type PointerRef = React.RefObject<{ x: number; y: number }>;

function AssembledStar({
  isReducedMotion,
  particleCount,
  pointer,
}: {
  isReducedMotion: boolean;
  particleCount: number;
  pointer: PointerRef | null;
}) {
  const starRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const moteMaterialRef = useRef<THREE.PointsMaterial>(null);
  const haloRef = useRef<THREE.Sprite>(null);

  // Assembly progress, then dispersal of the same particles into a dust orbit.
  const progressRef = useRef(isReducedMotion ? 1 : 0);
  const dispersalRef = useRef(isReducedMotion ? 1 : 0);
  const [assembled, setAssembled] = useState(isReducedMotion);

  const {
    startPositions,
    targetPositions,
    delays,
    orbitRadii,
    orbitAngles,
    orbitSpeeds,
    orbitHeights,
  } = useMemo(() => {
    const startPos = new Float32Array(particleCount * 3);
    const targetPos = new Float32Array(particleCount * 3);
    // Per-particle head start, so the swarm converges raggedly rather than in
    // lockstep. Costs one extra array and nothing at runtime.
    const delayArr = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const heights = new Float32Array(particleCount);

    const outerR = 1.6;
    const innerR = 0.45;
    const rand = mulberry32(0x5eed);

    for (let i = 0; i < particleCount; i++) {
      // Off-screen random starting burst
      const u = rand();
      const v = rand();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 8 + rand() * 8;

      startPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      startPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      startPos[i * 3 + 2] = r * Math.cos(phi);

      // Target position along 4-point star outline
      const ptIdx = Math.floor(rand() * 8);
      const isOuter = ptIdx % 2 === 0;
      const angle = (ptIdx * Math.PI) / 4 - Math.PI / 2;
      const nextAngle = ((ptIdx + 1) * Math.PI) / 4 - Math.PI / 2;
      const t = rand();

      const curRad = isOuter ? outerR : innerR;
      const nextRad = (ptIdx + 1) % 2 === 0 ? outerR : innerR;

      const x1 = Math.cos(angle) * curRad;
      const y1 = Math.sin(angle) * curRad;
      const x2 = Math.cos(nextAngle) * nextRad;
      const y2 = Math.sin(nextAngle) * nextRad;

      targetPos[i * 3] = THREE.MathUtils.lerp(x1, x2, t);
      targetPos[i * 3 + 1] = THREE.MathUtils.lerp(y1, y2, t);
      targetPos[i * 3 + 2] = (rand() - 0.5) * 0.6;

      delayArr[i] = rand() * 0.35;

      // Dust orbit just outside the star's silhouette.
      radii[i] = 1.95 + rand() * 1.25;
      angles[i] = rand() * Math.PI * 2;
      speeds[i] = 0.12 + rand() * 0.2;
      heights[i] = (rand() - 0.5) * 2.6;
    }

    return {
      startPositions: startPos,
      targetPositions: targetPos,
      delays: delayArr,
      orbitRadii: radii,
      orbitAngles: angles,
      orbitSpeeds: speeds,
      orbitHeights: heights,
    };
  }, [particleCount]);

  const currentPositions = useMemo(() => new Float32Array(startPositions), [startPositions]);

  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glowTexture?.dispose(), [glowTexture]);

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

  useFrame((state, rawDelta) => {
    // The frameloop is parked while the hero is off screen; on resume the first
    // delta can be seconds long, which would snap every animation forward.
    const delta = Math.min(rawDelta, 0.05);
    const elapsed = state.clock.elapsedTime;

    if (!isReducedMotion) {
      // 1. Staggered particle assembly
      if (progressRef.current < 1) {
        progressRef.current = Math.min(1, progressRef.current + delta * 0.72);
      } else if (dispersalRef.current < 1) {
        // 2. Once assembled, the same particles drift out into a slow orbit
        //    instead of being unmounted, so the hero keeps breathing.
        dispersalRef.current = Math.min(1, dispersalRef.current + delta * 0.55);
      }

      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const assembly = progressRef.current;
        const dispersal = THREE.MathUtils.smoothstep(dispersalRef.current, 0, 1);

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;

          // Assembly: each particle runs its own clock, offset by its delay.
          const local = THREE.MathUtils.clamp((assembly - delays[i]) / (1 - delays[i]), 0, 1);
          const easeT = THREE.MathUtils.smoothstep(local, 0, 1);

          let x = THREE.MathUtils.lerp(startPositions[i3], targetPositions[i3], easeT);
          let y = THREE.MathUtils.lerp(startPositions[i3 + 1], targetPositions[i3 + 1], easeT);
          let z = THREE.MathUtils.lerp(startPositions[i3 + 2], targetPositions[i3 + 2], easeT);

          if (dispersal > 0) {
            const angle = orbitAngles[i] + elapsed * orbitSpeeds[i];
            const bob = Math.sin(elapsed * 0.6 + orbitAngles[i]) * 0.14;
            const ox = Math.cos(angle) * orbitRadii[i];
            const oy = orbitHeights[i] + bob;
            const oz = Math.sin(angle) * orbitRadii[i];

            x = THREE.MathUtils.lerp(x, ox, dispersal);
            y = THREE.MathUtils.lerp(y, oy, dispersal);
            z = THREE.MathUtils.lerp(z, oz, dispersal);
          }

          positions[i3] = x;
          positions[i3 + 1] = y;
          positions[i3 + 2] = z;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Motes fade back to a subtle ambient presence once dispersed.
      if (moteMaterialRef.current) {
        moteMaterialRef.current.opacity = 0.9 - 0.42 * dispersalRef.current;
      }

      if (progressRef.current >= 0.95 && !assembled) {
        setAssembled(true);
      }
    }

    // 3. Star rotation, pointer parallax and halo pulse
    if (starRef.current) {
      // Scale is driven here rather than from render state, so the star grows
      // in smoothly instead of popping when `assembled` flips.
      const scale = isReducedMotion ? 1 : THREE.MathUtils.smoothstep(progressRef.current, 0, 1);
      starRef.current.scale.setScalar(scale);

      if (!isReducedMotion) {
        starRef.current.rotation.y += delta * 0.35;
        starRef.current.rotation.z = Math.sin(elapsed * 0.8) * 0.06;

        if (pointer) {
          // Eased parallax toward the cursor. Damped by delta so it feels the
          // same regardless of frame rate.
          const damp = 1 - Math.exp(-4 * delta);
          starRef.current.rotation.x +=
            (pointer.current.y * 0.22 - starRef.current.rotation.x) * damp;
          starRef.current.position.x +=
            (pointer.current.x * 0.28 - starRef.current.position.x) * damp;
        }
      }
    }

    if (haloRef.current && !isReducedMotion) {
      const pulse = 4.6 + Math.sin(elapsed * 0.9) * 0.28;
      haloRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group>
      {/* Warm bloom behind everything */}
      {glowTexture && (
        <sprite ref={haloRef} position={[0, 0, -1.2]} scale={[4.6, 4.6, 1]}>
          <spriteMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}

      {/* Assembling particles, which then persist as orbiting dust motes */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={moteMaterialRef}
          size={0.12}
          color="#F59E0B"
          transparent
          opacity={isReducedMotion ? 0.48 : 0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Assembled solid 3D glowing star */}
      <group ref={starRef} scale={assembled ? 1 : 0}>
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  // This component is only ever mounted client-side (ssr: false), so reading
  // the media queries in the initialiser is safe and avoids a first frame
  // rendered with the wrong motion setting.
  const [isReducedMotion, setIsReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [wantsParallax, setWantsParallax] = useState(
    () =>
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  // Start parked; the IntersectionObserver turns the loop on when visible. If
  // the API is missing there is nothing to turn it on, so start running.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  const profile = getDeviceProfile();

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

    const sync = () => {
      setIsReducedMotion(reduced.matches);
      setWantsParallax(fine.matches && !reduced.matches);
    };

    reduced.addEventListener('change', sync);
    fine.addEventListener('change', sync);

    return () => {
      reduced.removeEventListener('change', sync);
      fine.removeEventListener('change', sync);
    };
  }, []);

  // Park the render loop whenever the hero is scrolled out of view. Without
  // this the canvas keeps drawing for the whole session on every page view.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The canvas wrapper is pointer-events-none so clicks fall through to the
  // hero, which means R3F's own state.pointer never updates. Track at the
  // window instead, into a ref, so parallax costs zero re-renders.
  useEffect(() => {
    if (!wantsParallax) {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
      return;
    }

    const onMove = (event: PointerEvent) => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [wantsParallax]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full min-h-[260px] sm:min-h-[320px] relative pointer-events-none"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, profile.maxDpr]}
        frameloop={inView ? 'always' : 'never'}
        performance={{ min: 0.5 }}
        gl={{ alpha: true, antialias: profile.antialias, powerPreference: 'high-performance' }}
      >
        {/* Warm Moody Silk Road Lighting */}
        <ambientLight intensity={0.4} color="#78350F" />
        <pointLight position={[3, 4, 4]} intensity={3.5} color="#F59E0B" />
        <pointLight position={[-4, -2, 2]} intensity={2.0} color="#D97706" />

        <AssembledStar
          isReducedMotion={isReducedMotion}
          particleCount={profile.particleCount}
          pointer={wantsParallax ? pointerRef : null}
        />
      </Canvas>
    </div>
  );
}
