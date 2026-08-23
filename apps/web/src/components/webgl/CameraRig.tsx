'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glState, sceneWeights } from './store';
import { DIMENSIONS, ATTENTION_INDEX } from './dimensions';

/**
 * Drives camera position and target from the scroll progress.
 *
 * The previous implementation reconstructed the current look-at by pulling the
 * position out of `camera.matrixWorld` and applying the quaternion to a forward
 * vector — inside the same frame the position had just changed, so the matrix
 * could be stale. This keeps its own target vector instead, which is both
 * stable and readable.
 */
export function CameraRig() {
  const s = useMemo(
    () => ({
      target: new THREE.Vector3(),
      desiredPos: new THREE.Vector3(),
      desiredTarget: new THREE.Vector3(),
      scratch: new THREE.Vector3(),
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (glState.paused) return;

    const p = glState.progress;
    const w = sceneWeights(p);
    const mobile = glState.isMobile;

    // Base travel: the camera pulls back as the core spreads, then pushes into
    // the Attention cluster, then settles for the profile.
    const baseZ = mobile ? 21 : 15;
    const spreadZ = w.spread * (mobile ? 4 : 3.5);
    const attentionZ = w.attention * (mobile ? 7 : 9);
    const reconnectZ = w.reconnect * (mobile ? 2.5 : 3);

    const attentionCenter = DIMENSIONS[ATTENTION_INDEX].center;

    s.desiredPos.set(mobile ? 0 : -3.2, 0, baseZ + spreadZ - attentionZ + reconnectZ);
    s.desiredTarget.set(0, 0, 0);

    // Travel toward Attention: both the eye and the target lean into the cluster
    // so it fills frame instead of merely getting closer.
    s.scratch
      .copy(attentionCenter)
      .multiplyScalar(mobile ? 0.55 : 0.75)
      .setZ(s.desiredPos.z);
    s.desiredPos.lerp(s.scratch, w.attention);
    s.desiredTarget.lerp(attentionCenter, w.attention * 0.85);

    // Pointer parallax stays small and is disabled on touch, where there is no
    // hover to justify it.
    if (!mobile) {
      s.desiredPos.x += glState.pointerX * 1.35;
      s.desiredPos.y += glState.pointerY * 1.1;
    }

    // Frame-rate independent smoothing.
    const k = 1 - Math.pow(0.0016, delta);
    camera.position.lerp(s.desiredPos, k);
    s.target.lerp(s.desiredTarget, k);
    camera.lookAt(s.target);
  });

  return null;
}
