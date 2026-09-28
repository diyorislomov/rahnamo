'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, ArrowRight, VolumeX } from 'lucide-react';
import { Counselor } from '@/types';

// ----------------------------------------------------------------------
// 1. REAL 3D PHOTOREALISTIC GUIDING STAR MESH (PBR MATERIALS & EMISSIVE GLOW)
// ----------------------------------------------------------------------
function Real3DGuidingStar({ animationPhase }: { animationPhase: 'dusk' | 'night' | 'star_burst' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const coreRef = useRef<THREE.Group>(null);

  // Create real 3D 4-point star geometry using shape extrusion
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerR = 2.2;
    const innerR = 0.55;
    const points = 4;

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.6,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 2,
      bevelSize: 0.18,
      bevelThickness: 0.22,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((state, delta) => {
    if (coreRef.current) {
      // 3D rotation in space
      coreRef.current.rotation.y += delta * 0.4;
      coreRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;

      // Scale expansion during climax -- distance-adjusted (see the group's
      // position below) so this reads as a small, distant point of light
      // that brightens for the climax, not a shape that fills the frame.
      const targetScale = animationPhase === 'star_burst' ? 1.0 : 0.5;
      coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2.5);
    }

    if (glowRef.current) {
      const targetIntensity = animationPhase === 'star_burst' ? 12 : 2;
      glowRef.current.intensity = THREE.MathUtils.lerp(glowRef.current.intensity, targetIntensity, delta * 3);
    }
  });

  return (
    <group ref={coreRef} position={[6, 3.2, -30]}>
      {/* Real 3D Extruded Star Mesh with Gold PBR Metallic Material */}
      <mesh ref={meshRef} geometry={starGeometry}>
        <meshStandardMaterial
          color="#F59E0B"
          emissive="#F59E0B"
          emissiveIntensity={animationPhase === 'star_burst' ? 1.8 : 0.4}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Dynamic 3D Point Light casting real volumetric light into the scene */}
      <pointLight ref={glowRef} color="#FBBF24" distance={18} decay={1.5} />
    </group>
  );
}

// ----------------------------------------------------------------------
// 2. REAL 3D DESERT SAND DUNE HEIGHTMAP MESH & VOLUMETRIC ATMOSPHERE
// ----------------------------------------------------------------------
function Real3DDesertTerrain({ animationPhase }: { animationPhase: 'dusk' | 'night' | 'star_burst' }) {
  const terrainRef = useRef<THREE.Mesh>(null);

  // Generate 3D dune heightmap geometry
  const duneGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(35, 30, 64, 64);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Realistic dune wave equation
      const z = Math.sin(x * 0.25) * 1.8 + Math.cos(y * 0.3) * 1.2 + Math.sin(x * 0.1 + y * 0.2) * 0.8;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={terrainRef} geometry={duneGeometry} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -3.2, -2]}>
      {/* Night/star_burst lighting (ambientLight + directionalLight below) is
          blue-toned moonlight -- a warm brown surface barely reflects that
          regardless of intensity, since the light has almost no red/green
          to bounce off a red/green-heavy albedo. A cool slate tone actually
          catches it, and reads correctly as moonlit sand besides. */}
      <meshStandardMaterial
        color={animationPhase === 'dusk' ? '#78350F' : '#4A5568'}
        roughness={0.85}
        metalness={0.1}
      />
    </mesh>
  );
}

// ----------------------------------------------------------------------
// 3. MAIN REACT COMPONENT RENDERING REAL-TIME 3D WEBGL CANVAS & OVERLAY CTAS
// ----------------------------------------------------------------------
export default function Real3DDesertHero({ counselors = [] }: { counselors?: Counselor[] }) {
  const [animationPhase, setAnimationPhase] = useState<'dusk' | 'night' | 'star_burst'>('dusk');
  const [key, setKey] = useState(0);

  useEffect(() => {
    setAnimationPhase('dusk');

    const t1 = setTimeout(() => setAnimationPhase('night'), 3000);
    const t2 = setTimeout(() => setAnimationPhase('star_burst'), 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key]);

  return (
    <section className="relative w-full h-[88vh] min-h-[620px] max-h-[850px] overflow-hidden bg-[#070503] text-amber-50 select-none">
      
      {/* 3D WEBGL REAL-TIME CANVAS LAYER */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
          {/* Photorealistic 3D Ambient & Directional Lighting */}
          <ambientLight intensity={animationPhase === 'dusk' ? 0.6 : 0.4} color={animationPhase === 'dusk' ? '#9C4221' : '#1E1B4B'} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={animationPhase === 'dusk' ? 2.5 : 1.3}
            color={animationPhase === 'dusk' ? '#F59E0B' : '#38BDF8'}
          />

          {/* 3D Guiding Star Mesh */}
          <Real3DGuidingStar animationPhase={animationPhase} />

          {/* 3D Sand Dune Terrain Mesh */}
          <Real3DDesertTerrain animationPhase={animationPhase} />
        </Canvas>

        {/* Gradient vignette for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070503]/30 via-[#070503]/50 to-[#070503]/95 z-1 pointer-events-none" />
      </div>

      {/* HERO COPY & CTAS */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-between py-10">
        <div className="flex justify-between items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Real 3D Photorealistic Desert Experience</span>
          </div>

          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 text-xs font-bold transition-all cursor-pointer backdrop-blur-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Qayta ijro</span>
          </button>
        </div>

        <div className="max-w-3xl my-auto space-y-5">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl text-amber-50 leading-[1.12] tracking-tight drop-shadow-xl"
          >
            Markaziy Osiyoning eng kuchli mutaxassislari bilan kelajagingizni quring.
          </motion.h1>

          <p className="text-xs sm:text-base text-amber-100/90 max-w-2xl leading-relaxed font-sans drop-shadow-md">
            Har bir talaba bir yo'lboshchiga loyiq. Tibbiyot, Huquq, Arxitektura, Dasturlash va Grantlar bo'yicha dunyo darajasidagi ekspertlardan 1-ga-1 shaxsiy mentorlik oling.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="#rahnamolar"
              className="btn-glass-dark inline-flex items-center gap-2 text-amber-50 font-serif font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl cursor-pointer"
            >
              <span>Sessiya vaqtini tanlash</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-white/15 pt-4 text-[11px] text-amber-200/70 font-mono">
          <div>Mode: Real 3D WebGL PBR Rendering</div>
          <div>Rahnamo 3D Engine</div>
        </div>
      </div>
    </section>
  );
}
