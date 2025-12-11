import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ParticleState, ParticleData, ParticleType } from '../types';
import { generateParticles } from '../utils/geometry';

interface MagicParticlesProps {
  state: ParticleState;
}

const PARTICLE_COUNT = 3000; // 减少粒子数量提升性能

// Reusable physics/rendering component
const ParticleGroup = ({ 
  data, 
  geometry, 
  material, 
  globalState 
}: { 
  data: ParticleData[], 
  geometry: THREE.BufferGeometry, 
  material: THREE.Material,
  globalState: ParticleState
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = data.length;
  
  const transitionRef = useRef(0); // 0 = Scattered, 1 = Tree
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const posA = useMemo(() => new THREE.Vector3(), []);
  const posB = useMemo(() => new THREE.Vector3(), []);
  const rotA = useMemo(() => new THREE.Quaternion(), []);
  const rotB = useMemo(() => new THREE.Quaternion(), []);
  const scaleVec = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((p, i) => {
      meshRef.current!.setColorAt(i, new THREE.Color(p.color[0], p.color[1], p.color[2]));
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [data]);

  // 性能优化：分批更新粒子，减少单帧计算量
  const updateBatchRef = useRef(0);
  const BATCH_SIZE = Math.max(1, Math.floor(count / 3)); // 每帧更新1/3的粒子
  
  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;

    // Transition Logic - 进一步降低过渡速度
    let targetT = 0;
    if (globalState === ParticleState.TREE_SHAPE) {
        targetT = 1;
    }
    // 降低过渡速度：让动画更平滑
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, targetT, delta * 1.0);
    const t = transitionRef.current;

    // 简化的缓动函数（减少计算）
    const ease = t * t * (3 - 2 * t); // 平滑步进，比三次方计算更快
    const time = stateThree.clock.elapsedTime;

    // 性能优化：在过渡期间跳过所有额外计算
    const isTransitioning = Math.abs(transitionRef.current - targetT) > 0.01;

    // 分批更新：每帧只更新一部分粒子
    const startIdx = updateBatchRef.current * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, count);
    
    for (let i = startIdx; i < endIdx; i++) {
      const p = data[i];

      // Position Lerp
      posA.set(p.scatterPosition[0], p.scatterPosition[1], p.scatterPosition[2]);
      posB.set(p.treePosition[0], p.treePosition[1], p.treePosition[2]);
      
      // 过渡时完全跳过浮动动画
      if (!isTransitioning) {
        const hover = Math.sin(time * p.speed + p.phase) * (0.15 * (1 - t) + 0.02 * t);
        posA.y += hover;
      }
      
      dummy.position.lerpVectors(posA, posB, ease);
      
      // Rotation Slerp
      rotA.set(p.scatterRotation[0], p.scatterRotation[1], p.scatterRotation[2], p.scatterRotation[3]);
      rotB.set(p.treeRotation[0], p.treeRotation[1], p.treeRotation[2], p.treeRotation[3]);
      
      dummy.quaternion.slerpQuaternions(rotA, rotB, ease);
      
      // 过渡时完全跳过旋转和脉冲
      if (!isTransitioning) {
        const spinRate = (1 - t) * 0.5;
        if (p.type === ParticleType.STAR) {
          dummy.rotation.z = Math.sin(time * 0.5) * 0.1;
          dummy.rotation.y += delta * 0.5; 
        } else {
          dummy.rotateY(time * spinRate * p.speed);
        }
      }

      // Scale - 过渡时使用固定缩放
      let pulse = 1;
      if (!isTransitioning) {
        if (p.type === ParticleType.SPARKLE) {
          pulse = 0.5 + Math.abs(Math.sin(time * 8 + p.phase));
        } else if (p.type === ParticleType.RIBBON) {
          pulse = 1 + Math.sin(time * 2 + p.phase) * 0.1;
        } else {
          pulse = 1 + Math.sin(time * 3 + p.phase) * 0.05;
        }
      }
      
      scaleVec.setScalar(p.scale * pulse);
      dummy.scale.copy(scaleVec);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    // 更新批次索引
    updateBatchRef.current = (updateBatchRef.current + 1) % 3;
    
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Gentle global rotation in Tree mode
    if (t > 0.1 && !isTransitioning) {
      meshRef.current.rotation.y = time * 0.1 * ease;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
};

export const MagicParticles: React.FC<MagicParticlesProps> = ({ state }) => {
  const { needles, ornaments, ribbon, star, sparkles } = useMemo(() => {
    const allData = generateParticles(PARTICLE_COUNT);
    return {
      needles: allData.filter(p => p.type === ParticleType.NEEDLE),
      ornaments: allData.filter(p => p.type === ParticleType.ORNAMENT),
      ribbon: allData.filter(p => p.type === ParticleType.RIBBON),
      star: allData.filter(p => p.type === ParticleType.STAR),
      sparkles: allData.filter(p => p.type === ParticleType.SPARKLE),
    };
  }, []);

  // --- GEOMETRIES ---

  const needleGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.01, 0.04, 0.5, 4);
    geo.translate(0, 0.25, 0); 
    return geo;
  }, []);

  const ornamentGeo = useMemo(() => new THREE.IcosahedronGeometry(0.2, 2), []);
  
  const ribbonGeo = useMemo(() => {
      const geo = new THREE.SphereGeometry(0.2, 8, 8);
      geo.scale(1.2, 0.6, 1.2); 
      return geo;
  }, []);

  const sparkleGeo = useMemo(() => new THREE.OctahedronGeometry(0.1, 0), []);

  const starGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.5; 
    const innerRadius = 0.25;
    
    // Start at top point
    shape.moveTo(0, outerRadius);
    
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        // Simple logic for points is sufficient via custom path or shape
    }
    // Explicit star path
    const starPoints = [];
    for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? 0.6 : 0.3;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        starPoints.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad));
    }
    const s = new THREE.Shape(starPoints);

    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 1
    };
    const geometry = new THREE.ExtrudeGeometry(s, extrudeSettings);
    geometry.rotateZ(Math.PI); // Adjust orientation
    geometry.center(); 
    return geometry;
  }, []);

  // --- MATERIALS ---

  const needleMat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  }), []);

  const goldMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffd700",
    roughness: 0.05,
    metalness: 1.0,
    clearcoat: 1.0,
    emissive: new THREE.Color("#d4af37"),
    emissiveIntensity: 0.2
  }), []);
  
  const neonMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#F4C2C2"), // Baby Pink base
    emissive: new THREE.Color("#FFB7CE"), // Soft pink glow
    emissiveIntensity: 2.0,
    toneMapped: false,
    roughness: 0.2,
    metalness: 0.5
  }), []);
  
  // Glowing Yellow for Star
  const starMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffd700", 
    emissive: "#ffd700",
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.8
  }), []);

  const sparkleMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false 
  }), []);

  return (
    <group>
      {/* 1. Base Tree Volume (Needles) */}
      {needles.length > 0 && <ParticleGroup data={needles} geometry={needleGeo} material={needleMat} globalState={state} />}
      
      {/* 2. Ornaments (Gold Spheres) */}
      {ornaments.length > 0 && <ParticleGroup data={ornaments} geometry={ornamentGeo} material={goldMat} globalState={state} />}
      
      {/* 3. Ribbon (Glowing Baby Pink) */}
      {ribbon.length > 0 && <ParticleGroup data={ribbon} geometry={ribbonGeo} material={neonMat} globalState={state} />}
      
      {/* 4. Sparkles */}
      {sparkles.length > 0 && <ParticleGroup data={sparkles} geometry={sparkleGeo} material={sparkleMat} globalState={state} />}
      
      {/* 5. Top Star */}
      {star.length > 0 && <ParticleGroup data={star} geometry={starGeo} material={starMat} globalState={state} />}
    </group>
  );
};
