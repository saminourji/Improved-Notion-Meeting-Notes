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

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'completed' | 'error';

const PROFILE_PHOTOS = [
  '/my-notion-face-portrait.png',
  '/my-notion-face-portrait_1.png',
  '/my-notion-face-portrait_2.png',
  '/my-notion-face-portrait_yair_sha.png',
  '/Notion_AI_Face.png'
];

const RECORDING_PROMPTS = [
  "Please say: 'Hey, this is my voice sample'",
  "Please say: 'I'm setting up my speaker profile'",
  "Please say: 'The quick brown fox jumps over the lazy dog'"
];

// Helper function to get a unique profile photo
const getUniqueProfilePhoto = (usedPhotos: Set<string>): string => {
  const availablePhotos = PROFILE_PHOTOS.filter(photo => !usedPhotos.has(photo));
  if (availablePhotos.length === 0) {
    // If all photos are used, reset and use any photo
    return PROFILE_PHOTOS[Math.floor(Math.random() * PROFILE_PHOTOS.length)];
  }
  return availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
};

const AudioRecorder = ({ 
  onRecordingComplete, 
  maxDuration = 60,
  speakerName
}: { 
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number;
  speakerName: string;
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      cleanup();
    }
  }, [recordingState]);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (duration >= maxDuration && recordingState === 'recording') {
      stopRecording();
      toast.info(`Maximum recording duration (${maxDuration}s) reached`);
    }
  }, [duration, maxDuration, recordingState, stopRecording]);

  const startRecording = async () => {
    setError(null);
    setRecordingState('requesting_permission');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

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

      // Start audio level monitoring
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      setRecordingState('error');
    }
  };

  const monitorAudioLevel = () => {
    if (analyserRef.current && recordingState === 'recording') {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average);
      
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      {/* Recording Prompts */}
      {recordingState === 'idle' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Recording Tips for {speakerName}:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            {RECORDING_PROMPTS.map((prompt, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                {prompt.replace('[name]', speakerName)}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* Record Button */}
        <button
          onClick={recordingState === 'recording' ? stopRecording : startRecording}
          disabled={recordingState === 'requesting_permission'}
          className={`p-3 rounded-full transition-colors ${
            recordingState === 'recording'
              ? 'bg-red-50 border-2 border-red-500 text-red-600 hover:bg-red-100'
              : 'bg-gray-50 border-2 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {recordingState === 'recording' ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Status and Timer */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {recordingState === 'idle' && 'Ready to record'}
              {recordingState === 'requesting_permission' && 'Requesting permission...'}
              {recordingState === 'recording' && 'Recording...'}
              {recordingState === 'completed' && 'Recording completed'}
              {recordingState === 'error' && 'Error'}
            </span>
            {recordingState === 'recording' && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatTime(duration)} / {formatTime(maxDuration)}
              </span>
            )}
          </div>
          
          {/* Audio Level Visualization */}
          {recordingState === 'recording' && (
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${Math.min((audioLevel / 100) * 100, 100)}%` }}
              />
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

  console.log('🎯 DropdownMenu render:', { isOpen, position });
  
  if (!isOpen) {
    console.log('❌ Menu not open, returning null');
    return null;
  }
  
  if (!position.top || !position.left) {
    console.log('❌ Invalid position:', position, 'returning null');
    return null;
  }

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpload();
    onClose();
  };

  console.log('🎨 Rendering dropdown with position:', position);
  
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
      setExpandedSpeakers(prev => new Set([...prev, newSpeaker.name]));
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
    setUploadingSpeakers(prev => new Set([...prev, speakerName]));
    try {
      const saved = await apiService.saveSpeaker(speakerName, audioBlob);
      if (!saved) throw new Error('Upload failed');
      await loadSpeakers();
      
      // Mark speaker as recorded and collapse the card
      setRecordedSpeakers(prev => new Set([...prev, speakerName]));
      setExpandedSpeakers(prev => {
        const next = new Set(prev);
        next.delete(speakerName);
        return next;
      });
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
    console.log('🔍 Toggle menu clicked for:', speakerName);
    
    const buttonRef = menuButtonRefs.current[speakerName];
    if (!buttonRef) {
      console.error('❌ Button ref not found for:', speakerName);
      return;
    }
    
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
    
    console.log('📍 Menu position calculation:');
    console.log('  - Button rect:', rect);
    console.log('  - Viewport:', { width: viewportWidth, height: viewportHeight });
    console.log('  - Final position:', position);
    
    // Update position first
    setMenuPositions(prev => ({ ...prev, [speakerName]: position }));
    
    setOpenMenus(prev => {
      const next = new Set(prev);
      if (next.has(speakerName)) {
        console.log('❌ Closing menu for:', speakerName);
        next.delete(speakerName);
      } else {
        console.log('✅ Opening menu for:', speakerName);
        // Close other menus first
        next.clear();
        next.add(speakerName);
      }
      console.log('📋 Updated openMenus:', Array.from(next));
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
    console.log('📤 handleMenuUpload called for:', speakerName);
    
    // Create file input if it doesn't exist
    if (!fileInputRefs.current[speakerName]) {
      console.log('🆕 Creating new file input for:', speakerName);
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'audio/*';
      fileInput.style.display = 'none';
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        console.log('📁 File selected:', file?.name);
        if (file) {
          handleFileUpload(speakerName, file);
          // Reset the input so the same file can be selected again
          (e.target as HTMLInputElement).value = '';
        }
      };
      document.body.appendChild(fileInput);
      fileInputRefs.current[speakerName] = fileInput;
    }
    console.log('🖱️ Triggering file input click');
    fileInputRefs.current[speakerName]?.click();
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
        
        {/* Debug Info */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
          <p className="text-yellow-800 dark:text-yellow-200">
            <strong>Debug Info:</strong> Open console to see three-dot menu debugging. 
            Current open menus: {Array.from(openMenus).join(', ') || 'None'}
          </p>
          
          {/* Test Dropdown */}
          <div className="mt-2">
            <button
              onClick={() => {
                console.log('🧪 Test button clicked');
                setOpenMenus(new Set(['TEST_MENU']));
                setMenuPositions({ 'TEST_MENU': { top: 200, left: 200 } });
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Test Dropdown (should appear at top-left)
            </button>
          </div>
        </div>
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
                          src={speaker.metadata?.profilePhoto || '/my-notion-face-portrait.png'}
                          alt={speaker.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/my-notion-face-portrait.png';
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
                  // Expanded view - full recording interface
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={speaker.metadata?.profilePhoto || '/my-notion-face-portrait.png'}
                          alt={speaker.name}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/my-notion-face-portrait.png';
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
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          Record Voice Sample
                        </h4>
                        <AudioRecorder
                          onRecordingComplete={(audioBlob) => handleVoiceSampleAdded(speaker.name, audioBlob)}
                          maxDuration={60}
                          speakerName={speaker.name}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Test Dropdown */}
      <DropdownMenu
        isOpen={openMenus.has('TEST_MENU')}
        onClose={() => setOpenMenus(prev => {
          const next = new Set(prev);
          next.delete('TEST_MENU');
          return next;
        })}
        onUpload={() => {
          console.log('🧪 Test upload clicked');
          setOpenMenus(prev => {
            const next = new Set(prev);
            next.delete('TEST_MENU');
            return next;
          });
        }}
        position={menuPositions['TEST_MENU'] || { top: 0, left: 0 }}
      />
    </div>
  );
}