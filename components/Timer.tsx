
import React from 'react';
import { CallState } from '../types';

interface TimerProps {
  state: CallState;
  seconds: number;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const Timer: React.FC<TimerProps> = ({ state, seconds }) => {
  if (state !== CallState.ACTIVE && state !== CallState.ENDED) {
    return <p className="text-lg text-gray-400 h-7 mt-2 invisible">00:00</p>;
  }

  return (
    <p className="text-lg text-gray-400 mt-2 font-mono h-7 transition-opacity duration-300">
      {formatTime(seconds)}
    </p>
  );
};
