'use client';

/** Smooth-scrolls to a section anchor and runs an optional callback. */
export function scrollToId(id: string, onDone?: () => void) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  onDone?.();
}
