'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** Fires assessment_view once per mount. No-op until consent is granted. */
export function AssessmentViewTracker({
  assessment,
  locale,
}: {
  assessment: string;
  locale: string;
}) {
  useEffect(() => {
    track('assessment_view', { assessment, locale });
  }, [assessment, locale]);

  return null;
}
