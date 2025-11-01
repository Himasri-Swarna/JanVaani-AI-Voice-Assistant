
import React from 'react';
import { CallState } from '../types';
import { PhoneIcon, EndCallIcon } from './icons/CallIcons';

interface CallButtonProps {
  state: CallState;
  onClick: () => void;
}

export const CallButton: React.FC<CallButtonProps> = ({ state, onClick }) => {
  const isIdle = state === CallState.IDLE;
  const isConnecting = state === CallState.CONNECTING;
  const isActive = state === CallState.ACTIVE;

  const buttonClass = isIdle
    ? 'bg-green-500 hover:bg-green-600'
    : isConnecting
    ? 'bg-yellow-500 cursor-not-allowed'
    : 'bg-red-500 hover:bg-red-600';

  const disabled = state === CallState.CONNECTING || state === CallState.ENDED;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 mx-auto ${buttonClass} ${disabled ? 'opacity-50' : 'hover:scale-110 focus:scale-110'}`}
      aria-label={isIdle ? 'Start Call' : 'End Call'}
    >
      {isIdle || isConnecting ? <PhoneIcon /> : <EndCallIcon />}
    </button>
  );
};
