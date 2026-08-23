'use client';

import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { glState } from './store';
import { NuraCore } from './NuraCore';
import { CameraRig } from './CameraRig';

export function ExperienceCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);

  /**
   * The canvas mounts behind React.lazy + Suspense, and on that path R3F's
   * initial measure can land before the container has been laid out — leaving
   * the drawing buffer at its 300x150 default until the first window resize.
   * One forced measure after paint removes the race.
   */
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(id);
  }, []);

  const low = glState.quality === 'low';

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 16], fov: 45 }}
        dpr={low ? [1, 1.25] : [1, 1.75]}
        resize={{ debounce: 0 }}
        gl={{ antialias: !low, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* Key, rim and fill. The core is the only lit surface — nodes,
            particles and links are additive, so they read as emitted light
            rather than as material. */}
        <ambientLight intensity={0.22} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#22D3E5" />
        <directionalLight position={[-6, 4, -5]} intensity={1.05} color="#7557FF" />
        <pointLight position={[0, 0, 2]} intensity={0.55} color="#3B67FF" />

        <CameraRig />
        <NuraCore />
      </Canvas>
    </div>
  );
}
