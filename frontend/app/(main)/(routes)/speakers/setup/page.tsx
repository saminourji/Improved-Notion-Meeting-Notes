"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Trash2,
  User,
  Check,
  X,
  Plus,
  Users,
  AlertCircle,
  MoreVertical,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { apiService, SpeakerConfig } from "@/lib/api";
import { getDemoMode } from "@/lib/demo";
import { demoSpeakers } from "@/lib/demoData";
// Use public/ paths so <img src> renders exact URL strings
const IvanPortrait = "/Ivan_portrait.png";
const ShirPortrait = "/Shir_portrait.png";
const SamiPortrait = "/Sami_portrait.png";
const Rand1 = "/random_portrait_1.png";
const Rand2 = "/random_portrait_2.png";
const Rand3 = "/random_portrait_3.png";
const Rand4 = "/random_portrait_4.png";

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'completed' | 'error';

const PROFILE_PHOTOS = [
  '/Notion_AI_Face.png'
];

const RECORDING_PROMPTS = [
  "Hey, my name is Sami",
  "I love Notion", 
  "Don't you hire me!"
];

const PROMPT_TIMINGS = [5000, 3000, 4000]; // 5-3-4 seconds

// Helper function to get a unique profile photo
const getUniqueProfilePhoto = (usedPhotos: Set<string>): string => {
  const availablePhotos = PROFILE_PHOTOS.filter(photo => !usedPhotos.has(photo));
  if (availablePhotos.length === 0) {
    // If all photos are used, reset and use any photo
    return PROFILE_PHOTOS[Math.floor(Math.random() * PROFILE_PHOTOS.length)];
  }
  return availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
};


// Real-time Audio Visualization Component (matching meeting-block.tsx)
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
      
      // Create 65 bars from the frequency data using the After Effects technique
      const barCount = 65;
      const newBars: number[] = [];
      
      // Define frequency layers (like After Effects layers)
      const layers = [
        { start: 0, end: 0.2, bars: 15, heightMultiplier: 0.4 }, // Low frequencies - reduced height
        { start: 0.2, end: 0.5, bars: 20, heightMultiplier: 1.0 }, // Mid-low frequencies - normal height
        { start: 0.5, end: 0.8, bars: 20, heightMultiplier: 1.0 }, // Mid frequencies - normal height
        { start: 0.8, end: 1.0, bars: 10, heightMultiplier: 1.0 }  // High frequencies - normal height
      ];
      
      let barIndex = 0;
      
      for (const layer of layers) {
        const barsInLayer = layer.bars;
        const freqRange = layer.end - layer.start;
        
        for (let i = 0; i < barsInLayer && barIndex < barCount; i++) {
          // Map bar position within layer to frequency range
          const layerProgress = i / (barsInLayer - 1);
          const freqPosition = layer.start + (layerProgress * freqRange);
          const dataIndex = Math.floor(freqPosition * bufferLength);
          
          // Ensure we don't go out of bounds
          const safeIndex = Math.min(dataIndex, bufferLength - 1);
          
          // Get the frequency value
          const frequency = dataArray[safeIndex];
          
          // Add some smoothing by averaging with nearby bins
          let smoothedValue = frequency;
          if (safeIndex > 0 && safeIndex < bufferLength - 1) {
            smoothedValue = (dataArray[safeIndex - 1] + frequency + dataArray[safeIndex + 1]) / 3;
          }
          
          // Normalize to 0-1 range and apply layer height multiplier
          const normalizedValue = Math.min(smoothedValue / 255, 1) * layer.heightMultiplier;
          newBars.push(normalizedValue);
          
          barIndex++;
        }
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
    <div className="flex items-center gap-1 h-6 mt-2">
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

const AudioRecorder = ({ 
  onRecordingComplete, 
  maxDuration = 60,
  speakerName,
  isRecording,
  onStartRecording,
  onStopRecording,
  onAnalyserReady
}: { 
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number;
  speakerName: string;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAnalyserReady?: (analyser: AnalyserNode | null) => void;
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      cleanup();
      onStopRecording();
    }
  }, [recordingState, onStopRecording]);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (duration >= maxDuration && recordingState === 'recording') {
      stopRecording();
      toast.info(`Maximum recording duration (${maxDuration}s) reached`);
    }
  }, [duration, maxDuration, recordingState, stopRecording]);

  // Rotate prompts with custom timings (6-5-5 seconds) while recording
  useEffect(() => {
    if (recordingState === 'recording') {
      // Reset to first prompt when recording starts
      setCurrentPromptIndex(0);
      
      // Set up timeout to rotate prompts with custom timings
      const scheduleNextPrompt = (index: number) => {
        if (index < PROMPT_TIMINGS.length) {
          promptTimeoutRef.current = setTimeout(() => {
            setCurrentPromptIndex((prev) => (prev + 1) % RECORDING_PROMPTS.length);
            scheduleNextPrompt(index + 1);
          }, PROMPT_TIMINGS[index]);
        }
      };
      
      scheduleNextPrompt(0);
    } else {
      // Clear timeout when not recording
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
      setCurrentPromptIndex(0);
    }

    return () => {
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
    };
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordingState('requesting_permission');
    onStartRecording();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Set up audio context for visualization (matching meeting-block.tsx settings)
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Notify parent component that analyser is ready
      if (onAnalyserReady) {
        onAnalyserReady(analyserRef.current);
      }

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        setRecordingState('completed');
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecordingState('recording');
      setDuration(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      setRecordingState('error');
    }
  }, [onStartRecording, onAnalyserReady]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync external recording state with internal state
  useEffect(() => {
    if (isRecording && recordingState === 'idle') {
      startRecording();
    } else if (!isRecording && recordingState === 'recording') {
      stopRecording();
    }
  }, [isRecording, recordingState, startRecording, stopRecording]);

  // This component now only handles the recording logic and returns the recording state
  // The UI is handled by the parent component
  return null;
};

const FileUploadArea = ({ onFileUpload }: { onFileUpload: (file: File) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onFileUpload(file);
    } else {
      toast.error('Please select a valid audio file');
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onFileUpload(file);
    } else {
      toast.error('Please drop a valid audio file');
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging 
          ? 'border-gray-400 bg-gray-50 dark:bg-gray-700' 
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Drag and drop an audio file here, or
      </p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-sm text-gray-900 dark:text-gray-100 hover:underline font-medium"
      >
        browse to upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// Dropdown menu component for three-dot menu
const DropdownMenu = ({ 
  isOpen, 
  onClose, 
  onUpload, 
  position 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
  position: { top: number; left: number };
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closure
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position.top || !position.left) return null;

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpload();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[99999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        transform: 'translateY(0)'
      }}
    >
      <button
        onClick={handleUploadClick}
        className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-left"
      >
        <Upload className="w-4 h-4" />
        Upload Audio File
      </button>
    </div>
  );
};

export default function SpeakerSetupPage() {
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([]);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());
  const [uploadingSpeakers, setUploadingSpeakers] = useState<Set<string>>(new Set());
  const [recordedSpeakers, setRecordedSpeakers] = useState<Set<string>>(new Set());
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const [menuPositions, setMenuPositions] = useState<Record<string, { top: number; left: number }>>({});
  const [recordingSpeakers, setRecordingSpeakers] = useState<Set<string>>(new Set());
  const [currentPromptIndex, setCurrentPromptIndex] = useState<Record<string, number>>({});
  const [successSpeakers, setSuccessSpeakers] = useState<Set<string>>(new Set());
  const [speakerAnalysers, setSpeakerAnalysers] = useState<Record<string, AnalyserNode | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    loadSpeakers();
  }, []);

  // Cleanup file inputs on unmount
  useEffect(() => {
    return () => {
      Object.values(fileInputRefs.current).forEach(input => {
        if (input && document.body.contains(input)) {
          document.body.removeChild(input);
        }
      });
    };
  }, []);

  const loadSpeakers = async () => {
    try {
      // Prepopulate demo speakers with correct portraits when demo mode is enabled
      const urlDemo = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') === '1' : false;
      if (getDemoMode() || urlDemo) {
        console.log('[demo] Speaker setup: demo mode enabled');
        const sarahOptions = [Rand1, Rand2, Rand3, Rand4];
        const sarahPick = sarahOptions[Math.floor(Math.random() * sarahOptions.length)];
        const portraitByName: Record<string, string> = {
          Ivan: IvanPortrait,
          Shir: ShirPortrait,
          Sami: SamiPortrait,
          Sarah: sarahPick,
        };
        console.log('[demo] portraitByName', portraitByName);
        const demo: SpeakerConfig[] = demoSpeakers.map((s) => ({
          id: s.name,
          name: s.name,
          metadata: {
            profilePhoto: portraitByName[s.name] || s.metadata.profilePhoto,
            created_at: new Date().toISOString(), // mark as recorded
          },
        })) as unknown as SpeakerConfig[];
        console.log('[demo] speakers to set', demo);

        setSpeakers(demo);
        setRecordedSpeakers(new Set(demo.map((s) => s.name)));
        setExpandedSpeakers(new Set());
        return;
      }

      const speakersData = await apiService.getSpeakers();
      // Assign unique profile photos to speakers that don't have them
      const usedPhotos = new Set<string>();
      const speakersWithPhotos = speakersData.map(speaker => {
        if (!speaker.metadata?.profilePhoto) {
          const newPhoto = getUniqueProfilePhoto(usedPhotos);
          usedPhotos.add(newPhoto);
          return {
            ...speaker,
            metadata: {
              ...speaker.metadata,
              profilePhoto: newPhoto
            }
          };
        } else {
          usedPhotos.add(speaker.metadata.profilePhoto);
          return speaker;
        }
      });
      setSpeakers(speakersWithPhotos);
      
      // Set recorded speakers based on metadata
      const recordedNames = new Set(
        speakersWithPhotos
          .filter(s => s.metadata?.created_at)
          .map(s => s.name)
      );
      setRecordedSpeakers(recordedNames);
      
      // Set expanded state: false for registered speakers, true for local ones
      setExpandedSpeakers(new Set());
    } catch (error) {
      console.error('Failed to load speakers:', error);
      toast.error('Failed to load speakers');
    }
  };

  const handleCreateSpeaker = async () => {
    if (!newSpeakerName.trim()) {
      toast.error('Please enter a speaker name');
      return;
    }

    setIsLoading(true);
    try {
      // Add a local placeholder card; persistence happens on first sample upload
      const usedPhotos = new Set(speakers.map(s => s.metadata?.profilePhoto).filter(Boolean));
      const newSpeaker = { 
        id: newSpeakerName.trim(), 
        name: newSpeakerName.trim(),
        metadata: {
          profilePhoto: getUniqueProfilePhoto(usedPhotos)
        }
      } as SpeakerConfig;
      setSpeakers([...speakers, newSpeaker]);
      setExpandedSpeakers(prev => new Set(Array.from(prev).concat(newSpeaker.name)));
      setNewSpeakerName('');
      setShowAddForm(false);
      toast.success(`Speaker "${newSpeaker.name}" added. Upload a sample to register.`);
    } catch (error) {
      console.error('Failed to create speaker:', error);
      toast.error('Failed to create speaker');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpeaker = async (speakerName: string) => {
    try {
      await apiService.deleteSpeaker(speakerName);
      setSpeakers(speakers.filter(s => s.name !== speakerName));
      
      // Clean up refs
      if (fileInputRefs.current[speakerName]) {
        document.body.removeChild(fileInputRefs.current[speakerName]!);
        delete fileInputRefs.current[speakerName];
      }
      delete menuButtonRefs.current[speakerName];
      
      // Clean up state
      setRecordedSpeakers(prev => {
        const next = new Set(prev);
        next.delete(speakerName);
        return next;
      });
      setExpandedSpeakers(prev => {
        const next = new Set(prev);
        next.delete(speakerName);
        return next;
      });
      setOpenMenus(prev => {
        const next = new Set(prev);
        next.delete(speakerName);
        return next;
      });
      
      toast.success('Speaker deleted successfully');
    } catch (error) {
      console.error('Failed to delete speaker:', error);
      toast.error('Failed to delete speaker');
    }
  };

  const handleVoiceSampleAdded = async (speakerName: string, audioBlob: Blob) => {
    setUploadingSpeakers(prev => new Set(Array.from(prev).concat(speakerName)));
    try {
      const saved = await apiService.saveSpeaker(speakerName, audioBlob);
      if (!saved) throw new Error('Upload failed');
      await loadSpeakers();
      
      // Mark speaker as recorded
      setRecordedSpeakers(prev => new Set(Array.from(prev).concat(speakerName)));
      
      // Show success state briefly
      setSuccessSpeakers(prev => new Set(prev).add(speakerName));
      setTimeout(() => {
        setSuccessSpeakers(prev => {
          const next = new Set(prev);
          next.delete(speakerName);
          return next;
        });
      }, 2000);
      
      toast.success('Voice sample added successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add voice sample');
    } finally {
      setUploadingSpeakers(prev => {
        const next = new Set(prev);
        next.delete(speakerName);
        return next;
      });
    }
  };

  const toggleSpeakerExpansion = (speakerName: string) => {
    setExpandedSpeakers(prev => {
      const next = new Set(prev);
      if (next.has(speakerName)) {
        next.delete(speakerName);
      } else {
        next.add(speakerName);
      }
      return next;
    });
  };

  const handleFileUpload = (speakerName: string, file: File) => {
    // Convert file to blob and handle like recorded audio
    const reader = new FileReader();
    reader.onload = () => {
      const audioBlob = new Blob([reader.result as ArrayBuffer], { type: file.type });
      handleVoiceSampleAdded(speakerName, audioBlob);
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleMenu = (speakerName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const buttonRef = menuButtonRefs.current[speakerName];
    if (!buttonRef) return;
    
    const rect = buttonRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position with viewport bounds checking
    let left = rect.left;
    let top = rect.bottom + 5;
    
    // Ensure menu doesn't go off the right edge
    if (left + 160 > viewportWidth) {
      left = viewportWidth - 160 - 10;
    }
    
    // Ensure menu doesn't go off the bottom edge
    if (top + 50 > viewportHeight) {
      top = rect.top - 50 - 5; // Position above the button instead
    }
    
    const position = { top, left };
    
    // Update position first
    setMenuPositions(prev => ({ ...prev, [speakerName]: position }));
    
    setOpenMenus(prev => {
      const next = new Set(prev);
      if (next.has(speakerName)) {
        next.delete(speakerName);
      } else {
        // Close other menus first
        next.clear();
        next.add(speakerName);
      }
      return next;
    });
  };

  const closeMenu = (speakerName: string) => {
    setOpenMenus(prev => {
      const next = new Set(prev);
      next.delete(speakerName);
      return next;
    });
  };

  const handleMenuUpload = (speakerName: string) => {
    // Create file input if it doesn't exist
    if (!fileInputRefs.current[speakerName]) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'audio/*';
      fileInput.style.display = 'none';
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(speakerName, file);
          // Reset the input so the same file can be selected again
          (e.target as HTMLInputElement).value = '';
        }
      };
      document.body.appendChild(fileInput);
      fileInputRefs.current[speakerName] = fileInput;
    }
    fileInputRefs.current[speakerName]?.click();
  };

  const handleStartRecording = (speakerName: string) => {
    setRecordingSpeakers(prev => new Set(prev).add(speakerName));
    setCurrentPromptIndex(prev => ({ ...prev, [speakerName]: 0 }));
    
    // Start prompt rotation
    const scheduleNextPrompt = (index: number) => {
      if (index < PROMPT_TIMINGS.length) {
        setTimeout(() => {
          setCurrentPromptIndex(prev => ({ ...prev, [speakerName]: (prev[speakerName] + 1) % RECORDING_PROMPTS.length }));
          scheduleNextPrompt(index + 1);
        }, PROMPT_TIMINGS[index]);
      }
    };
    scheduleNextPrompt(0);
  };

  const handleStopRecording = (speakerName: string) => {
    setRecordingSpeakers(prev => {
      const next = new Set(prev);
      next.delete(speakerName);
      return next;
    });
    setCurrentPromptIndex(prev => ({ ...prev, [speakerName]: 0 }));
    setSpeakerAnalysers(prev => ({ ...prev, [speakerName]: null }));
    
    // Revert to original collapsed state (same as before clicking edit)
    setExpandedSpeakers(prev => {
      const next = new Set(prev);
      next.delete(speakerName);
      return next;
    });
  };

  const handleAnalyserReady = (speakerName: string, analyser: AnalyserNode | null) => {
    setSpeakerAnalysers(prev => ({ ...prev, [speakerName]: analyser }));
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Speaker Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add voice profiles for meeting participants to enable speaker identification.
        </p>
        
      </div>

      {/* Add New Speaker */}
      {showAddForm ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Add New Speaker
            </h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Enter speaker name..."
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSpeaker()}
              className="flex-1 border-gray-300 dark:border-gray-600 focus:border-gray-400 focus:ring-0 bg-white dark:bg-gray-700"
            />
            <Button 
              onClick={handleCreateSpeaker}
              disabled={isLoading || !newSpeakerName.trim()}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 border-0"
            >
              {isLoading ? 'Adding...' : 'Add Speaker'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Speaker
          </button>
        </div>
      )}

      {/* Speakers List */}
      {speakers.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center bg-white dark:bg-gray-800">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No speakers added yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add speakers and their voice samples to identify who&apos;s talking in your meetings.
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Speaker
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {speakers.map((speaker) => {
            const hasRecording = recordedSpeakers.has(speaker.name);
            const isExpanded = expandedSpeakers.has(speaker.name) || !hasRecording;
            const isMenuOpen = openMenus.has(speaker.name);
            
            return (
              <div
                key={speaker.name}
                className="relative border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                {hasRecording && !isExpanded ? (
                  // Collapsed view - compact layout
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={speaker.metadata?.profilePhoto || '/Notion_AI_Face.png'}
                          alt={speaker.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Notion_AI_Face.png';
                          }}
                        />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {speaker.name}
                          </h3>
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Voice sample recorded
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSpeakerExpansion(speaker.name)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpeaker(speaker.name)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Expanded view - same height as collapsed, only expands when recording
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={speaker.metadata?.profilePhoto || '/Notion_AI_Face.png'}
                          alt={speaker.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Notion_AI_Face.png';
                          }}
                        />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {speaker.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {speaker.metadata?.created_at ? 'Registered' : 'Not registered'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!recordingSpeakers.has(speaker.name) ? (
                          <>
                            <button
                              onClick={() => handleStartRecording(speaker.name)}
                              className="h-[33px] px-3 bg-[#2883E3] text-white text-sm font-semibold rounded-full border-none cursor-pointer flex items-center gap-2 transition-all duration-200 hover:bg-[#2272CC]"
                              style={{ fontFamily: 'Inter, sans-serif' }}
                            >
                              <Mic size={14} />
                              Record
                            </button>
                            <div className="relative">
                              <button
                                ref={(el) => { menuButtonRefs.current[speaker.name] = el; }}
                                onClick={(e) => toggleMenu(speaker.name, e)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isMenuOpen 
                                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              <DropdownMenu
                                isOpen={isMenuOpen}
                                onClose={() => closeMenu(speaker.name)}
                                onUpload={() => handleMenuUpload(speaker.name)}
                                position={menuPositions[speaker.name] || { top: 0, left: 0 }}
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteSpeaker(speaker.name)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStopRecording(speaker.name)}
                            className="h-[33px] px-3 bg-[#FEE2E2] text-[#EF4444] text-sm font-semibold rounded-full border-none cursor-pointer flex items-center gap-2 transition-all duration-200 hover:bg-[#FECACA]"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            <div className="w-3 h-3 bg-[#EF4444] rounded-sm"></div>
                            Stop
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Only show recording interface when actually recording */}
                    {recordingSpeakers.has(speaker.name) && (
                      <div className="mt-4 space-y-4">
                        {/* Audio visualization centered */}
                        <div className="flex justify-center">
                          <AudioVisualization 
                            isActive={true} 
                            analyser={speakerAnalysers[speaker.name]} 
                          />
                        </div>

                        {/* Prompt text - smaller, no animation */}
                        <div className="text-center">
                          <p className="text-lg text-gray-700 dark:text-gray-300">
                            "{RECORDING_PROMPTS[currentPromptIndex[speaker.name] || 0]}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Success state - only show when not recording */}
                    {successSpeakers.has(speaker.name) && !recordingSpeakers.has(speaker.name) && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" />
                          Voice sample recorded
                        </p>
                      </div>
                    )}

                    <AudioRecorder
                      onRecordingComplete={(audioBlob) => handleVoiceSampleAdded(speaker.name, audioBlob)}
                      maxDuration={60}
                      speakerName={speaker.name}
                      isRecording={recordingSpeakers.has(speaker.name)}
                      onStartRecording={() => handleStartRecording(speaker.name)}
                      onStopRecording={() => handleStopRecording(speaker.name)}
                      onAnalyserReady={(analyser) => handleAnalyserReady(speaker.name, analyser)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
    </div>
  );
}