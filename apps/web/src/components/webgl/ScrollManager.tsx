'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { glState } from './store';

gsap.registerPlugin(ScrollTrigger);

export function ScrollManager() {
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    glState.isMobile = mq.matches;
    const updateMq = (e: MediaQueryListEvent) => glState.isMobile = e.matches;
    mq.addEventListener('change', updateMq);
    
    const onMouseMove = (e: MouseEvent) => {
      glState.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      glState.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const ctx = gsap.context(() => {
      // Global scroll
      gsap.to(glState, {
        scrollProgress: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.nura-page',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        }
      });

      // Core spread
      gsap.to(glState, {
        coreSpread: 1,
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: '.statement',
          start: 'top bottom',
          end: 'bottom center',
          scrub: true,
        }
      });

      // Attention focus
      gsap.to(glState, {
        attentionFocus: 1,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '#tdah',
          start: 'top 80%',
          end: 'center center',
          scrub: true,
        }
      });

      gsap.to(glState, {
        attentionFocus: 0,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '.how',
          start: 'top 80%',
          end: 'center center',
          scrub: true,
        }
      });

      // Reconnect
      gsap.to(glState, {
        reconnectProgress: 1,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '#perfil',
          start: 'top 80%',
          end: 'center center',
          scrub: true,
        }
      });
    });

    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', onMouseMove);
      mq.removeEventListener('change', updateMq);
    };
  }, []);
  
  return null;
}
