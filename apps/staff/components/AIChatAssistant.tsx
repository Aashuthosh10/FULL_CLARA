
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LiveServerMessage, LiveSession } from "@google/genai";
import { createLiveSession, decode, decodeAudioData, createBlob } from '../services/geminiService';

const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 1 1-13.5 0v-1.5A.75.75 0 0 1 6 10.5Z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);

interface Transcription {
    id: number;
    user: string;
    assistant: string;
}

const AIChatAssistant: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState('Idle. Press start to talk.');
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const sources = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTime = useRef(0);

    const currentUserTranscription = useRef("");
    const currentAssistantTranscription = useRef("");

    const stopConversation = useCallback(() => {
        if (isListening) {
            setIsListening(false);
            setStatus('Stopping...');

            sessionPromiseRef.current?.then(session => session.close());
            sessionPromiseRef.current = null;
            
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (scriptProcessorRef.current) {
                scriptProcessorRef.current.disconnect();
                scriptProcessorRef.current = null;
            }
            if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
                inputAudioContextRef.current.close();
            }
             if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
                outputAudioContextRef.current.close();
            }

            sources.current.forEach(source => source.stop());
            sources.current.clear();
            nextStartTime.current = 0;
            
            setStatus('Idle. Press start to talk.');
        }
    }, [isListening]);

    const startConversation = useCallback(async () => {
        if (isListening) return;
        setIsListening(true);
        setStatus('Initializing...');
        setTranscriptions([]);
        currentUserTranscription.current = "";
        currentAssistantTranscription.current = "";

        try {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            sessionPromiseRef.current = createLiveSession({
                onopen: () => {
                    setStatus('Connected. You can start speaking now.');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                    scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        currentAssistantTranscription.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.inputTranscription) {
                        currentUserTranscription.current += message.serverContent.inputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const fullUserInput = currentUserTranscription.current.trim();
                        const fullAssistantOutput = currentAssistantTranscription.current.trim();
                        if(fullUserInput || fullAssistantOutput) {
                             setTranscriptions(prev => [...prev, {id: Date.now(), user: fullUserInput, assistant: fullAssistantOutput}]);
                        }
                        currentUserTranscription.current = "";
                        currentAssistantTranscription.current = "";
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        nextStartTime.current = Math.max(nextStartTime.current, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => sources.current.delete(source));
                        source.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.current.add(source);
                    }

                    if (message.serverContent?.interrupted) {
                         sources.current.forEach(source => source.stop());
                         sources.current.clear();
                         nextStartTime.current = 0;
                    }
                },
                onerror: (e) => {
                    console.error('Session error:', e);
                    setStatus(`Error: ${e.type}. Please try again.`);
                    stopConversation();
                },
                onclose: () => {
                    setStatus('Session closed.');
                    if (isListening) {
                        stopConversation();
                    }
                },
            });
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('Error: Could not access microphone.');
            setIsListening(false);
        }
    }, [isListening, stopConversation]);

    useEffect(() => {
        return () => {
            stopConversation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-slate-900/50 backdrop-blur-lg rounded-2xl border border-white/10 text-white">
            <h2 className="text-xl font-bold mb-4">AI Voice Assistant</h2>
            <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                {transcriptions.length === 0 && <p className="text-slate-400">Conversation will appear here...</p>}
                {transcriptions.map((t) => (
                    <div key={t.id} className="space-y-2">
                        {t.user && (
                             <div className="flex justify-end">
                                <p className="bg-blue-600/50 rounded-lg p-3 max-w-lg">{t.user}</p>
                            </div>
                        )}
                        {t.assistant && (
                            <div className="flex justify-start">
                                <p className="bg-slate-700/50 rounded-lg p-3 max-w-lg">{t.assistant}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex-shrink-0 flex flex-col items-center space-y-4">
                <p className="text-sm text-slate-400 h-5">{status}</p>
                <button
                    onClick={isListening ? stopConversation : startConversation}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 ${isListening ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
                >
                    {isListening ? <StopIcon /> : <MicIcon />}
                </button>
            </div>
        </div>
    );
};

export default AIChatAssistant;
