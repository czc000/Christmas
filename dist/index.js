// index.tsx
import React6 from "react";
import ReactDOM from "react-dom/client";

// App.tsx
import { useState as useState3, useCallback } from "react";

// components/Experience.tsx
import { useRef as useRef3 } from "react";
import { Canvas, useFrame as useFrame3 } from "@react-three/fiber";
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

// components/MagicParticles.tsx
import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE2 from "three";
import { useFrame } from "@react-three/fiber";

// utils/geometry.ts
import * as THREE from "three";
var PALETTE = {
  NEEDLE: [
    new THREE.Color("#013220"),
    // Dark Green
    new THREE.Color("#0B6623"),
    // Forest Green
    new THREE.Color("#1B4D3E"),
    // Deep Emerald
    new THREE.Color("#228B22"),
    // Forest
    new THREE.Color("#004225")
    // British Racing Green
  ],
  RIBBON: [
    new THREE.Color("#F4C2C2"),
    // Baby Pink
    new THREE.Color("#FFD1DC"),
    // Pastel Pink
    new THREE.Color("#FFB7CE"),
    // Light Pink
    new THREE.Color("#FFC1CC")
    // Bubblegum (Soft)
  ],
  ORNAMENT: [
    new THREE.Color("#ffd700"),
    // Gold
    new THREE.Color("#d4af37")
    // Metallic Gold
  ],
  STAR: [
    new THREE.Color("#ffd700"),
    // Gold
    new THREE.Color("#ffec8b"),
    // Light Goldenrod
    new THREE.Color("#ffdf00")
    // Golden Yellow
  ],
  SPARKLE: [
    new THREE.Color("#fffacd"),
    // Lemon Chiffon
    new THREE.Color("#ffffff"),
    // White
    new THREE.Color("#ffd700")
    // Gold
  ]
};
var dummyObj = new THREE.Object3D();
var randomInSphere = (radius) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return [x, y, z];
};
var getRandomRotation = () => {
  dummyObj.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );
  dummyObj.updateMatrix();
  return [dummyObj.quaternion.x, dummyObj.quaternion.y, dummyObj.quaternion.z, dummyObj.quaternion.w];
};
var generateParticles = (count) => {
  const data = [];
  const TREE_HEIGHT = 9;
  const MAX_RADIUS = 3.8;
  const SPIRAL_REVS = 4.5;
  data.push(createParticle("STAR" /* STAR */, 0, TREE_HEIGHT / 2 + 0.2, 0, 0, 0));
  const ribbonCount = 1200;
  for (let i = 0; i < ribbonCount; i++) {
    const t = i / ribbonCount;
    const h = -TREE_HEIGHT / 2 + t * TREE_HEIGHT;
    const r = MAX_RADIUS * (1 - t) + 0.3;
    const angle = t * Math.PI * 2 * SPIRAL_REVS;
    const jitterX = (Math.random() - 0.5) * 0.1;
    const jitterY = (Math.random() - 0.5) * 0.1;
    const jitterZ = (Math.random() - 0.5) * 0.1;
    const x = Math.cos(angle) * r + jitterX;
    const z = Math.sin(angle) * r + jitterZ;
    const y = h + jitterY;
    data.push(createParticle("RIBBON" /* RIBBON */, x, y, z, r, t));
  }
  const sparkleCount = 400;
  for (let i = 0; i < sparkleCount; i++) {
    const hRaw = Math.random();
    const h = -TREE_HEIGHT / 2 + hRaw * TREE_HEIGHT;
    const maxR = MAX_RADIUS * (1 - hRaw) + 0.5;
    const r = Math.random() * maxR;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    data.push(createParticle("SPARKLE" /* SPARKLE */, x, h, z, r, hRaw));
  }
  const remaining = Math.floor(count * 1.5) - ribbonCount - sparkleCount;
  for (let i = 0; i < remaining; i++) {
    const rnd = Math.random();
    let type = "NEEDLE" /* NEEDLE */;
    if (rnd > 0.95) type = "ORNAMENT" /* ORNAMENT */;
    const hRaw = Math.pow(Math.random(), 0.9);
    const h = -TREE_HEIGHT / 2 + hRaw * TREE_HEIGHT;
    const maxR = MAX_RADIUS * (1 - hRaw);
    const r = type === "NEEDLE" /* NEEDLE */ ? Math.sqrt(Math.random()) * maxR : maxR * (0.85 + Math.random() * 0.15);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    data.push(createParticle(type, x, h, z, r, hRaw));
  }
  return data;
};
function createParticle(type, tx, ty, tz, radiusAtHeight, heightNorm) {
  const scatterPos = randomInSphere(12);
  const scatterRot = getRandomRotation();
  const treeQ = new THREE.Quaternion();
  if (type === "STAR" /* STAR */) {
    dummyObj.rotation.set(0, 0, 0);
  } else if (type === "NEEDLE" /* NEEDLE */) {
    dummyObj.position.set(0, 0, 0);
    dummyObj.lookAt(tx, 0, tz);
    dummyObj.rotateX(Math.PI / 2 - 0.2);
  } else {
    dummyObj.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  }
  if (type !== "STAR" /* STAR */ && type !== "NEEDLE" /* NEEDLE */) {
    treeQ.setFromEuler(dummyObj.rotation);
  } else {
    dummyObj.updateMatrix();
    treeQ.setFromRotationMatrix(dummyObj.matrix);
  }
  let colors = PALETTE.NEEDLE;
  let baseScale = 1;
  switch (type) {
    case "STAR" /* STAR */:
      colors = PALETTE.STAR;
      baseScale = 1.5;
      break;
    case "RIBBON" /* RIBBON */:
      colors = PALETTE.RIBBON;
      baseScale = 0.08;
      break;
    case "ORNAMENT" /* ORNAMENT */:
      colors = PALETTE.ORNAMENT;
      baseScale = 0.4;
      break;
    case "SPARKLE" /* SPARKLE */:
      colors = PALETTE.SPARKLE;
      baseScale = 0.3;
      break;
    case "NEEDLE" /* NEEDLE */:
      colors = PALETTE.NEEDLE;
      baseScale = 0.6 + Math.random() * 0.4;
      break;
  }
  const c = colors[Math.floor(Math.random() * colors.length)];
  return {
    type,
    scatterPosition: scatterPos,
    scatterRotation: scatterRot,
    treePosition: [tx, ty, tz],
    treeRotation: [treeQ.x, treeQ.y, treeQ.z, treeQ.w],
    color: [c.r, c.g, c.b],
    scale: baseScale,
    speed: Math.random() * 0.5 + 0.2,
    phase: Math.random() * Math.PI * 2
  };
}

// components/MagicParticles.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var PARTICLE_COUNT = 3e3;
var ParticleGroup = ({
  data,
  geometry,
  material,
  globalState
}) => {
  const meshRef = useRef(null);
  const count = data.length;
  const transitionRef = useRef(0);
  const dummy = useMemo(() => new THREE2.Object3D(), []);
  const posA = useMemo(() => new THREE2.Vector3(), []);
  const posB = useMemo(() => new THREE2.Vector3(), []);
  const rotA = useMemo(() => new THREE2.Quaternion(), []);
  const rotB = useMemo(() => new THREE2.Quaternion(), []);
  const scaleVec = useMemo(() => new THREE2.Vector3(), []);
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((p, i) => {
      meshRef.current.setColorAt(i, new THREE2.Color(p.color[0], p.color[1], p.color[2]));
    });
    meshRef.current.instanceColor.needsUpdate = true;
  }, [data]);
  const updateBatchRef = useRef(0);
  const BATCH_SIZE = Math.max(1, Math.floor(count / 3));
  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    let targetT = 0;
    if (globalState === "TREE_SHAPE" /* TREE_SHAPE */) {
      targetT = 1;
    }
    transitionRef.current = THREE2.MathUtils.lerp(transitionRef.current, targetT, delta * 1);
    const t = transitionRef.current;
    const ease = t * t * (3 - 2 * t);
    const time = stateThree.clock.elapsedTime;
    const isTransitioning = Math.abs(transitionRef.current - targetT) > 0.01;
    const startIdx = updateBatchRef.current * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, count);
    for (let i = startIdx; i < endIdx; i++) {
      const p = data[i];
      posA.set(p.scatterPosition[0], p.scatterPosition[1], p.scatterPosition[2]);
      posB.set(p.treePosition[0], p.treePosition[1], p.treePosition[2]);
      if (!isTransitioning) {
        const hover = Math.sin(time * p.speed + p.phase) * (0.15 * (1 - t) + 0.02 * t);
        posA.y += hover;
      }
      dummy.position.lerpVectors(posA, posB, ease);
      rotA.set(p.scatterRotation[0], p.scatterRotation[1], p.scatterRotation[2], p.scatterRotation[3]);
      rotB.set(p.treeRotation[0], p.treeRotation[1], p.treeRotation[2], p.treeRotation[3]);
      dummy.quaternion.slerpQuaternions(rotA, rotB, ease);
      if (!isTransitioning) {
        const spinRate = (1 - t) * 0.5;
        if (p.type === "STAR" /* STAR */) {
          dummy.rotation.z = Math.sin(time * 0.5) * 0.1;
          dummy.rotation.y += delta * 0.5;
        } else {
          dummy.rotateY(time * spinRate * p.speed);
        }
      }
      let pulse = 1;
      if (!isTransitioning) {
        if (p.type === "SPARKLE" /* SPARKLE */) {
          pulse = 0.5 + Math.abs(Math.sin(time * 8 + p.phase));
        } else if (p.type === "RIBBON" /* RIBBON */) {
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
    updateBatchRef.current = (updateBatchRef.current + 1) % 3;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (t > 0.1 && !isTransitioning) {
      meshRef.current.rotation.y = time * 0.1 * ease;
    }
  });
  return /* @__PURE__ */ jsx(
    "instancedMesh",
    {
      ref: meshRef,
      args: [geometry, material, count],
      castShadow: true,
      receiveShadow: true
    }
  );
};
var MagicParticles = ({ state }) => {
  const { needles, ornaments, ribbon, star, sparkles } = useMemo(() => {
    const allData = generateParticles(PARTICLE_COUNT);
    return {
      needles: allData.filter((p) => p.type === "NEEDLE" /* NEEDLE */),
      ornaments: allData.filter((p) => p.type === "ORNAMENT" /* ORNAMENT */),
      ribbon: allData.filter((p) => p.type === "RIBBON" /* RIBBON */),
      star: allData.filter((p) => p.type === "STAR" /* STAR */),
      sparkles: allData.filter((p) => p.type === "SPARKLE" /* SPARKLE */)
    };
  }, []);
  const needleGeo = useMemo(() => {
    const geo = new THREE2.CylinderGeometry(0.01, 0.04, 0.5, 4);
    geo.translate(0, 0.25, 0);
    return geo;
  }, []);
  const ornamentGeo = useMemo(() => new THREE2.IcosahedronGeometry(0.2, 2), []);
  const ribbonGeo = useMemo(() => {
    const geo = new THREE2.SphereGeometry(0.2, 8, 8);
    geo.scale(1.2, 0.6, 1.2);
    return geo;
  }, []);
  const sparkleGeo = useMemo(() => new THREE2.OctahedronGeometry(0.1, 0), []);
  const starGeo = useMemo(() => {
    const shape = new THREE2.Shape();
    const points = 5;
    const outerRadius = 0.5;
    const innerRadius = 0.25;
    shape.moveTo(0, outerRadius);
    for (let i = 0; i < points * 2; i++) {
      const angle = i * Math.PI / points;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
    }
    const starPoints = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? 0.6 : 0.3;
      const a = i / 10 * Math.PI * 2 + Math.PI / 2;
      starPoints.push(new THREE2.Vector2(Math.cos(a) * rad, Math.sin(a) * rad));
    }
    const s = new THREE2.Shape(starPoints);
    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 1
    };
    const geometry = new THREE2.ExtrudeGeometry(s, extrudeSettings);
    geometry.rotateZ(Math.PI);
    geometry.center();
    return geometry;
  }, []);
  const needleMat = useMemo(() => new THREE2.MeshStandardMaterial({
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true
  }), []);
  const goldMat = useMemo(() => new THREE2.MeshPhysicalMaterial({
    color: "#ffd700",
    roughness: 0.05,
    metalness: 1,
    clearcoat: 1,
    emissive: new THREE2.Color("#d4af37"),
    emissiveIntensity: 0.2
  }), []);
  const neonMat = useMemo(() => new THREE2.MeshStandardMaterial({
    color: new THREE2.Color("#F4C2C2"),
    // Baby Pink base
    emissive: new THREE2.Color("#FFB7CE"),
    // Soft pink glow
    emissiveIntensity: 2,
    toneMapped: false,
    roughness: 0.2,
    metalness: 0.5
  }), []);
  const starMat = useMemo(() => new THREE2.MeshStandardMaterial({
    color: "#ffd700",
    emissive: "#ffd700",
    emissiveIntensity: 2,
    roughness: 0.2,
    metalness: 0.8
  }), []);
  const sparkleMat = useMemo(() => new THREE2.MeshBasicMaterial({
    color: 16777215,
    toneMapped: false
  }), []);
  return /* @__PURE__ */ jsxs("group", { children: [
    needles.length > 0 && /* @__PURE__ */ jsx(ParticleGroup, { data: needles, geometry: needleGeo, material: needleMat, globalState: state }),
    ornaments.length > 0 && /* @__PURE__ */ jsx(ParticleGroup, { data: ornaments, geometry: ornamentGeo, material: goldMat, globalState: state }),
    ribbon.length > 0 && /* @__PURE__ */ jsx(ParticleGroup, { data: ribbon, geometry: ribbonGeo, material: neonMat, globalState: state }),
    sparkles.length > 0 && /* @__PURE__ */ jsx(ParticleGroup, { data: sparkles, geometry: sparkleGeo, material: sparkleMat, globalState: state }),
    star.length > 0 && /* @__PURE__ */ jsx(ParticleGroup, { data: star, geometry: starGeo, material: starMat, globalState: state })
  ] });
};

// components/PhotoPlanes.tsx
import React2, { useMemo as useMemo2, useRef as useRef2, useState, useEffect } from "react";
import * as THREE3 from "three";
import { useFrame as useFrame2, useThree } from "@react-three/fiber";
import { jsx as jsx2 } from "react/jsx-runtime";
function generatePhotoPositions(count, radius) {
  const positions = [];
  const SPIRAL_HEIGHT = 30;
  const SPIRAL_REVS = 3;
  const MAX_RADIUS = radius;
  const MIN_RADIUS = radius * 0.2;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = SPIRAL_HEIGHT / 2 - t * SPIRAL_HEIGHT;
    const r = MAX_RADIUS * (1 - t) + MIN_RADIUS * t;
    const angle = t * Math.PI * 2 * SPIRAL_REVS;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    positions.push({
      position: [x, y, z],
      rotation: [0, 0, 0]
    });
  }
  return positions;
}
var PhotoPlanes = ({ state, photoPaths }) => {
  const groupRef = useRef2(null);
  const MAX_PHOTOS = Math.min(photoPaths.length, 8);
  const photoCount = MAX_PHOTOS;
  const radius = 10;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const positions = useMemo2(() => {
    return generatePhotoPositions(photoCount, radius);
  }, [photoCount]);
  const [textures, setTextures] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const MAX_TEXTURE_SIZE = 1024;
  const resizeImage = (image, maxSize) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(image);
        return;
      }
      let width = image.width;
      let height = image.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = height / width * maxSize;
          width = maxSize;
        } else {
          width = width / height * maxSize;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);
      const resizedImage = new Image();
      resizedImage.onload = () => resolve(resizedImage);
      resizedImage.src = canvas.toDataURL("image/jpeg", 0.85);
    });
  };
  useEffect(() => {
    const loader = new THREE3.TextureLoader();
    const texturePromises = photoPaths.slice(0, photoCount).map((path, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => {
          try {
            const resizedImg = await resizeImage(img, MAX_TEXTURE_SIZE);
            const texture = new THREE3.Texture(resizedImg);
            texture.needsUpdate = true;
            texture.minFilter = THREE3.LinearMipmapLinearFilter;
            texture.magFilter = THREE3.LinearFilter;
            texture.generateMipmaps = true;
            texture.colorSpace = THREE3.SRGBColorSpace;
            texture.format = THREE3.RGBAFormat;
            texture.anisotropy = 1;
            console.log(`\u6210\u529F\u52A0\u8F7D\u5E76\u538B\u7F29\u7167\u7247: ${path} (${resizedImg.width}x${resizedImg.height})`);
            setLoadedCount((prev) => prev + 1);
            resolve(texture);
          } catch (err) {
            console.error(`\u5904\u7406\u7167\u7247\u5931\u8D25 ${path}:`, err);
            reject(err);
          }
        };
        img.onerror = (err) => {
          console.error(`\u52A0\u8F7D\u7167\u7247\u5931\u8D25 ${path}:`, err);
          reject(err);
        };
        img.src = `./my_picture/${path}`;
      });
    });
    Promise.all(texturePromises).then((loadedTextures) => {
      setTextures(loadedTextures);
      console.log(`\u6240\u6709\u7167\u7247\u52A0\u8F7D\u5B8C\u6210\uFF0C\u5171 ${loadedTextures.length} \u5F20`);
    }).catch((err) => {
      console.error("\u90E8\u5206\u7167\u7247\u52A0\u8F7D\u5931\u8D25:", err);
    });
  }, [photoPaths, photoCount]);
  const { camera, gl, raycaster, pointer } = useThree();
  const meshesRef = useRef2(/* @__PURE__ */ new Map());
  useEffect(() => {
    const handleClick = (event) => {
      if (state !== "SCATTERED" /* SCATTERED */) return;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const allMeshes = Array.from(meshesRef.current.keys());
      const intersects = raycaster.intersectObjects(allMeshes, true);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const photoIndex = meshesRef.current.get(clickedMesh);
        if (photoIndex !== void 0) {
          if (selectedPhotoIndex === photoIndex) {
            setSelectedPhotoIndex(null);
          } else {
            setSelectedPhotoIndex(photoIndex);
          }
        }
      } else {
        setSelectedPhotoIndex(null);
      }
    };
    gl.domElement.addEventListener("click", handleClick);
    return () => {
      gl.domElement.removeEventListener("click", handleClick);
    };
  }, [state, selectedPhotoIndex, camera, gl, raycaster, pointer]);
  useEffect(() => {
    if (state !== "SCATTERED" /* SCATTERED */) {
      setSelectedPhotoIndex(null);
    }
  }, [state]);
  useFrame2((_, delta) => {
    if (!groupRef.current) return;
    const isScattered = state === "SCATTERED" /* SCATTERED */;
    groupRef.current.visible = isScattered;
    if (isScattered && groupRef.current.visible) {
      if (selectedPhotoIndex === null) {
        groupRef.current.rotation.y += delta * 0.1;
      }
    } else {
    }
  });
  React2.useEffect(() => {
    if (state === "SCATTERED" /* SCATTERED */) {
      console.log(`\u663E\u793A ${photoCount} \u5F20\u7167\u7247\uFF0C\u4F4D\u7F6E\u534A\u5F84: ${radius}`);
    }
  }, [state, photoCount, radius]);
  return /* @__PURE__ */ jsx2("group", { ref: groupRef, visible: state === "SCATTERED" /* SCATTERED */ && textures.length > 0, children: textures.map((texture, index) => {
    if (index >= positions.length) return null;
    if (!texture || !texture.image) return null;
    const posData = positions[index];
    return /* @__PURE__ */ jsx2(
      PhotoPlane,
      {
        index,
        position: posData.position,
        rotation: posData.rotation,
        texture,
        isVisible: state === "SCATTERED" /* SCATTERED */,
        isSelected: selectedPhotoIndex === index,
        onMeshRef: (mesh) => {
          if (mesh) {
            meshesRef.current.set(mesh, index);
          } else {
            for (const [m, idx] of meshesRef.current.entries()) {
              if (idx === index) {
                meshesRef.current.delete(m);
                break;
              }
            }
          }
        }
      },
      index
    );
  }) });
};
var PhotoPlane = ({ index, position, rotation, texture, isVisible, isSelected, onMeshRef }) => {
  const meshRef = useRef2(null);
  const { camera } = useThree();
  const lastCameraPositionRef = useRef2(new THREE3.Vector3());
  const updateThreshold = 0.1;
  const animationProgressRef = useRef2(0);
  const targetAnimationRef = useRef2(0);
  const selectedProgressRef = useRef2(0);
  const targetSelectedRef = useRef2(0);
  const originalPositionRef = useRef2(new THREE3.Vector3(...position));
  const targetPositionRef = useRef2(new THREE3.Vector3());
  const currentPositionRef = useRef2(new THREE3.Vector3(...position));
  useEffect(() => {
    if (meshRef.current) {
      onMeshRef(meshRef.current);
    }
    return () => {
      onMeshRef(null);
    };
  }, [onMeshRef]);
  React2.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [rotation]);
  React2.useEffect(() => {
    if (isVisible) {
      const delay = index * 200;
      const timer = setTimeout(() => {
        targetAnimationRef.current = 1;
      }, delay);
      return () => clearTimeout(timer);
    } else {
      targetAnimationRef.current = 0;
      animationProgressRef.current = 0;
      targetSelectedRef.current = 0;
      selectedProgressRef.current = 0;
    }
  }, [isVisible, index]);
  React2.useEffect(() => {
    if (isSelected) {
      targetSelectedRef.current = 1;
      const localDistance = 5;
      targetPositionRef.current.set(0, 0.5, -localDistance);
    } else {
      targetSelectedRef.current = 0;
      targetPositionRef.current.copy(originalPositionRef.current);
    }
  }, [isSelected]);
  useFrame2((_, delta) => {
    if (meshRef.current) {
      const cameraPos = camera.position;
      const distance = cameraPos.distanceTo(lastCameraPositionRef.current);
      if (isSelected || distance > updateThreshold) {
        meshRef.current.lookAt(cameraPos);
        lastCameraPositionRef.current.copy(cameraPos);
      }
      selectedProgressRef.current = THREE3.MathUtils.lerp(
        selectedProgressRef.current,
        targetSelectedRef.current,
        delta * 3
        // 选中动画速度较快
      );
      meshRef.current.renderOrder = isSelected ? 100 : 0;
      currentPositionRef.current.lerp(targetPositionRef.current, delta * 3);
      meshRef.current.position.copy(currentPositionRef.current);
      animationProgressRef.current = THREE3.MathUtils.lerp(
        animationProgressRef.current,
        targetAnimationRef.current,
        delta * 0.5
        // 动画速度
      );
      const baseScale = THREE3.MathUtils.lerp(0.3, 1, animationProgressRef.current);
      const selectedScale = THREE3.MathUtils.lerp(1, 2.5, selectedProgressRef.current);
      const finalScale = baseScale * selectedScale;
      meshRef.current.scale.set(finalScale, finalScale, finalScale);
      const material2 = meshRef.current.material;
      if (material2) {
        const baseOpacity = animationProgressRef.current;
        const dimmedOpacity = !isSelected && selectedProgressRef.current > 0.1 ? 0.3 : 1;
        material2.opacity = baseOpacity * dimmedOpacity;
      }
    }
  });
  const material = useMemo2(() => {
    if (!texture || !texture.image) {
      console.warn("\u7167\u7247\u7EB9\u7406\u65E0\u6548");
      return new THREE3.MeshBasicMaterial({ color: 16711680, transparent: true, opacity: 0 });
    }
    texture.colorSpace = THREE3.SRGBColorSpace;
    return new THREE3.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      // 初始透明，通过动画变为1
      side: THREE3.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      // 禁用色调映射，减少计算
      color: new THREE3.Color(0.9, 0.9, 0.9)
    });
  }, [texture]);
  return /* @__PURE__ */ jsx2("mesh", { ref: meshRef, position, material, scale: [0.3, 0.3, 0.3], children: /* @__PURE__ */ jsx2("planeGeometry", { args: [4, 4] }) });
};

// components/Experience.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var SceneContent = ({ state, handRotation, photoPaths = [] }) => {
  const groupRef = useRef3(null);
  const rotationVelocityRef = useRef3(0);
  const lastHandRotationRef = useRef3(0);
  const isManualControlRef = useRef3(false);
  const idleTimerRef = useRef3(0);
  useFrame3((_, delta) => {
    if (groupRef.current) {
      const handRotationDelta = handRotation - lastHandRotationRef.current;
      lastHandRotationRef.current = handRotation;
      if (Math.abs(handRotationDelta) > 1e-3) {
        rotationVelocityRef.current += handRotationDelta * 2;
        rotationVelocityRef.current = Math.max(-3, Math.min(3, rotationVelocityRef.current));
        isManualControlRef.current = true;
        idleTimerRef.current = 0;
      } else {
        idleTimerRef.current += delta;
      }
      groupRef.current.rotation.y += rotationVelocityRef.current * delta;
      rotationVelocityRef.current *= 1 - delta * 0.3;
      if (Math.abs(rotationVelocityRef.current) < 5e-3) {
        rotationVelocityRef.current = 0;
      }
      if (Math.abs(rotationVelocityRef.current) < 0.01 && idleTimerRef.current > 2) {
        isManualControlRef.current = false;
        groupRef.current.rotation.y += 0.1 * delta;
      }
    }
  });
  return (
    // Scaled down by 50% and elevated to ensure separation from UI
    /* @__PURE__ */ jsxs2("group", { ref: groupRef, position: [0, 0.5, 0], scale: [0.5, 0.5, 0.5], children: [
      /* @__PURE__ */ jsx3(MagicParticles, { state }),
      photoPaths.length > 0 && /* @__PURE__ */ jsx3(PhotoPlanes, { state, photoPaths })
    ] })
  );
};
var Experience = ({ state, handRotation, photoPaths = [] }) => {
  return /* @__PURE__ */ jsxs2(
    Canvas,
    {
      camera: { position: [0, 0, 14], fov: 45 },
      dpr: [1, 1.5],
      gl: { antialias: false, toneMappingExposure: 1.1, powerPreference: "high-performance" },
      children: [
        /* @__PURE__ */ jsx3("color", { attach: "background", args: ["#0d1520"] }),
        /* @__PURE__ */ jsx3(Environment, { preset: "city" }),
        /* @__PURE__ */ jsx3(Stars, { radius: 100, depth: 50, count: 5e3, factor: 4, saturation: 0, fade: true, speed: 1 }),
        /* @__PURE__ */ jsx3("ambientLight", { intensity: 0.4, color: "#ffc0cb" }),
        /* @__PURE__ */ jsx3("pointLight", { position: [10, 10, 10], intensity: 1.5, color: "#fff0f5" }),
        /* @__PURE__ */ jsx3("pointLight", { position: [-10, -5, -10], intensity: 0.8, color: "#ffb7c5" }),
        /* @__PURE__ */ jsx3(
          "spotLight",
          {
            position: [5, 12, 5],
            angle: 0.4,
            penumbra: 1,
            intensity: 2.5,
            castShadow: true,
            color: "#fff8e7"
          }
        ),
        /* @__PURE__ */ jsx3(SceneContent, { state, handRotation, photoPaths }),
        /* @__PURE__ */ jsx3(
          OrbitControls,
          {
            enablePan: false,
            enableZoom: true,
            minDistance: 5,
            maxDistance: 25,
            autoRotate: false,
            dampingFactor: 0.05
          }
        ),
        /* @__PURE__ */ jsxs2(EffectComposer, { disableNormalPass: true, children: [
          /* @__PURE__ */ jsx3(
            Bloom,
            {
              luminanceThreshold: 0.5,
              mipmapBlur: false,
              intensity: 0.8,
              radius: 0.3
            }
          ),
          /* @__PURE__ */ jsx3(Vignette, { eskil: false, offset: 0.1, darkness: 0.6 })
        ] })
      ]
    }
  );
};

// components/UI.tsx
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var UI = ({ currentState, onToggle }) => {
  const isTree = currentState === "TREE_SHAPE" /* TREE_SHAPE */;
  return /* @__PURE__ */ jsxs3("div", { className: "absolute inset-0 pointer-events-none flex flex-col justify-between items-center py-12 px-6", children: [
    /* @__PURE__ */ jsxs3("header", { className: "text-center space-y-3 pointer-events-auto mt-4", children: [
      /* @__PURE__ */ jsx4("h1", { className: "text-xl md:text-3xl font-bold text-pink-300 drop-shadow-[0_0_10px_rgba(255,192,203,0.5)] font-serif tracking-widest", children: "MERRY CHRISTMAS" }),
      /* @__PURE__ */ jsx4("p", { className: "text-pink-200/60 text-[10px] md:text-xs font-sans tracking-[0.3em] uppercase", children: "Only for Lin Xi" })
    ] }),
    /* @__PURE__ */ jsx4("div", { className: "pointer-events-auto mb-10", children: /* @__PURE__ */ jsxs3(
      "button",
      {
        onClick: onToggle,
        className: `
            group relative px-10 py-4
            transition-all duration-500 ease-out
            border-y border-white/30
            hover:border-white/80 hover:scale-105 active:scale-95
            bg-black/20 backdrop-blur-sm
          `,
        children: [
          /* @__PURE__ */ jsx4("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }),
          /* @__PURE__ */ jsx4("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }),
          /* @__PURE__ */ jsx4("span", { className: "relative z-10 font-serif text-lg text-pink-50 tracking-[0.2em] flex items-center gap-4", children: isTree ? /* @__PURE__ */ jsxs3(Fragment, { children: [
            /* @__PURE__ */ jsx4("span", { className: "text-xs", children: "\u2715" }),
            " RELEASE MEMORIES ",
            /* @__PURE__ */ jsx4("span", { className: "text-xs", children: "\u2715" })
          ] }) : /* @__PURE__ */ jsxs3(Fragment, { children: [
            /* @__PURE__ */ jsx4("span", { className: "text-xs", children: "\u2726" }),
            " ASSEMBLE TREE ",
            /* @__PURE__ */ jsx4("span", { className: "text-xs", children: "\u2726" })
          ] }) })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx4("div", { className: "absolute top-0 left-0 w-full h-full pointer-events-none p-6", children: /* @__PURE__ */ jsxs3("div", { className: "w-full h-full border border-white/5 rounded-lg relative", children: [
      /* @__PURE__ */ jsx4("div", { className: "absolute top-0 left-0 w-4 h-4 border-l border-t border-pink-200/40" }),
      /* @__PURE__ */ jsx4("div", { className: "absolute top-0 right-0 w-4 h-4 border-r border-t border-pink-200/40" }),
      /* @__PURE__ */ jsx4("div", { className: "absolute bottom-0 left-0 w-4 h-4 border-l border-b border-pink-200/40" }),
      /* @__PURE__ */ jsx4("div", { className: "absolute bottom-0 right-0 w-4 h-4 border-r border-b border-pink-200/40" })
    ] }) })
  ] });
};

// components/HandController.tsx
import { useEffect as useEffect2, useRef as useRef4, useState as useState2 } from "react";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var HandController = ({ onGesture, onRotation }) => {
  const videoRef = useRef4(null);
  const [loaded, setLoaded] = useState2(false);
  const [error, setError] = useState2(null);
  useEffect2(() => {
    let gestureRecognizer = null;
    let animationFrameId;
    const setupMediaPipe = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u6444\u50CF\u5934\u8BBF\u95EE");
          return;
        }
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minGestureConfidence: 0.3,
          // 手势置信度
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setLoaded(true);
        startWebcam();
      } catch (error2) {
        console.error("Failed to load MediaPipe:", error2);
        setError("MediaPipe \u52A0\u8F7D\u5931\u8D25");
      }
    };
    const startWebcam = async () => {
      try {
        if (!videoRef.current) {
          setError("\u89C6\u9891\u5143\u7D20\u672A\u521D\u59CB\u5316");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
          videoRef.current.play().catch((e) => {
            console.error("\u89C6\u9891\u64AD\u653E\u5931\u8D25:", e);
          });
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("\u6444\u50CF\u5934\u6743\u9650\u88AB\u62D2\u7EDD");
        } else if (err.name === "NotFoundError") {
          setError("\u672A\u627E\u5230\u6444\u50CF\u5934\u8BBE\u5907");
        } else {
          setError("\u65E0\u6CD5\u8BBF\u95EE\u6444\u50CF\u5934: " + (err.message || err.name));
        }
      }
    };
    let lastVideoTime = -1;
    let lastGestureType = null;
    let lastWristX = null;
    const gestureHistory = [];
    const gestureHistorySize = 5;
    const wristXHistory = [];
    const wristXHistorySize = 8;
    const predictWebcam = () => {
      if (videoRef.current && gestureRecognizer) {
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const startTimeMs = performance.now();
          const result = gestureRecognizer.recognizeForVideo(videoRef.current, startTimeMs);
          const hasHand = result.landmarks && result.landmarks.length > 0;
          if (hasHand && result.gestures && result.gestures.length > 0) {
            const gestures = result.gestures[0];
            const landmarks = result.landmarks[0];
            let confirmedGesture = null;
            if (gestures.length > 0) {
              const topGesture = gestures[0];
              const gestureName = topGesture.categoryName;
              const confidence = topGesture.score;
              console.log(`\u{1F3AF} \u8BC6\u522B\u5230\u624B\u52BF: ${gestureName} (\u7F6E\u4FE1\u5EA6: ${confidence.toFixed(2)})`);
              if (confidence > 0.4) {
                gestureHistory.push(gestureName);
                if (gestureHistory.length > gestureHistorySize) {
                  gestureHistory.shift();
                }
              }
              const gestureCount = /* @__PURE__ */ new Map();
              for (const g of gestureHistory) {
                gestureCount.set(g, (gestureCount.get(g) || 0) + 1);
              }
              let maxCount = 0;
              for (const [gesture, count] of gestureCount.entries()) {
                if (count > maxCount && count >= Math.max(2, gestureHistorySize * 0.4)) {
                  confirmedGesture = gesture;
                  maxCount = count;
                }
              }
              const highConfidenceGesture = confidence > 0.7 ? gestureName : null;
              const finalGesture = highConfidenceGesture || confirmedGesture;
              if (finalGesture && lastGestureType !== finalGesture) {
                console.log(`\u2705 \u786E\u8BA4\u624B\u52BF\u53D8\u5316: ${lastGestureType} \u2192 ${finalGesture} (\u7F6E\u4FE1\u5EA6: ${confidence.toFixed(2)})`);
                if (finalGesture === "Open_Palm" && lastGestureType === "Closed_Fist") {
                  onGesture("SCATTERED" /* SCATTERED */);
                  console.log("\u{1F384} \u6253\u5F00\u5723\u8BDE\u6811");
                } else if (finalGesture === "Closed_Fist" && lastGestureType === "Open_Palm") {
                  onGesture("TREE_SHAPE" /* TREE_SHAPE */);
                  console.log("\u{1F384} \u95ED\u5408\u5723\u8BDE\u6811");
                }
                lastGestureType = finalGesture;
              }
            }
            const wrist = landmarks[0];
            const canRotate = confirmedGesture === "Open_Palm" || gestureHistory.length > 0 && gestureHistory.slice(-2).includes("Open_Palm");
            if (canRotate) {
              const currentWristX = 1 - wrist.x;
              wristXHistory.push(currentWristX);
              if (wristXHistory.length > wristXHistorySize) {
                wristXHistory.shift();
              }
              const smoothedX = kalmanFilter(wristXHistory);
              if (lastWristX !== null) {
                const rawDeltaX = smoothedX - lastWristX;
                const deadZone = 3e-3;
                if (Math.abs(rawDeltaX) < deadZone) {
                  onRotation(0);
                } else {
                  const rotation = Math.sign(rawDeltaX) * Math.pow(Math.abs(rawDeltaX) * 60, 0.8);
                  const clampedRotation = Math.max(-3, Math.min(3, rotation));
                  onRotation(clampedRotation);
                }
              }
              lastWristX = smoothedX;
            } else {
              lastWristX = null;
              wristXHistory.length = 0;
              onRotation(0);
            }
          } else {
            gestureHistory.length = 0;
            wristXHistory.length = 0;
            onRotation(0);
          }
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };
    setupMediaPipe();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (gestureRecognizer) gestureRecognizer.close();
    };
  }, [onGesture, onRotation]);
  return /* @__PURE__ */ jsx5("div", { className: "absolute bottom-4 right-4 z-50 pointer-events-auto", children: /* @__PURE__ */ jsxs4("div", { className: `
        relative w-32 h-24 bg-black/50 rounded-lg overflow-hidden border border-pink-500/30
        transition-opacity duration-1000 ${loaded && !error ? "opacity-100" : "opacity-50"}
      `, children: [
    /* @__PURE__ */ jsx5(
      "video",
      {
        ref: videoRef,
        className: "w-full h-full object-cover transform -scale-x-100",
        autoPlay: true,
        playsInline: true,
        muted: true
      }
    ),
    /* @__PURE__ */ jsx5("div", { className: "absolute top-1 left-2 text-[8px] text-pink-200 uppercase tracking-widest bg-black/40 px-1 rounded", children: "Gesture Control" }),
    error && /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-black/80 flex items-center justify-center p-1", children: /* @__PURE__ */ jsx5("div", { className: "text-[6px] text-red-300 text-center leading-tight", children: error }) })
  ] }) });
};
function kalmanFilter(values, processNoise = 0.01, measurementNoise = 0.1) {
  if (values.length === 0) return 0;
  let estimate = values[0];
  let error = 1;
  for (let i = 1; i < values.length; i++) {
    let priorEstimate = estimate;
    let priorError = error + processNoise;
    let kalmanGain = priorError / (priorError + measurementNoise);
    estimate = priorEstimate + kalmanGain * (values[i] - priorEstimate);
    error = (1 - kalmanGain) * priorError;
  }
  return estimate;
}

// App.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function App() {
  const [particleState, setParticleState] = useState3("TREE_SHAPE" /* TREE_SHAPE */);
  const [handRotation, setHandRotation] = useState3(0);
  const photoPaths = [
    "IMG_20230311_161453.jpg",
    "IMG_20250613_170359.jpg",
    "IMG_20250824_183732.jpg",
    "IMG_20250927_204031.jpg",
    "mmexport1738551898827.jpg",
    "mmexport1749642699957.jpg",
    "retouch_2023120920433815_edit_288345382350272.jpg",
    "retouch_2025100900031123.jpg"
  ];
  const handleToggle = () => {
    setParticleState(
      (prev) => prev === "SCATTERED" /* SCATTERED */ ? "TREE_SHAPE" /* TREE_SHAPE */ : "SCATTERED" /* SCATTERED */
    );
  };
  const handleGesture = useCallback((newState) => {
    if (newState) {
      setParticleState(newState);
    }
  }, []);
  const handleRotation = useCallback((val) => {
    setHandRotation(val);
  }, []);
  return /* @__PURE__ */ jsxs5("div", { className: "relative w-full h-screen bg-[#0d1520]", children: [
    /* @__PURE__ */ jsx6("div", { className: "absolute inset-0 z-0", children: /* @__PURE__ */ jsx6(Experience, { state: particleState, handRotation, photoPaths }) }),
    /* @__PURE__ */ jsx6("div", { className: "absolute inset-0 z-10 pointer-events-none", children: /* @__PURE__ */ jsx6(UI, { currentState: particleState, onToggle: handleToggle }) }),
    /* @__PURE__ */ jsx6(HandController, { onGesture: handleGesture, onRotation: handleRotation })
  ] });
}
var App_default = App;

// index.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
var root = ReactDOM.createRoot(rootElement);
root.render(
  /* @__PURE__ */ jsx7(React6.StrictMode, { children: /* @__PURE__ */ jsx7(App_default, {}) })
);
