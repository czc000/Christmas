import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ParticleState } from '../types';

interface PhotoPlanesProps {
  state: ParticleState;
  photoPaths: string[];
}

// 生成固定的位置：沿圆周分布，有高低起伏
function generatePhotoPositions(count: number, radius: number): Array<{ position: [number, number, number], rotation: [number, number, number] }> {
  const positions: Array<{ position: [number, number, number], rotation: [number, number, number] }> = [];
  // 使用固定种子确保位置不变
  const seed = 12345;
  
  for (let i = 0; i < count; i++) {
    // 简单的伪随机数生成器（固定种子）
    let rng = (seed + i * 7919) % 2147483647;
    const heightRng = (rng / 2147483647);
    
    // 沿圆周均匀分布
    const angle = (i / count) * Math.PI * 2;
    
    // 圆周位置（XZ平面）
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    
    // 高度起伏（Y轴变化），范围 -3 到 3
    const y = (heightRng - 0.5) * 6;
    
    // 不需要旋转，保持面向相机
    positions.push({
      position: [x, y, z],
      rotation: [0, 0, 0]
    });
  }
  
  return positions;
}

export const PhotoPlanes: React.FC<PhotoPlanesProps> = ({ state, photoPaths }) => {
  const groupRef = useRef<THREE.Group>(null);
  // 根据设备性能自动调整照片数量
  // 如果照片文件很大，可以减少这个数量以提升性能
  const MAX_PHOTOS = Math.min(photoPaths.length, 8); // 最多显示8张照片（从20减少到8以提升性能）
  const photoCount = MAX_PHOTOS;
  const radius = 10; // 圆周半径，间隔会更大
  
  // 生成固定的照片位置
  const positions = useMemo(() => {
    return generatePhotoPositions(photoCount, radius);
  }, [photoCount]);
  
  // 加载纹理（使用状态跟踪加载完成）
  const [textures, setTextures] = useState<THREE.Texture[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  
  // 限制纹理最大尺寸，提升性能
  const MAX_TEXTURE_SIZE = 1024; // 最大纹理尺寸 1024x1024
  
  // 压缩纹理尺寸的函数
  const resizeImage = (image: HTMLImageElement, maxSize: number): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(image);
        return;
      }
      
      let width = image.width;
      let height = image.height;
      
      // 如果图片尺寸超过限制，进行缩放
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(image, 0, 0, width, height);
      
      const resizedImage = new Image();
      resizedImage.onload = () => resolve(resizedImage);
      resizedImage.src = canvas.toDataURL('image/jpeg', 0.85); // 85% 质量，平衡质量和文件大小
    });
  };
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const texturePromises = photoPaths.slice(0, photoCount).map((path, index) => {
      return new Promise<THREE.Texture>((resolve, reject) => {
        // 先加载图片
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            // 压缩图片尺寸
            const resizedImg = await resizeImage(img, MAX_TEXTURE_SIZE);
            
            // 创建纹理
            const texture = new THREE.Texture(resizedImg);
            texture.needsUpdate = true;
            
            // 优化纹理设置
            texture.minFilter = THREE.LinearMipmapLinearFilter; // 使用 mipmap 提升性能
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            texture.colorSpace = THREE.SRGBColorSpace;
            
            // 设置纹理格式优化
            texture.format = THREE.RGBAFormat;
            
            // 禁用不必要的功能
            texture.anisotropy = 1; // 降低各向异性过滤
            
            console.log(`成功加载并压缩照片: ${path} (${resizedImg.width}x${resizedImg.height})`);
            setLoadedCount(prev => prev + 1);
            resolve(texture);
          } catch (err) {
            console.error(`处理照片失败 ${path}:`, err);
            reject(err);
          }
        };
        
        img.onerror = (err) => {
          console.error(`加载照片失败 ${path}:`, err);
          reject(err);
        };
        
        img.src = `./my_picture/${path}`;
      });
    });
    
    Promise.all(texturePromises).then(loadedTextures => {
      setTextures(loadedTextures);
      console.log(`所有照片加载完成，共 ${loadedTextures.length} 张`);
    }).catch(err => {
      console.error('部分照片加载失败:', err);
    });
  }, [photoPaths, photoCount]);
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // 只在散开状态显示
    const isScattered = state === ParticleState.SCATTERED;
    groupRef.current.visible = isScattered;
    
    if (isScattered && groupRef.current.visible) {
      // 缓慢旋转照片组
      groupRef.current.rotation.y += delta * 0.1;
    } else {
      // 当状态改变时，重置所有照片的动画状态
      // 这样下次显示时会重新播放动画
    }
  });
  
  // 调试：打印照片信息
  React.useEffect(() => {
    if (state === ParticleState.SCATTERED) {
      console.log(`显示 ${photoCount} 张照片，位置半径: ${radius}`);
    }
  }, [state, photoCount, radius]);

  return (
    <group ref={groupRef} visible={state === ParticleState.SCATTERED && textures.length > 0}>
      {textures.map((texture, index) => {
        if (index >= positions.length) return null;
        if (!texture || !texture.image) return null;
        
        const posData = positions[index];
        return (
          <PhotoPlane
            key={index}
            index={index}
            position={posData.position}
            rotation={posData.rotation}
            texture={texture}
            isVisible={state === ParticleState.SCATTERED}
          />
        );
      })}
    </group>
  );
};

interface PhotoPlaneProps {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  texture: THREE.Texture;
  isVisible: boolean;
}

const PhotoPlane: React.FC<PhotoPlaneProps> = ({ index, position, rotation, texture, isVisible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const lastCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const updateThreshold = 0.1; // 相机移动超过这个距离才更新
  
  // 动画状态
  const animationProgressRef = useRef(0); // 0 = 初始状态（小且透明），1 = 完全显示
  const targetAnimationRef = useRef(0); // 目标动画状态
  
  // 设置初始旋转
  React.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [rotation]);
  
  // 当可见性改变时，触发动画
  React.useEffect(() => {
    if (isVisible) {
      // 每张照片错开出现，延迟时间根据索引递增
      const delay = index * 200; // 每张照片延迟80ms
      const timer = setTimeout(() => {
        targetAnimationRef.current = 1;
      }, delay);
      return () => clearTimeout(timer);
    } else {
      // 隐藏时重置动画状态
      targetAnimationRef.current = 0;
      animationProgressRef.current = 0;
    }
  }, [isVisible, index]);
  
  // 优化：只在相机位置显著变化时更新朝向，减少每帧计算
  // 同时处理动画
  useFrame((_, delta) => {
    if (meshRef.current) {
      const cameraPos = camera.position;
      const distance = cameraPos.distanceTo(lastCameraPositionRef.current);
      
      // 只在相机移动足够远时才更新朝向
      if (distance > updateThreshold) {
        meshRef.current.lookAt(cameraPos);
        lastCameraPositionRef.current.copy(cameraPos);
      }
      
      // 动画过渡：平滑淡入和缩放
      animationProgressRef.current = THREE.MathUtils.lerp(
        animationProgressRef.current, 
        targetAnimationRef.current, 
        delta * 0.5 // 动画速度
      );
      
      // 应用缩放动画：从0.3倍缩放到1倍
      const scale = THREE.MathUtils.lerp(0.3, 1.0, animationProgressRef.current);
      meshRef.current.scale.set(scale, scale, scale);
      
      // 应用透明度动画：从0到1
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = animationProgressRef.current;
      }
    }
  });

  const material = useMemo(() => {
    if (!texture || !texture.image) {
      console.warn('照片纹理无效');
      return new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0 });
    }
    
    // 确保纹理颜色空间正确
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // 优化材质设置，初始透明度为0
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.0, // 初始透明，通过动画变为1
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false, // 禁用色调映射，减少计算
      color: new THREE.Color(0.9, 0.9, 0.9),
    });
  }, [texture]);
  
  return (
    <mesh ref={meshRef} position={position} material={material} scale={[0.3, 0.3, 0.3]}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  );
};

