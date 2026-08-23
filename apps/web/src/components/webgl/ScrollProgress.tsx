'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { glState } from './store';

gsap.registerPlugin(ScrollTrigger);

/**
 * The only ScrollTrigger in the app. It writes a single 0..1 value; every scene
 * beat is derived from it in `sceneWeights`. The previous version registered
 * five independent triggers, two of which wrote the same property and fought
 * each other on fast or reversed scroll.
 */
export function ScrollProgress() {
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    glState.isMobile = mq.matches;

    const onMq = (e: MediaQueryListEvent) => {
      glState.isMobile = e.matches;
    };
    mq.addEventListener('change', onMq);

    const onPointer = (e: PointerEvent) => {
      glState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      glState.pointerY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // A hidden tab keeps burning GPU otherwise.
    const onVisibility = () => {
      glState.paused = document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    const ctx = gsap.context(() => {
      gsap.to(glState, {
        progress: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.nura-page',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      });
    });

    return () => {
      ctx.revert();
      mq.removeEventListener('change', onMq);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      glState.progress = 0;
      glState.paused = false;
    };
  }, []);

  return null;
}
