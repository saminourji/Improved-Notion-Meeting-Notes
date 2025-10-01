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
} from "lucide-react";
import { toast } from "sonner";
import { apiService, SpeakerConfig } from "@/lib/api";

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'completed' | 'error';

const AudioRecorder = ({ 
  onRecordingComplete, 
  maxDuration = 60 
}: { 
  onRecordingComplete: (audioBlob: Blob) => void;
  maxDuration?: number;
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

export default function SpeakerSetupPage() {
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([]);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSpeakers();
  }, []);

  const loadSpeakers = async () => {
    try {
      const speakersData = await apiService.getSpeakers();
      setSpeakers(speakersData);
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
      const newSpeaker = {
        id: `speaker-${Date.now()}`,
        name: newSpeakerName.trim(),
        sample_type: 'recorded' as const
      };
      await apiService.saveSpeaker(newSpeaker);
      setSpeakers([...speakers, newSpeaker]);
      setNewSpeakerName('');
      setShowAddForm(false);
      toast.success(`Speaker "${newSpeaker.name}" created successfully`);
    } catch (error) {
      console.error('Failed to create speaker:', error);
      toast.error('Failed to create speaker');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    try {
      await apiService.deleteSpeaker(speakerId);
      setSpeakers(speakers.filter(s => s.id !== speakerId));
      toast.success('Speaker deleted successfully');
    } catch (error) {
      console.error('Failed to delete speaker:', error);
      toast.error('Failed to delete speaker');
    }
  };

  const handleVoiceSampleAdded = (speakerId: string, audioBlob: Blob) => {
    setSpeakers(speakers.map(speaker => 
      speaker.id === speakerId 
        ? { ...speaker, voice_sample: new Blob() }
        : speaker
    ));
    toast.success('Voice sample added successfully');
  };

  const handleFileUpload = (speakerId: string, file: File) => {
    // Convert file to blob and handle like recorded audio
    const reader = new FileReader();
    reader.onload = () => {
      const audioBlob = new Blob([reader.result as ArrayBuffer], { type: file.type });
      handleVoiceSampleAdded(speakerId, audioBlob);
    };
    reader.readAsArrayBuffer(file);
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
          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {speaker.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {speaker.voice_sample ? '1' : '0'} voice sample{speaker.voice_sample ? '' : 's'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSpeaker(speaker.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Record Voice Sample
                  </h4>
                  <AudioRecorder
                    onRecordingComplete={(audioBlob) => handleVoiceSampleAdded(speaker.id, audioBlob)}
                    maxDuration={60}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Upload Audio File
                  </h4>
                  <FileUploadArea
                    onFileUpload={(file) => handleFileUpload(speaker.id, file)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}