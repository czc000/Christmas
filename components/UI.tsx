import React from 'react';
import { ParticleState } from '../types';

interface UIProps {
  currentState: ParticleState;
  onToggle: () => void;
}

export const UI: React.FC<UIProps> = ({ currentState, onToggle }) => {
  const isTree = currentState === ParticleState.TREE_SHAPE;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center py-12 px-6">
      
      {/* Header */}
      <header className="text-center space-y-3 pointer-events-auto mt-4">
        <h1 className="text-xl md:text-3xl font-bold text-pink-300 drop-shadow-[0_0_10px_rgba(255,192,203,0.5)] font-serif tracking-widest">
          Merry Christmas
        </h1>
        <p className="text-pink-200/60 text-[10px] md:text-xs font-sans tracking-[0.3em] uppercase">
          Only for Lin Xi
        </p>
      </header>

      {/* Controls */}
      <div className="pointer-events-auto mb-10">
        <button
          onClick={onToggle}
          className={`
            group relative px-10 py-4
            transition-all duration-500 ease-out
            border-y border-white/30
            hover:border-white/80 hover:scale-105 active:scale-95
            bg-black/20 backdrop-blur-sm
          `}
        >
          {/* Glowing Lines */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <span className="relative z-10 font-serif text-lg text-pink-50 tracking-[0.2em] flex items-center gap-4">
             {isTree ? (
               <>
                 <span className="text-xs">✕</span> RELEASE MEMORIES <span className="text-xs">✕</span>
               </>
             ) : (
               <>
                 <span className="text-xs">✦</span> ASSEMBLE TREE <span className="text-xs">✦</span>
               </>
             )}
          </span>
        </button>
      </div>
      
      {/* Frame Corners */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6">
         <div className="w-full h-full border border-white/5 rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-pink-200/40" />
            <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-pink-200/40" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-pink-200/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-pink-200/40" />
         </div>
      </div>
    </div>
  );
};
