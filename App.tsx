import React, { useState, useCallback } from 'react';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { HandController } from './components/HandController';
import { ParticleState } from './types';

function App() {
  const [particleState, setParticleState] = useState<ParticleState>(ParticleState.SCATTERED);
  const [handRotation, setHandRotation] = useState(0);

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
    <div className="relative w-full h-screen bg-[#1a0509]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Experience state={particleState} handRotation={handRotation} />
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
