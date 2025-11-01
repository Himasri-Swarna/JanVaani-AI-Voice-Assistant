
import React from 'react';
import { CallState } from '../types';

interface VisualizerProps {
  state: CallState;
}

export const Visualizer: React.FC<VisualizerProps> = ({ state }) => {
  const isActive = state === CallState.ACTIVE;
  const isConnecting = state === CallState.CONNECTING;

  const pulseClass = isActive ? 'animate-pulse' : '';
  const spinClass = isConnecting ? 'animate-spin' : '';

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
       {isActive && [1, 2, 3].map((i) => (
         <div
           key={i}
           className="absolute border-2 border-green-500 rounded-full animate-ping-slow opacity-50"
           style={{
             width: `${i * 33.3}%`,
             height: `${i * 33.3}%`,
             animationDelay: `${i * 0.2}s`,
           }}
         ></div>
       ))}
      <div className={`w-40 h-40 bg-gray-700 rounded-full flex items-center justify-center shadow-inner transition-all duration-500 ${isActive ? 'scale-110' : ''}`}>
        <svg
          className={`w-24 h-24 text-green-400 transition-all duration-300 ${pulseClass} ${spinClass}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgb(52, 211, 153)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgb(16, 185, 129)', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="url(#grad1)"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="url(#grad1)"></path>
          <line x1="12" y1="19" x2="12" y2="23" stroke="url(#grad1)"></line>
        </svg>
      </div>
      <style>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};
