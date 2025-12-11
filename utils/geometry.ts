import * as THREE from 'three';
import { ParticleData, ParticleType } from '../types';

// Palette Definition
const PALETTE = {
  NEEDLE: [
    new THREE.Color('#013220'), // Dark Green
    new THREE.Color('#0B6623'), // Forest Green
    new THREE.Color('#1B4D3E'), // Deep Emerald
    new THREE.Color('#228B22'), // Forest
    new THREE.Color('#004225'), // British Racing Green
  ],
  RIBBON: [
    new THREE.Color('#F4C2C2'), // Baby Pink
    new THREE.Color('#FFD1DC'), // Pastel Pink
    new THREE.Color('#FFB7CE'), // Light Pink
    new THREE.Color('#FFC1CC'), // Bubblegum (Soft)
  ],
  ORNAMENT: [ 
    new THREE.Color('#ffd700'), // Gold
    new THREE.Color('#d4af37'), // Metallic Gold
  ],
  STAR: [ 
    new THREE.Color('#ffd700'), // Gold
    new THREE.Color('#ffec8b'), // Light Goldenrod
    new THREE.Color('#ffdf00'), // Golden Yellow
  ],
  SPARKLE: [
    new THREE.Color('#fffacd'), // Lemon Chiffon
    new THREE.Color('#ffffff'), // White
    new THREE.Color('#ffd700'), // Gold
  ]
};

const dummyObj = new THREE.Object3D();

// Helper to get random point in sphere
const randomInSphere = (radius: number): [number, number, number] => {
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

const getRandomRotation = (): [number, number, number, number] => {
  dummyObj.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );
  dummyObj.updateMatrix();
  return [dummyObj.quaternion.x, dummyObj.quaternion.y, dummyObj.quaternion.z, dummyObj.quaternion.w];
};

export const generateParticles = (count: number): ParticleData[] => {
  const data: ParticleData[] = [];
  
  const TREE_HEIGHT = 9;
  const MAX_RADIUS = 3.8;
  const SPIRAL_REVS = 4.5; 

  // 1. TOP STAR
  data.push(createParticle(ParticleType.STAR, 0, TREE_HEIGHT / 2 + 0.2, 0, 0, 0));

  // 2. RIBBON PARTICLES
  const ribbonCount = 1200;
  for (let i = 0; i < ribbonCount; i++) {
    const t = i / ribbonCount; 
    
    const h = -TREE_HEIGHT/2 + (t * TREE_HEIGHT);
    const r = MAX_RADIUS * (1 - t) + 0.3; 
    const angle = t * Math.PI * 2 * SPIRAL_REVS;
    
    // Add slight jitter to create volume
    const jitterX = (Math.random() - 0.5) * 0.1;
    const jitterY = (Math.random() - 0.5) * 0.1;
    const jitterZ = (Math.random() - 0.5) * 0.1;

    const x = Math.cos(angle) * r + jitterX;
    const z = Math.sin(angle) * r + jitterZ;
    const y = h + jitterY;
    
    data.push(createParticle(ParticleType.RIBBON, x, y, z, r, t));
  }

  // 3. SPARKLES
  const sparkleCount = 400;
  for (let i = 0; i < sparkleCount; i++) {
    const hRaw = Math.random(); 
    const h = -TREE_HEIGHT/2 + (hRaw * TREE_HEIGHT);
    const maxR = MAX_RADIUS * (1 - hRaw) + 0.5; 
    const r = Math.random() * maxR;
    const angle = Math.random() * Math.PI * 2;

    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    data.push(createParticle(ParticleType.SPARKLE, x, h, z, r, hRaw));
  }

  // 4. FILLER (Needles & Ornaments)
  const remaining = Math.floor(count * 1.5) - ribbonCount - sparkleCount;
  
  for (let i = 0; i < remaining; i++) {
    const rnd = Math.random();
    
    // Distribution: 95% Needles, 5% Ornaments
    let type = ParticleType.NEEDLE;
    if (rnd > 0.95) type = ParticleType.ORNAMENT;

    const hRaw = Math.pow(Math.random(), 0.9); 
    const h = -TREE_HEIGHT/2 + (hRaw * TREE_HEIGHT);
    const maxR = MAX_RADIUS * (1 - hRaw);

    const r = type === ParticleType.NEEDLE 
      ? Math.sqrt(Math.random()) * maxR 
      : maxR * (0.85 + Math.random() * 0.15);

    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    data.push(createParticle(type, x, h, z, r, hRaw));
  }

  return data;
};

function createParticle(
  type: ParticleType, 
  tx: number, ty: number, tz: number, 
  radiusAtHeight: number, 
  heightNorm: number
): ParticleData {
  
  // SCATTER POSITION
  const scatterPos = randomInSphere(12);
  const scatterRot = getRandomRotation();

  // TREE ROTATION
  const treeQ = new THREE.Quaternion();
  
  if (type === ParticleType.STAR) {
    // Face forward
    dummyObj.rotation.set(0, 0, 0); 
  } else if (type === ParticleType.NEEDLE) {
    // Point outwards and slightly up
    dummyObj.position.set(0,0,0);
    dummyObj.lookAt(tx, 0, tz); 
    dummyObj.rotateX(Math.PI / 2 - 0.2); 
  } else {
    // Random spin
    dummyObj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  }
  
  if (type !== ParticleType.STAR && type !== ParticleType.NEEDLE) {
     treeQ.setFromEuler(dummyObj.rotation);
  } else {
     dummyObj.updateMatrix();
     treeQ.setFromRotationMatrix(dummyObj.matrix);
  }

  // COLOR & SCALE
  let colors = PALETTE.NEEDLE;
  let baseScale = 1;

  switch(type) {
    case ParticleType.STAR:
      colors = PALETTE.STAR;
      baseScale = 1.5;
      break;
    case ParticleType.RIBBON:
      colors = PALETTE.RIBBON;
      baseScale = 0.08;
      break;
    case ParticleType.ORNAMENT:
      colors = PALETTE.ORNAMENT;
      baseScale = 0.4;
      break;
    case ParticleType.SPARKLE:
      colors = PALETTE.SPARKLE;
      baseScale = 0.3; 
      break;
    case ParticleType.NEEDLE:
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
