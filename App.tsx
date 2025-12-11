import React, { useState, useCallback } from 'react';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { HandController } from './components/HandController';
import { ParticleState } from './types';

function App() {
  const [particleState, setParticleState] = useState<ParticleState>(ParticleState.TREE_SHAPE);
  const [handRotation, setHandRotation] = useState(0);
  
  // 照片路径列表（从 my_picture 目录）
  const photoPaths = [
    'IMG_20230311_161453.jpg',
    'IMG_20250613_170359.jpg',
    'IMG_20250824_183732.jpg',
    'IMG_20250927_204031.jpg',
    'mmexport1738551898827.jpg',
    'mmexport1749642699957.jpg',
    'retouch_2023120920433815_edit_288345382350272.jpg',
    'retouch_2025100900031123.jpg',
  ];

  const handleToggle = () => {
    setParticleState((prev) => 
      prev === ParticleState.SCATTERED 
        ? ParticleState.TREE_SHAPE 
        : ParticleState.SCATTERED
    );
  };

  const handleGesture = useCallback((newState: ParticleState | null) => {
    if (newState) {
      setParticleState(newState);
    }
  }, []);

  const handleRotation = useCallback((val: number) => {
    setHandRotation(val);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#0d1520]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Experience state={particleState} handRotation={handRotation} photoPaths={photoPaths} />
      </div>
      
      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <UI currentState={particleState} onToggle={handleToggle} />
      </div>

      {/* Hand Control Layer */}
      <HandController onGesture={handleGesture} onRotation={handleRotation} />
    </div>
  );
}

export default App;
