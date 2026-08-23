'use client';

import { Suspense, lazy, useState, useEffect } from 'react';

// three.js, GSAP and the whole R3F tree stay out of the initial chunk: the hero
// HTML and its CTA must paint without waiting for the 3D scene to parse.
const ExperienceCanvas = lazy(() =>
  import('./ExperienceCanvas').then((m) => ({ default: m.ExperienceCanvas })),
);
const ScrollManager = lazy(() =>
  import('./ScrollManager').then((m) => ({ default: m.ScrollManager })),
);

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Probes for a usable WebGL context and releases it immediately. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Server render and first client paint both show the CSS fallback. Probing for
 * WebGL during render would mismatch hydration, and probing inside an effect
 * would create a context and tear it straight down again — for the very user
 * who asked for less motion.
 */
export function WebGLScene() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const resolve = () => setShouldRender(!mq.matches && hasWebGL());
    resolve();
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, []);

  if (!shouldRender) {
    return (
      <div className="fallback-canvas" aria-hidden="true">
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
      <Suspense fallback={null}>
        <ScrollManager />
      </Suspense>
    </>
  );
}
