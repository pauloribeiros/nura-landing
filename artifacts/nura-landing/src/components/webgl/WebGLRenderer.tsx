import { Suspense, useState, useEffect } from 'react';
import { ExperienceCanvas } from './ExperienceCanvas';
import { ScrollManager } from './ScrollManager';

export function WebGLRenderer() {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setShouldRender(false);
    
    const handler = (e: MediaQueryListEvent) => setShouldRender(!e.matches);
    mq.addEventListener('change', handler);
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setShouldRender(false);
    } catch (e) {
      setShouldRender(false);
    }
    
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!shouldRender) {
    return (
      <div className="fallback-canvas">
        <div className="fallback-core">
          <span className="fallback-crystal" />
          <span className="fallback-orbit fallback-orbit-a" />
          <span className="fallback-orbit fallback-orbit-b" />
          <span className="fallback-filament fallback-filament-a" />
          <span className="fallback-node fallback-node-a" />
          <span className="fallback-node fallback-node-b" />
          <span className="fallback-node fallback-node-c" />
          <span className="fallback-node fallback-node-d" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="canvas-container" aria-hidden="true">
        <Suspense fallback={null}>
          <ExperienceCanvas />
        </Suspense>
      </div>
      <ScrollManager />
    </>
  );
}
