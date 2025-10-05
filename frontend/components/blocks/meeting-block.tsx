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
  Wand2,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  UserX
} from 'lucide-react';
import { ResultsDisplay } from './results-display';
import dynamic from 'next/dynamic';
import { TabNavigation, MeetingTab } from '@/components/meeting/tabs/tab-navigation';
import { SummaryTab } from '@/components/meeting/tabs/summary-tab';
import { NotesTab } from '@/components/meeting/tabs/notes-tab';
const TranscriptTab = dynamic(() => import('@/components/meeting/tabs/transcript-tab'), { ssr: false });
import { apiService } from '@/lib/api';
import { formatSeconds, isMeetingProcessing, hasSummary } from '@/lib/utils';

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
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              backgroundColor: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#10B981',
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-[#9B9B9B]">Thinking</span>
    </div>
  );
};

// Speaker Display Component
const SpeakerDisplaySection = ({ speakers }: { speakers: Array<{ name: string; matched: boolean }> }) => {
  if (!speakers || speakers.length === 0) return null;

  const matchedSpeakers = speakers.filter(s => s.matched);
  const unmatchedSpeakers = speakers.filter(s => !s.matched);

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Detected Speakers</h3>
      </div>
      
      <div className="space-y-2">
        {/* Matched speakers */}
        {matchedSpeakers.map((speaker, index) => (
          <div key={`matched-${index}`} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck size={12} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-900 font-medium">{speaker.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Registered
            </span>
          </div>
        ))}
        
        {/* Unmatched speakers */}
        {unmatchedSpeakers.map((speaker, index) => (
          <div key={`unmatched-${index}`} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <UserX size={12} className="text-gray-600" />
            </div>
            <span className="text-sm text-gray-700">{speaker.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Unknown
            </span>
          </div>
        ))}
      </div>
      
      {unmatchedSpeakers.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          To register unknown speakers, go to <strong>Speaker Setup</strong> and add their voice samples.
        </p>
      )}
    </div>
  );
};

// Feedback Component
const FeedbackSection = () => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    // Here you could send feedback to analytics or backend
    console.log(`Feedback: ${type}`);
  };

  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-sm text-[#6B6B6B] font-medium">Was this helpful?</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleFeedback('positive')}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            feedback === 'positive' 
              ? 'bg-green-100 text-green-600' 
              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
          }`}
          title="Thumbs up"
        >
          <ThumbsUp size={16} strokeWidth={2} />
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            feedback === 'negative' 
              ? 'bg-red-100 text-red-600' 
              : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'
          }`}
          title="Thumbs down"
        >
          <ThumbsDown size={16} strokeWidth={2} />
        </button>
      </div>
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
  const [activeTab, setActiveTab] = useState<MeetingTab>('notes');
  
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

  const getParticipants = (): Array<{ name: string; matched: boolean }> => {
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

  const buildActionItemsMarkdown = (items: Array<{ id: string; text: string; assignee?: string; completed?: boolean }>) => {
    if (!items || items.length === 0) return "";
    const lines: string[] = [];
    lines.push("\n\n## Action Items\n");
    for (const item of items) {
      const checked = item.completed ? "x" : " ";
      const assignee = item.assignee ? ` (Assigned to: ${item.assignee})` : "";
      lines.push(`- [${checked}] ${item.text}${assignee}`);
    }
    return lines.join("\n");
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

  // Auto-switch to summary after completion only if summary exists
  useEffect(() => {
    if (block.props.status === 'completed' && hasSummary(block.props)) {
      setActiveTab('summary');
    }
  }, [block.props.status, block.props.summary]);

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
      
      // Use WebM/Opus when supported, fallback to default
      const mimeType = 'audio/webm;codecs=opus';
      const isWebMSupported = MediaRecorder.isTypeSupported(mimeType);
      const recorder = isWebMSupported 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
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
        if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone access and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === 'NotSupportedError') {
          errorMessage = "Recording not supported in this browser. Please use Chrome, Edge, or Firefox, or upload an audio file instead.";
        } else {
          errorMessage = err.message;
        }
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
          // Create WebM blob and wrap in File
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
          processAudio(audioFile);
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

  const processAudio = async (audioInput: File | Blob) => {
    updateBlock({ status: "processing" });
    
    try {
      // Ensure we have a File with proper name and type
      let audioFile: File;
      if (audioInput instanceof File) {
        audioFile = audioInput;
      } else {
        // Convert Blob to File with appropriate name and type
        const fileName = `meeting-${Date.now()}.webm`;
        audioFile = new File([audioInput], fileName, { type: 'audio/webm' });
      }
      
      // Call real backend API
      const response = await apiService.processMeeting({
        audio: audioFile,
        generate_insights: true,
        generate_all_action_views: false,
      });
      
      if (response.success) {
        updateBlock({
          status: "completed",
          transcript: response.transcription.segments as any,
          summary: response.summary,
          actionItems: response.action_items as any,
          participants: response.speakers as any,
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


  const getCurrentState = () => {
    if (block.props.status === 'processing') return 'state3_processing';
    if (block.props.status === 'recording' || isRecording) return 'state2_duringRecording';
    return 'state1_beforeRecording';
  };

  const currentState = getCurrentState();

  // Determine when to show consent message - only at the very beginning
  const shouldShowConsent = block.props.status === 'idle' || 
                           (!block.props.status && currentState === 'state1_beforeRecording');
  
  // Determine when to show feedback
  const shouldShowFeedback = block.props.status === 'completed';

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
            {/* Permission hint for first-time users */}
            {!block.props.status && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You'll be asked to allow microphone access when you start recording. 
                  This is required for audio capture and will only be used for this meeting.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-0">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={(t) => setActiveTab(t)}
              showTranscript={block.props.status === 'completed' && getTranscript().length > 0}
              isCompleted={block.props.status === 'completed'}
              meetingData={block.props}
            />

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

        {block.props.status !== 'completed' && (
          <div className="mt-5">
            <p className="font-normal leading-5" style={{ fontSize: '18px', color: '#9B9B9B', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em' }}>
              Notion AI will summarize the notes and transcript
            </p>
          </div>
        )}

        {block.props.status === 'error' && block.props.errorMessage && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium mb-2">Recording Error</p>
                <p className="text-sm text-red-600 mb-3">{block.props.errorMessage}</p>
                
                {/* Show upload fallback for permission/unsupported errors */}
                {(block.props.errorMessage.includes('denied') || 
                  block.props.errorMessage.includes('not supported') || 
                  block.props.errorMessage.includes('microphone')) && (
                  <div className="mt-3">
                    <p className="text-sm text-red-600 mb-2">Alternative: Upload an audio file instead</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Upload size={16} />
                      Upload Audio File
                    </button>
                  </div>
                )}
              </div>
            </div>
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

        {block.props.status === 'completed' && (
          <div className="mt-4">
            {/* Speaker Display Section */}
            <SpeakerDisplaySection speakers={getParticipants()} />
            
            {activeTab === 'summary' && hasSummary(block.props) && (
              <SummaryTab 
                summary={(block.props.summary || "") + buildActionItemsMarkdown(getActionItems())}
                isProcessing={isMeetingProcessing(block.props)}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab />
            )}
            {activeTab === 'transcript' && (
              <TranscriptTab transcript={getTranscript()} />
            )}
          </div>
        )}

        {/* Consent message - only show at the very beginning */}
        {shouldShowConsent && (
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

        {/* Feedback section - only show after processing completes */}
        {shouldShowFeedback && (
          <FeedbackSection />
        )}
      </div>
    </div>
  );
};