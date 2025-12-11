import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ParticleState } from '../types';

interface PhotoPlanesProps {
  state: ParticleState;
  photoPaths: string[];
}

// 生成固定的位置：像灯带一样从顶部螺旋向下排列
function generatePhotoPositions(count: number, radius: number): Array<{ position: [number, number, number], rotation: [number, number, number] }> {
  const positions: Array<{ position: [number, number, number], rotation: [number, number, number] }> = [];
  
  // 参考灯带的参数
  const SPIRAL_HEIGHT = 18; // 螺旋总高度（考虑 group 的 0.5 缩放，实际是 9）
  const SPIRAL_REVS = 2.5; // 螺旋圈数（照片少，圈数也少一点）
  const MAX_RADIUS = radius; // 顶部最大半径
  const MIN_RADIUS = radius * 0.3; // 底部最小半径
  
  for (let i = 0; i < count; i++) {
    // 归一化进度：0（顶部）到 1（底部）
    const t = i / (count - 1);
    
    // 高度：从顶部到底部
    const y = SPIRAL_HEIGHT / 2 - (t * SPIRAL_HEIGHT);
    
    // 半径：从顶部到底部逐渐减小
    const r = MAX_RADIUS * (1 - t) + MIN_RADIUS * t;
    
    // 角度：沿着螺旋路径旋转
    const angle = t * Math.PI * 2 * SPIRAL_REVS;
    
    // 计算 XZ 平面位置
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
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
  
  // 选中的照片索引（null 表示没有选中）
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  
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
  
  // 点击检测：使用 Raycaster
  const { camera, gl, raycaster, pointer } = useThree();
  const meshesRef = useRef<Map<THREE.Mesh, number>>(new Map());
  
  // 处理点击事件
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (state !== ParticleState.SCATTERED) return;
      
      // 更新鼠标位置（归一化到 -1 到 1）
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // 更新 raycaster
      raycaster.setFromCamera(pointer, camera);
      
      // 检测与照片的交集（使用所有 mesh）
      const allMeshes = Array.from(meshesRef.current.keys());
      const intersects = raycaster.intersectObjects(allMeshes, true);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const photoIndex = meshesRef.current.get(clickedMesh);
        
        if (photoIndex !== undefined) {
          // 如果点击的是已选中的照片，则取消选中
          if (selectedPhotoIndex === photoIndex) {
            setSelectedPhotoIndex(null);
          } else {
            // 否则选中这张照片
            setSelectedPhotoIndex(photoIndex);
          }
        }
      } else {
        // 点击空白处，取消选中
        setSelectedPhotoIndex(null);
      }
    };
    
    gl.domElement.addEventListener('click', handleClick);
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [state, selectedPhotoIndex, camera, gl, raycaster, pointer]);
  
  // 当状态改变时，重置选中状态
  useEffect(() => {
    if (state !== ParticleState.SCATTERED) {
      setSelectedPhotoIndex(null);
    }
  }, [state]);
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // 只在散开状态显示
    const isScattered = state === ParticleState.SCATTERED;
    groupRef.current.visible = isScattered;
    
    if (isScattered && groupRef.current.visible) {
      // 如果有选中的照片，停止旋转
      if (selectedPhotoIndex === null) {
        // 缓慢旋转照片组
        groupRef.current.rotation.y += delta * 0.1;
      }
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
            isSelected={selectedPhotoIndex === index}
            onMeshRef={(mesh) => {
              if (mesh) {
                meshesRef.current.set(mesh, index);
              } else {
                // 需要找到并删除对应的 mesh
                for (const [m, idx] of meshesRef.current.entries()) {
                  if (idx === index) {
                    meshesRef.current.delete(m);
                    break;
                  }
                }
              }
            }}
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
  isSelected: boolean;
  onMeshRef: (mesh: THREE.Mesh | null) => void;
}

const PhotoPlane: React.FC<PhotoPlaneProps> = ({ index, position, rotation, texture, isVisible, isSelected, onMeshRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const lastCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const updateThreshold = 0.1; // 相机移动超过这个距离才更新
  
  // 动画状态
  const animationProgressRef = useRef(0); // 0 = 初始状态（小且透明），1 = 完全显示
  const targetAnimationRef = useRef(0); // 目标动画状态
  
  // 选中状态的动画
  const selectedProgressRef = useRef(0); // 0 = 未选中，1 = 完全选中
  const targetSelectedRef = useRef(0);
  
  // 原始位置和目标位置
  const originalPositionRef = useRef(new THREE.Vector3(...position));
  const targetPositionRef = useRef(new THREE.Vector3());
  const currentPositionRef = useRef(new THREE.Vector3(...position));
  
  // 注册 mesh 引用
  useEffect(() => {
    if (meshRef.current) {
      onMeshRef(meshRef.current);
    }
    return () => {
      onMeshRef(null);
    };
  }, [onMeshRef]);
  
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
      const delay = index * 200; // 每张照片延迟200ms
      const timer = setTimeout(() => {
        targetAnimationRef.current = 1;
      }, delay);
      return () => clearTimeout(timer);
    } else {
      // 隐藏时重置动画状态
      targetAnimationRef.current = 0;
      animationProgressRef.current = 0;
      targetSelectedRef.current = 0;
      selectedProgressRef.current = 0;
    }
  }, [isVisible, index]);
  
  // 当选中状态改变时，更新目标位置
  React.useEffect(() => {
    if (isSelected) {
      targetSelectedRef.current = 1;
      // 计算目标位置：在 group 的本地坐标系中，将照片移到中心前面
      // group 的缩放是 0.5，所以需要相应调整
      // 目标位置：在 group 中心前面，稍微偏上
      // 由于 group 在 [0, 0.5, 0]，缩放 0.5，所以照片的本地坐标需要相应调整
      const localDistance = 5.0; // 在 group 本地坐标系中的距离
      targetPositionRef.current.set(0, 0.5, -localDistance); // 在 group 中心前面
    } else {
      targetSelectedRef.current = 0;
      // 恢复原始位置
      targetPositionRef.current.copy(originalPositionRef.current);
    }
  }, [isSelected]);
  
  // 优化：只在相机位置显著变化时更新朝向，减少每帧计算
  // 同时处理动画
  useFrame((_, delta) => {
    if (meshRef.current) {
      const cameraPos = camera.position;
      const distance = cameraPos.distanceTo(lastCameraPositionRef.current);
      
      // 选中状态下，始终面向相机
      if (isSelected || distance > updateThreshold) {
        meshRef.current.lookAt(cameraPos);
        lastCameraPositionRef.current.copy(cameraPos);
      }
      
      // 选中状态动画过渡
      selectedProgressRef.current = THREE.MathUtils.lerp(
        selectedProgressRef.current,
        targetSelectedRef.current,
        delta * 3.0 // 选中动画速度较快
      );
      
      // 设置渲染顺序：选中的照片显示在最前面
      meshRef.current.renderOrder = isSelected ? 100 : 0;
      
      // 位置过渡：从未选中位置到选中位置
      currentPositionRef.current.lerp(targetPositionRef.current, delta * 3.0);
      meshRef.current.position.copy(currentPositionRef.current);
      
      // 动画过渡：平滑淡入和缩放
      animationProgressRef.current = THREE.MathUtils.lerp(
        animationProgressRef.current, 
        targetAnimationRef.current, 
        delta * 0.5 // 动画速度
      );
      
      // 基础缩放：从0.3倍缩放到1倍
      const baseScale = THREE.MathUtils.lerp(0.3, 1.0, animationProgressRef.current);
      
      // 选中时的额外缩放：从1倍到2.5倍
      const selectedScale = THREE.MathUtils.lerp(1.0, 2.5, selectedProgressRef.current);
      
      // 最终缩放 = 基础缩放 * 选中缩放
      const finalScale = baseScale * selectedScale;
      meshRef.current.scale.set(finalScale, finalScale, finalScale);
      
      // 透明度动画
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        // 基础透明度：从0到1
        const baseOpacity = animationProgressRef.current;
        // 如果未选中，且当前有选中状态（selectedProgressRef > 0），则降低透明度
        // 这样可以突出显示选中的照片
        const dimmedOpacity = (!isSelected && selectedProgressRef.current > 0.1) ? 0.3 : 1.0;
        material.opacity = baseOpacity * dimmedOpacity;
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

