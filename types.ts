export enum ParticleState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE'
}

export enum ParticleType {
  NEEDLE = 'NEEDLE',      // Base tree volume (Green)
  ORNAMENT = 'ORNAMENT',  // Round Spheres (Gold)
  RIBBON = 'RIBBON',      // The neon spiral (Pink)
  STAR = 'STAR',          // Top star (Gold)
  SPARKLE = 'SPARKLE'     // Shimmering particles
}

export interface ParticleData {
  type: ParticleType;
  // Positions
  treePosition: [number, number, number];
  scatterPosition: [number, number, number];
  // Rotations (Quaternions as [x,y,z,w])
  treeRotation: [number, number, number, number];
  scatterRotation: [number, number, number, number];
  // Appearance
  color: [number, number, number]; // RGB 0-1
  scale: number;
  // Animation params
  speed: number; 
  phase: number; 
}
