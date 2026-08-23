'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glState, sceneWeights } from './store';
import { ATTENTION_INDEX, BUDGET, DIMENSIONS, assignDimensions } from './dimensions';

/** Uniformly distributed direction on the unit sphere, scaled to `radius`. */
function onSphere(radius: number) {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(Math.random() * 2 - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

const inSphere = (radius: number) => onSphere(Math.random() * radius);

export function NuraCore() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const orbitsRef = useRef<THREE.Group>(null);

  const budget = BUDGET[glState.quality];

  const data = useMemo(() => {
    const nodeDim = assignDimensions(budget.nodes);
    const particleDim = assignDimensions(budget.particles);

    const nodes = nodeDim.map((dimIndex, i) => {
      const dim = DIMENSIONS[dimIndex];
      return {
        dimIndex,
        // Where it sits while the core is still whole.
        corePos: onSphere(Math.random() * 2.3 + 1.2),
        // Where it settles once the core has spread into dimensions.
        clusterPos: inSphere(dim.radius).add(dim.center),
        speed: Math.random() * 0.5 + 0.2,
        phase: (i * 137.5 * Math.PI) / 180,
      };
    });

    const particles = particleDim.map((dimIndex, i) => {
      const dim = DIMENSIONS[dimIndex];
      return {
        dimIndex,
        corePos: onSphere(Math.random() * 4.2 + 1.5),
        clusterPos: inSphere(dim.radius * 1.5).add(dim.center),
        speed: Math.random() * 1 + 0.5,
        phase: (i * 137.5 * Math.PI) / 180,
      };
    });

    // Links prefer pairs inside the same dimension, so the reconnection scene
    // reads as dimensions joining rather than as random noise.
    const links: number[] = [];
    for (let i = 0; i < nodes.length && links.length / 2 < budget.links; i++) {
      for (let j = i + 1; j < nodes.length && links.length / 2 < budget.links; j++) {
        const same = nodes[i].dimIndex === nodes[j].dimIndex;
        if (same ? Math.random() > 0.86 : Math.random() > 0.995) links.push(i, j);
      }
    }

    // Per-instance colour: this is what finally distinguishes the dimensions.
    const nodeColors = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => DIMENSIONS[n.dimIndex].color.toArray(nodeColors, i * 3));

    const particleColors = new Float32Array(particles.length * 3);
    particles.forEach((n, i) => DIMENSIONS[n.dimIndex].color.toArray(particleColors, i * 3));

    return { nodes, particles, links, nodeColors, particleColors };
  }, [budget]);

  const particlePositions = useMemo(
    () => new Float32Array(data.particles.length * 3),
    [data.particles.length],
  );
  const linePositions = useMemo(
    () => new Float32Array(Math.max(data.links.length, 1) * 3),
    [data.links.length],
  );

  // Allocated once. Nothing inside useFrame may allocate.
  const s = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      v: new THREE.Vector3(),
      idle: new THREE.Vector3(),
      nodePos: Array.from({ length: budget.nodes }, () => new THREE.Vector3()),
    }),
    [budget.nodes],
  );

  useFrame(({ clock }) => {
    if (glState.paused) return;

    const time = clock.elapsedTime;
    const p = glState.progress;
    const w = sceneWeights(p);
    const { dummy, v, idle, nodePos } = s;

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.04 + p * Math.PI * 0.6;
      groupRef.current.rotation.x = Math.sin(time * 0.03) * 0.09;
      groupRef.current.scale.setScalar(glState.isMobile ? 1.1 : 1.28);
      groupRef.current.position.y = glState.isMobile ? -1.2 : 0;
    }

    /* nodes ------------------------------------------------------------- */
    if (nodesRef.current) {
      for (let i = 0; i < data.nodes.length; i++) {
        const n = data.nodes[i];
        idle.set(
          Math.sin(time * n.speed + n.phase) * 0.18,
          Math.cos(time * n.speed * 1.2 + n.phase) * 0.18,
          Math.sin(time * n.speed * 0.8 + n.phase) * 0.18,
        );
        v.copy(n.corePos).lerp(n.clusterPos, w.spread).add(idle);
        nodePos[i].copy(v);
        dummy.position.copy(v);

        // Attention grows and everything else recedes during its scene.
        const isAttention = n.dimIndex === ATTENTION_INDEX;
        let scale = 1 + w.attention * (isAttention ? 0.75 : -0.72);
        scale *= 1 + w.reconnect * 0.28;

        dummy.scale.setScalar(Math.max(scale, 0.01) * 0.088);
        dummy.updateMatrix();
        nodesRef.current.setMatrixAt(i, dummy.matrix);
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
    }

    /* particles --------------------------------------------------------- */
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < data.particles.length; i++) {
        const n = data.particles[i];
        idle.set(
          Math.sin(time * n.speed * 1.8 + n.phase) * 0.42,
          Math.cos(time * n.speed * 1.4 + n.phase) * 0.42,
          Math.sin(time * n.speed * 1.6 + n.phase) * 0.42,
        );
        v.copy(n.corePos).lerp(n.clusterPos, w.spread).add(idle);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      (particlesRef.current.material as THREE.PointsMaterial).opacity =
        0.46 - w.attention * 0.18 + w.reconnect * 0.14;
    }

    /* links ------------------------------------------------------------- */
    if (linesRef.current && data.links.length > 0) {
      const pos = linesRef.current.geometry.attributes.position.array as Float32Array;
      let k = 0;
      for (let i = 0; i < data.links.length; i++) {
        const q = nodePos[data.links[i]];
        pos[k++] = q.x;
        pos[k++] = q.y;
        pos[k++] = q.z;
      }
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      // Links are the visual language of the NURA Profile, so they only really
      // assert themselves during the reconnection beat.
      (linesRef.current.material as THREE.LineBasicMaterial).opacity =
        0.1 + w.reconnect * 0.42 - w.attention * 0.06;
    }

    /* core -------------------------------------------------------------- */
    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.16;
      coreRef.current.rotation.x = time * 0.09;
      coreRef.current.scale.setScalar(Math.max(1 - w.spread * 0.82 + w.reconnect * 0.34, 0.01));
      const mat = coreRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = Math.max(0, 1 - w.spread * 1.2 + w.reconnect * 0.55);
    }

    /* orbits ------------------------------------------------------------ */
    if (orbitsRef.current) {
      orbitsRef.current.rotation.x = time * 0.08;
      orbitsRef.current.rotation.y = time * 0.12;
      orbitsRef.current.scale.setScalar(1 + w.spread * 1.4 - w.attention * 0.45);
      const opacity = Math.max(0, 0.34 - w.spread * 0.16 + w.reconnect * 0.12);
      for (const child of orbitsRef.current.children) {
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  });

  const lowQuality = glState.quality === 'low';

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        {/* Transmission forces an extra full-scene render target every frame.
            Worth it on desktop where it gives the core real volume; on weaker
            devices a standard material carries the same silhouette. */}
        {lowQuality ? (
          <meshStandardMaterial
            color="#3B67FF"
            emissive="#0a1020"
            roughness={0.25}
            metalness={0.1}
            flatShading
            transparent
          />
        ) : (
          <meshPhysicalMaterial
            color="#3B67FF"
            emissive="#0a1020"
            roughness={0.2}
            transmission={0.9}
            thickness={1.5}
            clearcoat={1}
            flatShading
            transparent
          />
        )}
      </mesh>

      <mesh scale={1.14}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial
          color="#7eeeff"
          transparent
          opacity={0.3}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <group ref={orbitsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.03, 12, lowQuality ? 48 : 96]} />
          <meshBasicMaterial
            color="#22D3E5"
            transparent
            opacity={0.34}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[2.8, 0.024, 12, lowQuality ? 48 : 96]} />
          <meshBasicMaterial
            color="#7557FF"
            transparent
            opacity={0.26}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <instancedMesh ref={nodesRef} args={[undefined, undefined, data.nodes.length]}>
        <sphereGeometry args={[1, lowQuality ? 8 : 12, lowQuality ? 8 : 12]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.8}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
        <instancedBufferAttribute
          attach="instanceColor"
          args={[data.nodeColors, 3]}
        />
      </instancedMesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[data.particleColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.05}
          transparent
          opacity={0.46}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#68ecff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
