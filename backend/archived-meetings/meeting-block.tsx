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
import { DotAudioVisualization } from '@/components/meeting/dot-audio-visualization';
import { apiService } from '@/lib/api';
import { getDemoMode, initDemoGlobals } from '@/lib/demo';
import { demoParticipants, demoTranscript, demoSummaryMarkdown, demoActionItemsMarkdown, demoSpeakers } from '@/lib/demoData';
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

// Real-time Audio Visualization Component
const AudioVisualization = ({ isActive, analyser }: { isActive: boolean; analyser: AnalyserNode | null }) => {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive || !analyser) {
      setBars([]);
      return;
    }

    const updateVisualization = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      // Create 65 bars from the frequency data
      const barCount = 65;
      const newBars: number[] = [];
      
      for (let i = 0; i < barCount; i++) {
        // Map frequency data to bars (use different frequency ranges)
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const frequency = dataArray[dataIndex];
        // Normalize to 0-1 range and add some smoothing
        const normalizedValue = Math.min(frequency / 255, 1);
        newBars.push(normalizedValue);
      }
      
      setBars(newBars);
      
      if (isActive) {
        requestAnimationFrame(updateVisualization);
      }
    };

    updateVisualization();
  }, [isActive, analyser]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-1 ml-6 mr-auto h-6">
      {bars.map((intensity, index) => (
        <div
          key={index}
          className="w-1 rounded-full transition-all duration-75"
          style={{
            backgroundColor: intensity > 0.7 ? '#1A1A1A' : intensity > 0.4 ? '#6B6B6B' : '#E5E5E5',
            opacity: intensity > 0.1 ? 1 : 0.3,
            height: `${Math.max(2, 4 + intensity * 20)}px`,
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

// Speaker Display Component
const SpeakerDisplaySection = ({ 
  speakers, 
  selectedSpeaker, 
  onSpeakerClick 
}: { 
  speakers: Array<{ name: string; matched: boolean }>;
  selectedSpeaker: string | null;
  onSpeakerClick: (speakerName: string) => void;
}) => {
  if (!speakers || speakers.length === 0) return null;

  const allSpeakers = [...speakers];

  // Load speaker configs to resolve consistent profile photos
  const [speakerConfigs, setSpeakerConfigs] = React.useState<Record<string, { profilePhoto?: string }>>({});
  React.useEffect(() => {
    let mounted = true;
    apiService.getSpeakers().then(list => {
      if (!mounted) return;
      const map: Record<string, { profilePhoto?: string }> = {};
      list.forEach(s => { map[s.name] = { profilePhoto: s.metadata?.profilePhoto }; });
      setSpeakerConfigs(map);
    }).catch(() => { /* noop */ });
    return () => { mounted = false; };
  }, []);

  const resolvePhoto = (name: string) => {
    const meta = speakerConfigs[name];
    return meta?.profilePhoto || '/Notion_AI_Face.png';
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Detected Speakers</h3>
        </div>
        {selectedSpeaker && (
          <button
            onClick={() => onSpeakerClick('')}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Show all
          </button>
        )}
      </div>
      
      <div className="flex flex-row flex-wrap gap-4">
        {allSpeakers.map((speaker, index) => (
          <div 
            key={`speaker-${index}`} 
            className={`flex items-center gap-2 cursor-pointer transition-all duration-200 ${
              selectedSpeaker === speaker.name 
                ? 'bg-blue-50 rounded-lg px-2 py-1' 
                : 'hover:bg-gray-100 rounded-lg px-2 py-1'
            }`}
            onClick={() => onSpeakerClick(speaker.name)}
          >
            <img
              src={resolvePhoto(speaker.name)}
              alt={speaker.name}
              className={`w-8 h-8 rounded-full object-cover border-2 border-gray-300`}
              onError={(e) => { (e.target as HTMLImageElement).src = '/Notion_AI_Face.png'; }}
            />
            <span className="text-sm text-gray-900 font-medium">{speaker.name}</span>
          </div>
        ))}
      </div>
      
      {speakers.some(s => !s.matched) && (
        <p className="mt-3 text-xs text-gray-500">
          To register unknown speakers, go to <strong>Speaker Setup</strong> and add their voice samples.
        </p>
      )}
    </div>
  );
};

// Compact Detected Speakers row (for header)
const DetectedSpeakersHeaderRow = ({
  speakers,
  onSpeakerClick,
  selectedSpeaker
}: {
  speakers: Array<{ name: string; matched: boolean }>;
  onSpeakerClick: (speakerName: string) => void;
  selectedSpeaker: string | null;
}) => {
  if (!speakers || speakers.length === 0) return null;

  const [speakerConfigs, setSpeakerConfigs] = React.useState<Record<string, { profilePhoto?: string }>>({});
  React.useEffect(() => {
    let mounted = true;
    apiService.getSpeakers().then(list => {
      if (!mounted) return;
      const map: Record<string, { profilePhoto?: string }> = {};
      list.forEach(s => { map[s.name] = { profilePhoto: s.metadata?.profilePhoto }; });
      setSpeakerConfigs(map);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const resolvePhoto = (name: string) => speakerConfigs[name]?.profilePhoto || '/Notion_AI_Face.png';

  return (
    <div className="flex items-center gap-3">
      {speakers.map((s, idx) => (
        <button
          key={`hdr-speaker-${idx}`}
          onClick={() => onSpeakerClick(selectedSpeaker === s.name ? '' : s.name)}
          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${selectedSpeaker === s.name ? 'bg-blue-50' : ''}`}
          title={s.name}
        >
          <img
            src={resolvePhoto(s.name)}
            alt={s.name}
            className="w-6 h-6 rounded-full object-cover border border-gray-300"
            onError={(e) => { (e.target as HTMLImageElement).src = '/Notion_AI_Face.png'; }}
          />
          <span className="text-sm text-gray-800">{s.name}</span>
        </button>
      ))}
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
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
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
      return block.props.actionItems ? JSON.parse(block.props.actionItems) : {};
    } catch {
      return {};
    }
  };

  const getFilteredActionItems = (allItems: Record<string, string[]>, selectedSpeaker: string | null) => {
    if (!selectedSpeaker) {
      return allItems;
    }
    
    const filtered: Record<string, string[]> = {};
    
    // Always include the selected speaker's items
    if (allItems[selectedSpeaker]) {
      filtered[selectedSpeaker] = allItems[selectedSpeaker];
    }
    
    // Include "Everyone" items if they exist
    if (allItems["Everyone"]) {
      filtered["Everyone"] = allItems["Everyone"];
    }
    
    // Include "Other" items if they exist
    if (allItems["Other"]) {
      filtered["Other"] = allItems["Other"];
    }
    
    return filtered;
  };

  const buildActionItemsMarkdown = (actionItemsByPerson: Record<string, string[]>) => {
    if (!actionItemsByPerson || Object.keys(actionItemsByPerson).length === 0) return "";
    
    const lines: string[] = [];
    lines.push("\n\n## Action Items\n");
    
    // Process each person's action items
    Object.entries(actionItemsByPerson).forEach(([person, tasks]) => {
      if (tasks && tasks.length > 0) {
        lines.push(`@${person}:`);
        tasks.forEach(task => {
          lines.push(`- [ ] ${task}`);
        });
        lines.push(""); // Add blank line between sections
      }
    });
    
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
    // If demo mode is enabled, simulate processing and inject scripted results
    try {
      if (getDemoMode()) {
        initDemoGlobals(demoSpeakers);
        updateBlock({ status: 'processing', errorMessage: undefined });
        window.setTimeout(() => updateBlock({ status: 'processing', errorMessage: undefined }), 500);
        window.setTimeout(() => updateBlock({ status: 'processing', errorMessage: undefined }), 1200);
        window.setTimeout(() => updateBlock({
          status: 'completed',
          participants: demoParticipants as any,
          transcript: demoTranscript as any,
          summary: demoSummaryMarkdown,
          actionItems: demoActionItemsMarkdown as any,
          errorMessage: undefined,
        }), 2000);
        return;
      }
    } catch {}

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up Web Audio API for real-time visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyserNode);
      
      setAudioContext(audioCtx);
      setAnalyser(analyserNode);
      
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
        if (audioCtx) {
          audioCtx.close();
        }
        setAudioContext(null);
        setAnalyser(null);
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

      // Close audio context for visualization
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
        setAnalyser(null);
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
      <div className="pt-3 pb-2 pl-[25px] pr-4 flex items-center justify-between">
        <h1 className="leading-tight" style={{ fontSize: '28px', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em', fontWeight: 600, color: '#222222' }}>
          <span style={{ fontWeight: 600, color: '#222222' }}>Meeting</span> <span style={{ fontWeight: 600, color: '#9B9B9B' }}>@Today</span>
        </h1>
        {getParticipants().length > 0 && (
          <DetectedSpeakersHeaderRow 
            speakers={getParticipants()} 
            selectedSpeaker={selectedSpeaker}
            onSpeakerClick={(name) => setSelectedSpeaker(name || null)}
          />
        )}
      </div>

      <div className="mt-1 bg-white border border-[#E5E5E5] rounded-t-2xl rounded-b-3xl p-5 -mx-px">
        {currentState === 'state1_beforeRecording' && (
          <div className="mb-5">
            {/* Permission hint for first-time users */}
            {!block.props.status && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You&apos;ll be asked to allow microphone access when you start recording. 
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
              isRecording={currentState === 'state2_duringRecording'}
              isProcessing={currentState === 'state3_processing'}
              meetingData={block.props}
            />

            <DotAudioVisualization isActive={currentState === 'state2_duringRecording'} analyser={analyser} />
          </div>

          <div className="flex items-center gap-6">
            {currentState === 'state1_beforeRecording' && (
              <>
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
            {/* Detected speakers now shown in header; no longer displayed here */}
            {activeTab === 'summary' && hasSummary(block.props) && (
              <SummaryTab 
                summary={(block.props.summary || "") + buildActionItemsMarkdown(getFilteredActionItems(getActionItems(), selectedSpeaker))}
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