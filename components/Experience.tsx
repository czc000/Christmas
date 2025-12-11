import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { MagicParticles } from './MagicParticles';
import { PhotoPlanes } from './PhotoPlanes';
import { ParticleState } from '../types';
import * as THREE from 'three';

interface ExperienceProps {
  state: ParticleState;
  handRotation: number;
  photoPaths?: string[];
}

const SceneContent: React.FC<{ state: ParticleState, handRotation: number, photoPaths?: string[] }> = ({ state, handRotation, photoPaths = [] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotationVelocityRef = useRef(0);
  const lastHandRotationRef = useRef(0);
  const isManualControlRef = useRef(false);
  const idleTimerRef = useRef(0);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // 计算手部旋转的变化速度
      const handRotationDelta = handRotation - lastHandRotationRef.current;
      lastHandRotationRef.current = handRotation;
      
      // 如果手在移动，累积速度并标记为手动控制
      if (Math.abs(handRotationDelta) > 0.001) {
        rotationVelocityRef.current += handRotationDelta * 2.0; // 增大惯性系数
        rotationVelocityRef.current = Math.max(-3, Math.min(3, rotationVelocityRef.current)); // 增大最大速度
        isManualControlRef.current = true;
        idleTimerRef.current = 0; // 重置空闲计时器
      } else {
        // 手没有移动，增加空闲时间
        idleTimerRef.current += delta;
      }
      
      // 应用旋转速度
      groupRef.current.rotation.y += rotationVelocityRef.current * delta;
      
      // 逐渐减速（减小阻尼，让惯性更大）
      rotationVelocityRef.current *= (1 - delta * 0.3); // 减小阻尼系数，让减速更慢
      
      // 如果速度很小，直接设为0
      if (Math.abs(rotationVelocityRef.current) < 0.005) {
        rotationVelocityRef.current = 0;
      }
      
      // 只有在完全停止且空闲一段时间后，才恢复默认旋转
      if (Math.abs(rotationVelocityRef.current) < 0.01 && idleTimerRef.current > 2.0) {
        isManualControlRef.current = false;
        // 恢复默认缓慢旋转
        groupRef.current.rotation.y += 0.1 * delta;
      }
    }
  });

  return (
    // Scaled down by 50% and elevated to ensure separation from UI
    <group ref={groupRef} position={[0, 0.5, 0]} scale={[0.5, 0.5, 0.5]}>
      <MagicParticles state={state} />
      {photoPaths.length > 0 && (
        <PhotoPlanes state={state} photoPaths={photoPaths} />
      )}
    </group>
  );
};

export const Experience: React.FC<ExperienceProps> = ({ state, handRotation, photoPaths = [] }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 45 }}
      dpr={[1, 1.5]} // 降低像素比提升性能
      gl={{ antialias: false, toneMappingExposure: 1.1, powerPreference: "high-performance" }}
    >
      <color attach="background" args={['#0d1520']} />

      {/* Environment Map for Gold Reflections */}
      <Environment preset="city" />

      {/* Ambient Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#ffc0cb" />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#fff0f5" />
      <pointLight position={[-10, -5, -10]} intensity={0.8} color="#ffb7c5" />
      
      <spotLight
        position={[5, 12, 5]}
        angle={0.4}
        penumbra={1}
        intensity={2.5}
        castShadow
        color="#fff8e7" 
      />

      {/* Main Content */}
      <SceneContent state={state} handRotation={handRotation} photoPaths={photoPaths} />

      {/* Manual Controls */}
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={25}
        autoRotate={false} 
        dampingFactor={0.05}
      />

      {/* Cinematic Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.5} 
          mipmapBlur={false} 
          intensity={0.8} 
          radius={0.3}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
};
