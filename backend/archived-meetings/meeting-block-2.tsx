"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Upload, 
  Play, 
  Pause, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Users,
  FileAudio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  FileText,
  Volume2,
  Copy,
  Sliders,
  Wand2
} from 'lucide-react';
import { ParticipantInput } from './participant-input';
import { ResultsDisplay } from './results-display';
import { apiService } from '@/lib/api';

interface MeetingBlockProps {
  id: string;
  title: string;
  status: string;
  participants: string;
  duration: number;
  audioUrl: string;
  transcript: string;
  summary: string;
  actionItems: string;
  createdAt: string;
  errorMessage: string;
}

// Audio Visualization Component
const AudioVisualization = ({ isActive }: { isActive: boolean }) => {
  const [dots, setDots] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      setDots([]);
      return;
    }

    const generateDots = () => {
      const dotCount = 65;
      const newDots = Array.from({ length: dotCount }, () => Math.random());
      setDots(newDots);
    };

    generateDots();
    const interval = setInterval(generateDots, 150);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-1 ml-6 mr-auto">
      {dots.map((intensity, index) => (
        <div
          key={index}
          className="w-1 h-1 rounded-full transition-all duration-150"
          style={{
            backgroundColor: intensity > 0.7 ? '#1A1A1A' : intensity > 0.4 ? '#6B6B6B' : '#E5E5E5',
            opacity: intensity > 0.2 ? 1 : 0.3,
            transform: `scaleY(${0.5 + intensity * 1.5})`
          }}
        />
      ))}
    </div>
  );
};

// Processing Indicator Component
const ProcessingIndicator = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce-thinking"
            style={{
              backgroundColor: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#10B981',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-[#9B9B9B]">Thinking</span>
    </div>
  );
};

export const MeetingBlock = ({ block, editor }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateBlock = (updates: Partial<MeetingBlockProps>) => {
    const processedUpdates = { ...updates } as any;
    if (updates.participants && Array.isArray(updates.participants)) {
      processedUpdates.participants = JSON.stringify(updates.participants);
    }
    if (updates.transcript && Array.isArray(updates.transcript)) {
      processedUpdates.transcript = JSON.stringify(updates.transcript);
    }
    if (updates.actionItems && Array.isArray(updates.actionItems)) {
      processedUpdates.actionItems = JSON.stringify(updates.actionItems);
    }
    
    editor.updateBlock(block, {
      props: { ...block.props, ...processedUpdates }
    });
  };

  const getParticipants = (): string[] => {
    try {
      return block.props.participants ? JSON.parse(block.props.participants) : [];
    } catch {
      return [];
    }
  };

  const getTranscript = () => {
    try {
      return block.props.transcript ? JSON.parse(block.props.transcript) : [];
    } catch {
      return [];
    }
  };

  const getActionItems = () => {
    try {
      return block.props.actionItems ? JSON.parse(block.props.actionItems) : [];
    } catch {
      return [];
    }
  };

  // Health check on component mount
  useEffect(() => {
    apiService.healthCheck().then(healthy => {
      if (!healthy) {
        console.warn('Backend is not available. Please ensure the backend server is running at', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      } else {
        console.log('Backend connection established');
      }
    });
  }, []);

  useEffect(() => {
    if (block.props.duration > 0) {
      setRecordingTime(block.props.duration);
    }
  }, [block.props.duration]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setMediaRecorder(null);
        setAudioChunks([]);
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      updateBlock({ status: "recording", errorMessage: undefined });

      intervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = "Failed to start recording. Please check microphone permissions.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      updateBlock({ status: "error", errorMessage });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setTimeout(() => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          processAudio(audioBlob);
        } else {
          updateBlock({ status: "error", errorMessage: "No audio recorded." });
        }
      }, 100);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('audio/')) {
      updateBlock({ 
        status: "processing",
        title: file.name.replace(/\.[^/.]+$/, ""),
        errorMessage: undefined
      });
      processAudio(file);
    } else {
      updateBlock({ 
        status: "error", 
        errorMessage: "Please upload a valid audio file." 
      });
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    updateBlock({ status: "processing" });
    
    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], `meeting-${Date.now()}.wav`, { type: 'audio/wav' });
      
      // Get participants to pass as speaker names
      const participants = getParticipants();
      
      // Call real backend API
      const response = await apiService.processMeeting({
        audio: audioFile,
        speaker_names: participants.join(','), // Backend expects comma-separated string
        generate_insights: true,
        generate_all_action_views: false,
      });
      
      if (response.success) {
        updateBlock({
          status: "completed",
          transcript: response.transcription.segments as any,
          summary: response.summary,
          actionItems: response.action_items as any,
          participants: participants as any,
          duration: recordingTime > 0 ? recordingTime : undefined
        });
      } else {
        updateBlock({
          status: "error",
          errorMessage: response.error || "Processing failed",
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      updateBlock({
        status: "error",
        errorMessage: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      handleFileUpload(audioFile);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + secs.toString().padStart(2, '0');
  };

  const getCurrentState = () => {
    if (block.props.status === 'processing') return 'state3_processing';
    if (block.props.status === 'recording' || isRecording) return 'state2_duringRecording';
    return 'state1_beforeRecording';
  };

  const currentState = getCurrentState();

  return (
    <div className="w-full bg-[#F7F6F3] border border-[#E5E5E5] my-2 rounded-3xl">
      <div className="pt-3 pb-2 pl-[25px]">
        <h1 className="leading-tight" style={{ fontSize: '28px', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em', fontWeight: 400, color: '#222222' }}>
          <span style={{ fontWeight: 400, color: '#222222' }}>Meeting</span> <span style={{ fontWeight: 400, color: '#9B9B9B' }}>@Today</span>
        </h1>
      </div>

      <div className="mt-1 bg-white border border-[#E5E5E5] rounded-t-2xl rounded-b-3xl p-5 -mx-px">
        {currentState === 'state1_beforeRecording' && (
          <div className="mb-5">
            <ParticipantInput 
              participants={getParticipants()}
              onParticipantsChange={(newParticipants) => updateBlock({ participants: newParticipants as any })}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-0">
            <button className="flex items-center gap-3 h-[33px] px-3 bg-[#EFEEEA] border-none rounded-full cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Edit3 size={18} strokeWidth={2} className="text-[#1F1F1F]" />
              <span className="text-sm font-medium text-[#1F1F1F]">Notes</span>
            </button>

            {(currentState === 'state2_duringRecording' || currentState === 'state3_processing') && (
              <div className="flex items-center gap-2 px-6 py-3 bg-transparent rounded-full cursor-pointer ml-2">
                <FileText size={20} strokeWidth={2} className="text-[#6B6B6B]" />
                <span className="text-base font-medium text-[#6B6B6B]">Transcript</span>
              </div>
            )}

            <AudioVisualization isActive={currentState === 'state2_duringRecording'} />
          </div>

          <div className="flex items-center gap-6">
            {currentState === 'state1_beforeRecording' && (
              <>
                <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Sliders size={18} strokeWidth={2} className="text-[#6B6B6B]" />
                </button>
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(40, 131, 227, 0.2)' }}>
                    <button
                      onClick={startRecording}
                      className="flex items-center justify-center h-[33px] bg-[#2883E3] text-white text-sm font-semibold border-none cursor-pointer px-3 transition-all duration-200 hover:bg-[#2272CC]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Start transcribing
                    </button>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center justify-center h-[33px] w-[33px] bg-[#2883E3] text-white border-none border-l border-l-[#2272CC] cursor-pointer transition-all duration-200 hover:bg-[#2272CC]"
                    >
                      <ChevronDown size={12} strokeWidth={2} className="text-white" />
                    </button>
                  </div>
                  
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-10">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left text-[#1A1A1A] hover:bg-[#F7F7F7] flex items-center gap-3 transition-colors rounded-xl"
                      >
                        <Upload size={18} className="text-[#6B6B6B]" />
                        <span className="text-sm font-medium">Upload audio file</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          
          {currentState === 'state2_duringRecording' && (
            <>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50">
                <Wand2 size={18} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50">
                <Sliders size={18} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50">
                <Volume2 size={18} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50">
                <Copy size={18} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <button
                onClick={stopRecording}
                className="h-[50px] px-6 bg-[#FEE2E2] text-[#EF4444] text-base font-semibold rounded-lg border-none cursor-pointer min-w-[100px] transition-all duration-200 hover:bg-[#FECACA]"
              >
                Stop
              </button>
            </>
          )}
          
          {currentState === 'state3_processing' && (
            <>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-50">
                <Sliders size={18} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <ProcessingIndicator />
            </>
          )}
        </div>
      </div>

        <div className="mt-5">
          <p className="font-normal leading-5" style={{ fontSize: '18px', color: '#9B9B9B', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em' }}>
            Notion AI will summarize the notes and transcript
          </p>
        </div>

        {block.props.status === 'error' && block.props.errorMessage && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{block.props.errorMessage}</p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          id={`upload-${block.id}`}
        />

        {block.props.status === 'processing' && (
          <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg mt-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-4" />
            <p className="text-sm font-medium text-blue-800">
              Processing meeting audio...
            </p>
          </div>
        )}

        {block.props.status === 'completed' && (
          <ResultsDisplay 
            transcript={getTranscript()}
            summary={block.props.summary || ""}
            actionItems={getActionItems()}
            participants={getParticipants()}
            duration={block.props.duration}
            showResults={showResults}
            onToggleResults={() => setShowResults(!showResults)}
          />
        )}

        {currentState !== 'state3_processing' && (
          <div className="mt-6 flex items-center justify-between">
            <p className="font-normal leading-4" style={{ fontSize: '14px', color: '#9B9B9B', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em' }}>
              By starting, you confirm everyone being transcribed has given consent.
            </p>
            <div className="flex items-center gap-2">
              <button 
                className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                title="Play audio"
              >
                <Volume2 size={16} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
              <button 
                className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                title="Copy"
              >
                <Copy size={16} strokeWidth={2} className="text-[#6B6B6B]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
