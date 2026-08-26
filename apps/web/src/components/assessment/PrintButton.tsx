'use client';

import { Printer } from 'lucide-react';

/**
 * Saves the report as a PDF, through the browser's own print dialogue.
 *
 * No PDF library, and that is the point rather than a shortcut. Generating a
 * PDF server side would mean running a headless browser on every request — a
 * heavy dependency, a cold-start cost, and a second rendering of the document
 * that could drift from the one on screen. Every browser and phone already
 * offers "Save as PDF" from this dialogue, and what it saves is exactly what
 * the print stylesheet lays out.
 *
 * Hidden when printing, so it never appears in the saved file.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="button button-ghost report-print" onClick={() => window.print()}>
      <Printer size={15} aria-hidden="true" /> {label}
    </button>
  );
}
