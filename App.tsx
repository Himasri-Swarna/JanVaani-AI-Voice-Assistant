
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CallState } from './types';
import { connectToLiveSession, LiveSession } from './services/geminiService';
import { createBlob } from './utils/audioUtils';

import { Header } from './components/Header';
import { CallButton } from './components/CallButton';
import { Visualizer } from './components/Visualizer';
import { Timer } from './components/Timer';

const App: React.FC = () => {
  const [callState, setCallState] = useState<CallState>(CallState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanUpAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
  }, []);

  // FIX: Updated endCall to be idempotent to prevent race conditions and multiple calls.
  // This solves issues with stale closures in callbacks.
  const endCall = useCallback(async () => {
    // Use sessionPromiseRef as a guard to make this function idempotent.
    if (!sessionPromiseRef.current) {
      return;
    }

    setCallState(CallState.ENDED);
    setError(null);
    
    const sessionPromise = sessionPromiseRef.current;
    // Nullify the ref immediately to prevent re-entry from the onClose callback.
    sessionPromiseRef.current = null;

    if (sessionPromise) {
      try {
        const session = await sessionPromise;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }
    
    cleanUpAudio();
    setTimeout(() => setCallState(CallState.IDLE), 1500); // Reset to idle after a short delay
  }, [cleanUpAudio]);


  const startCall = useCallback(async () => {
    if (callState !== CallState.IDLE) return;
    setCallState(CallState.CONNECTING);
    setError(null);
    setTimer(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media Devices API not supported.');
      }
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      sessionPromiseRef.current = connectToLiveSession({
        onOpen: () => {
          setCallState(CallState.ACTIVE);
          
          inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current!);
          scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          
          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }
          };

          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
        },
        // FIX: Removed conditional check which was causing a type error due to a stale closure.
        // The new idempotent endCall function correctly handles the logic to prevent duplicate calls.
        onClose: () => {
          endCall();
        },
        onError: (err: Error) => {
          console.error("Session error:", err);
          setError('Connection error. Please try again.');
          endCall();
        }
      });

    } catch (err) {
      console.error("Failed to start call:", err);
      setError("Could not access microphone. Please grant permission and try again.");
      setCallState(CallState.IDLE);
      cleanUpAudio();
    }
  }, [callState, cleanUpAudio, endCall]);

  const handleCallButtonClick = () => {
    if (callState === CallState.IDLE) {
      startCall();
    } else {
      endCall();
    }
  };
  
  useEffect(() => {
    // FIX: Replaced NodeJS.Timeout with ReturnType<typeof setInterval> for correct browser environment typing.
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callState === CallState.ACTIVE) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 selection:bg-green-500/20">
      <div className="w-full max-w-md mx-auto bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '80vh', minHeight: '600px', maxHeight: '800px'}}>
        <Header />
        <div className="flex-grow flex flex-col items-center justify-between p-8 text-center bg-gradient-to-b from-gray-800 to-gray-900">
          <div className='w-full'>
            <p className="text-2xl font-semibold text-green-400">JanVaani AI</p>
            <Timer state={callState} seconds={timer} />
          </div>

          <Visualizer state={callState} />

          <div className="w-full">
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <p className="text-gray-400 mb-6 h-10">
              {callState === CallState.IDLE && 'Press the call button to start'}
              {callState === CallState.CONNECTING && 'Connecting...'}
              {callState === CallState.ACTIVE && 'You are connected'}
              {callState === CallState.ENDED && 'Call Ended'}
            </p>
            <CallButton state={callState} onClick={handleCallButtonClick} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
