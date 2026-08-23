'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { glState } from './store';

const CLUSTER_CENTERS = [
  new THREE.Vector3(-4, 2, 2),  // Attention
  new THREE.Vector3(4, 3, -1),  // Cognition
  new THREE.Vector3(3, -3, 2),  // Personality
  new THREE.Vector3(-3, -2, -2), // Behavior
  new THREE.Vector3(0, -4, 1)   // Career
];

const COLORS = [
  new THREE.Color('#22D3E5'),
  new THREE.Color('#3B67FF'),
  new THREE.Color('#7557FF'),
  new THREE.Color('#22D3E5'),
  new THREE.Color('#FFFFFF'),
];

export function NuraCore() {
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const orbitsRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const N_NODES = 56;
  const N_PARTICLES = 260;

  const { nodeData, particleData, lineIndices } = useMemo(() => {
    const nData = Array.from({ length: N_NODES }, (_, i) => {
      const clusterIdx = i % 5;
      const r = Math.random() * 2.5 + 1.2;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const initialPos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      
      const cr = Math.random() * 1.8;
      const ctheta = Math.random() * 2 * Math.PI;
      const cphi = Math.acos(Math.random() * 2 - 1);
      const clusterOffset = new THREE.Vector3(
        cr * Math.sin(cphi) * Math.cos(ctheta),
        cr * Math.sin(cphi) * Math.sin(ctheta),
        cr * Math.cos(cphi)
      );

      return { clusterIdx, initialPos, clusterOffset, speed: Math.random() * 0.5 + 0.2 };
    });

    const pData = Array.from({ length: N_PARTICLES }, (_, i) => {
      const clusterIdx = i % 5;
      const r = Math.random() * 4.5 + 1.5;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const initialPos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      
      const cr = Math.random() * 2.5;
      const ctheta = Math.random() * 2 * Math.PI;
      const cphi = Math.acos(Math.random() * 2 - 1);
      const clusterOffset = new THREE.Vector3(
        cr * Math.sin(cphi) * Math.cos(ctheta),
        cr * Math.sin(cphi) * Math.sin(ctheta),
        cr * Math.cos(cphi)
      );
      return { clusterIdx, initialPos, clusterOffset, speed: Math.random() * 1 + 0.5 };
    });

    const lIndices: number[] = [];
    const MAX_LINKS = 42;
    for (let i = 0; i < N_NODES; i++) {
      for (let j = i + 1; j < N_NODES; j++) {
        if (lIndices.length / 2 >= MAX_LINKS) break;
        if (nData[i].clusterIdx === nData[j].clusterIdx && Math.random() > 0.88) {
          lIndices.push(i, j);
        } else if (Math.random() > 0.994) {
          lIndices.push(i, j);
        }
      }
    }

    return { nodeData: nData, particleData: pData, lineIndices: lIndices };
  }, []);

  const particlePositions = useMemo(() => new Float32Array(N_PARTICLES * 3), []);
  const linePositions = useMemo(() => new Float32Array(lineIndices.length * 3), [lineIndices]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);
  const _nodePos = useMemo(() => new Array(N_NODES).fill(0).map(() => new THREE.Vector3()), []);

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const howProgress = glState.howProgress;
    const profileFocus = glState.profileFocus;
    const sceneSpread = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(glState.coreSpread, 0.52, howProgress),
      0.2,
      profileFocus,
    );
    const attentionFocus = glState.attentionFocus * (1 - howProgress);
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.05 + glState.scrollProgress * Math.PI * 0.5;
      groupRef.current.rotation.x = Math.sin(time * 0.03) * 0.1;
      const baseScale = glState.isMobile ? 1.18 : 1.34;
      groupRef.current.scale.setScalar(baseScale - howProgress * 0.18 + profileFocus * 0.15);
      groupRef.current.position.x = glState.isMobile
        ? 1.3 + howProgress * 0.7 - profileFocus * 0.25
        : howProgress * 3.3 - profileFocus * 2.2;
      groupRef.current.position.y = glState.isMobile
        ? -2.45 + howProgress * 0.25 + profileFocus * 0.65
        : howProgress * 0.15 + profileFocus * 0.35;
    }

    const baseCamZ = glState.isMobile ? 22 : 14;
    const targetCamZ = baseCamZ - attentionFocus * 8 + glState.reconnectProgress * 2 + howProgress * 1.2 - profileFocus * 0.35;
    const baseCamX = glState.isMobile ? 0 : -3.5;
    const targetCamX = baseCamX + attentionFocus * -2.5 + howProgress * 0.9;
    const targetCamY = attentionFocus * 1 + profileFocus * 0.18;

    camera.position.x += (targetCamX + glState.mouseX * 1.5 - camera.position.x) * 0.05;
    camera.position.y += (targetCamY + glState.mouseY * 1.5 - camera.position.y) * 0.05;
    camera.position.z += (targetCamZ - camera.position.z) * 0.05;
    
    const targetLook = new THREE.Vector3(targetCamX * 0.8, targetCamY * 0.8, 0);
    const currentLook = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));
    currentLook.lerp(targetLook, 0.05);
    camera.lookAt(currentLook);

    if (nodesRef.current) {
      nodeData.forEach((data, i) => {
        const center = CLUSTER_CENTERS[data.clusterIdx];
        const idle = new THREE.Vector3(
          Math.sin(time * data.speed + i) * 0.2,
          Math.cos(time * data.speed * 1.2 + i) * 0.2,
          Math.sin(time * data.speed * 0.8 + i) * 0.2
        );

        _v.copy(data.initialPos)
          .lerp(center.clone().add(data.clusterOffset), sceneSpread)
          .add(idle);
          
        _nodePos[i].copy(_v);
        
        dummy.position.copy(_v);
        
        let scale = 1;
        if (attentionFocus > 0) {
           if (data.clusterIdx !== 0) {
              scale = 1 - attentionFocus * 0.8;
           } else {
              scale = 1 + attentionFocus * 0.5;
           }
        }
        if (glState.reconnectProgress > 0) {
           scale *= (1 + glState.reconnectProgress * 0.3);
        }
        if (profileFocus > 0) {
          const clusterPulse = 1 + Math.sin(time * 1.1 + data.clusterIdx * 1.4) * 0.08;
          scale *= 1 + profileFocus * (0.22 + (data.clusterIdx % 2) * 0.06) * clusterPulse;
        }

        dummy.scale.setScalar(scale * 0.095);
        dummy.updateMatrix();
        nodesRef.current!.setMatrixAt(i, dummy.matrix);
      });
      nodesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      particleData.forEach((data, i) => {
        const center = CLUSTER_CENTERS[data.clusterIdx];
        const idle = new THREE.Vector3(
          Math.sin(time * data.speed * 2 + i) * 0.5,
          Math.cos(time * data.speed * 1.5 + i) * 0.5,
          Math.sin(time * data.speed * 1.8 + i) * 0.5
        );
        _v.copy(data.initialPos)
          .lerp(center.clone().add(data.clusterOffset), sceneSpread)
          .add(idle);
          
        positions[i * 3] = _v.x;
        positions[i * 3 + 1] = _v.y;
        positions[i * 3 + 2] = _v.z;
      });
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
        (particlesRef.current.material as THREE.PointsMaterial).opacity = Math.min(
          0.78,
          0.5 - (attentionFocus * 0.16) + (glState.reconnectProgress * 0.1) + (profileFocus * 0.16),
        );
    }

    if (linesRef.current) {
      const positions = linesRef.current.geometry.attributes.position.array as Float32Array;
      let idx = 0;
      for (let i = 0; i < lineIndices.length; i++) {
        const nIdx = lineIndices[i];
        const pos = _nodePos[nIdx];
        positions[idx++] = pos.x;
        positions[idx++] = pos.y;
        positions[idx++] = pos.z;
      }
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      (linesRef.current.material as THREE.LineBasicMaterial).opacity = 0.18 + glState.reconnectProgress * 0.2 + profileFocus * 0.14;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.2;
      coreRef.current.rotation.x = time * 0.1;
      
      const coreScale = 1 - (sceneSpread * 0.8) + (glState.reconnectProgress * 0.2) + profileFocus * 0.05;
      coreRef.current.scale.setScalar(Math.max(coreScale, 0.01));
      
      const mat = coreRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = Math.min(0.92, Math.max(0.08, 1 - sceneSpread * 1.2 + (glState.reconnectProgress * 0.5) + profileFocus * 0.1));
      mat.transparent = true;
    }

    if (orbitsRef.current) {
      orbitsRef.current.rotation.x = time * 0.1;
      orbitsRef.current.rotation.y = time * 0.15;
      
      const orbitScale = 1 + sceneSpread * 1.5 - attentionFocus * 0.5 - howProgress * 0.22 + profileFocus * 0.32;
      orbitsRef.current.scale.setScalar(orbitScale);
      
      orbitsRef.current.children.forEach((child: THREE.Object3D) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = Math.min(0.72, Math.max(0.12, 0.38 - (sceneSpread * 0.12) + profileFocus * 0.25));
      });
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshPhysicalMaterial 
          color="#3B67FF" 
          emissive="#0a1020"
          roughness={0.2}
          transmission={0.9}
          thickness={1.5}
          clearcoat={1}
          flatShading={true}
        />
      </mesh>
      <mesh scale={1.14}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial
          color="#7eeeff"
          transparent
          opacity={0.32}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <group ref={orbitsRef}>
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[2.5, 0.032, 16, 100]} />
          <meshBasicMaterial color="#22D3E5" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh rotation={[0, Math.PI/2, 0]}>
          <torusGeometry args={[2.8, 0.025, 16, 100]} />
          <meshBasicMaterial color="#7557FF" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <instancedMesh ref={nodesRef} args={[undefined, undefined, N_NODES]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#c6fbff"
          transparent
          opacity={0.72}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial 
          size={0.055} 
          color="#c6fbff" 
          transparent 
          opacity={0.5}
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#68ecff" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
