
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audioUtils';

// Ensure this API key is handled securely, e.g., through environment variables.
// Do not hardcode API keys in production code.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let nextStartTime = 0;
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);
const sources = new Set<AudioBufferSourceNode>();

export interface LiveSession {
  sendRealtimeInput: (input: { media: { data: string; mimeType: string; }; }) => void;
  close: () => void;
}

interface ConnectCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export const connectToLiveSession = async (callbacks: ConnectCallbacks): Promise<LiveSession> => {
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: async (message: LiveServerMessage) => {
        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContext,
                24000,
                1,
            );
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => {
                sources.delete(source);
            });
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            sources.add(source);
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
            for (const source of sources.values()) {
                source.stop();
                sources.delete(source);
            }
            nextStartTime = 0;
        }
      },
      onerror: (e: ErrorEvent) => {
        console.error('Live session error:', e);
        callbacks.onError(new Error(e.message || 'An unknown error occurred.'));
      },
      onclose: (e: CloseEvent) => {
        console.log('Live session closed');
        callbacks.onClose();
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: 'You are JanVaani, a friendly and helpful AI assistant for the people of India. You can understand and speak all Indian languages fluently. Your goal is to assist users with their queries in a natural, conversational manner. Respond helpfully and concisely in the same language the user speaks.',
    },
  });

  return sessionPromise;
};
