'use client';

import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLanding } from './LandingProvider';

type Action = { kind: 'start' } | { kind: 'assessment'; name: string | null };

interface Props {
  action: Action;
  className?: string;
  iconSize?: number;
  withIcon?: boolean;
  children: ReactNode;
}

/**
 * The only interactive island inside otherwise server-rendered sections, so the
 * copy around it stays in the initial HTML for crawlers.
 */
export function CtaButton({
  action,
  className = 'button button-primary',
  iconSize = 16,
  withIcon = true,
  children,
}: Props) {
  const { start, showAssessment } = useLanding();
  const onClick = () => (action.kind === 'start' ? start() : showAssessment(action.name));

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
      {withIcon ? <ArrowRight size={iconSize} aria-hidden="true" /> : null}
    </button>
  );
}
