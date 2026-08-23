'use client';

import { Canvas } from '@react-three/fiber';
import { NuraCore } from './NuraCore';

export function ExperienceCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#22D3E5" />
      <directionalLight position={[-5, 5, -5]} intensity={1} color="#7557FF" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#3B67FF" />
      
      <NuraCore />
    </Canvas>
  );
}
