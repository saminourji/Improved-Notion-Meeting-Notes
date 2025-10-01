"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Square,
  Pause,
  Play,
  Users,
  Settings,
  AlertCircle,
  Clock,
  Volume2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiService, SpeakerConfig, MeetingData } from "@/lib/api";

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'completed' | 'error';

export default function NewMeetingPage() {
  const router = useRouter();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [selectedSpeakers, setSelectedSpeakers] = useState<SpeakerConfig[]>([]);
  const [availableSpeakers, setAvailableSpeakers] = useState<SpeakerConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadSpeakers();
    return () => cleanup();
  }, []);

  // Duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      intervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [recordingState]);

  const loadSpeakers = async () => {
    try {
      const speakers = await apiService.getSpeakers();
      setAvailableSpeakers(speakers.filter(s => s.voice_sample));
    } catch (error) {
      console.error('Error loading speakers:', error);
      toast.error('Failed to load speakers');
    }
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
  };

  const updateAudioLevel = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setAudioLevel(average / 255);

      if (recordingState === 'recording') {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      }
    }
  };

  const handleStartRecording = async () => {
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title before starting');
      return;
    }

    setRecordingState('requesting_permission');
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordingState('completed');
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleProcessRecording(audioBlob);
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState('recording');
      updateAudioLevel();
      toast.success('Recording started!');

    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        }
      }

      setError(errorMessage);
      setRecordingState('error');
      toast.error(errorMessage);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      toast.success('Recording stopped!');
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      toast.success('Recording paused');
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      updateAudioLevel();
      toast.success('Recording resumed');
    }
  };

  const handleProcessRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}.webm`, {
        type: 'audio/webm'
      });

      // Prepare request
      const request = {
        audio: audioFile,
        speaker_names: selectedSpeakers.map(s => s.name).join(','),
        voice_sample_1: selectedSpeakers[0]?.voice_sample as File,
        voice_sample_2: selectedSpeakers[1]?.voice_sample as File,
        voice_sample_3: selectedSpeakers[2]?.voice_sample as File,
        generate_insights: true,
        generate_all_action_views: false,
      };

      // Process meeting
      const result = await apiService.processMeeting(request);

      if (result.success) {
        // Create meeting data
        const meetingData: MeetingData = {
          id: result.meeting_id,
          title: meetingTitle,
          status: 'completed',
          created_at: new Date().toISOString(),
          speakers: selectedSpeakers,
          transcription: result.transcription,
          summary: result.summary,
          action_items: result.action_items,
          audio_file: audioFile,
          duration: duration,
          participants: selectedSpeakers.map(s => s.name),
        };

        // Save meeting
        await apiService.saveMeeting(meetingData);

        toast.success('Meeting processed successfully!');
        
        // Redirect to meeting view
        router.push(`/meetings/${result.meeting_id}`);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSpeaker = (speaker: SpeakerConfig) => {
    setSelectedSpeakers(prev => {
      const isSelected = prev.find(s => s.id === speaker.id);
      if (isSelected) {
        return prev.filter(s => s.id !== speaker.id);
      } else {
        if (prev.length >= 3) {
          toast.error('Maximum 3 speakers can be selected');
          return prev;
        }
        return [...prev, speaker];
      }
    });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingButton = () => {
    switch (recordingState) {
      case 'requesting_permission':
        return (
          <Button disabled className="w-full h-16 text-lg">
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-3" />
            Requesting Access...
          </Button>
        );
      case 'recording':
        return (
          <div className="flex gap-3">
            <Button
              onClick={handlePauseRecording}
              variant="outline"
              className="flex-1 h-16"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
            <Button
              onClick={handleStopRecording}
              className="flex-1 h-16 bg-red-500 hover:bg-red-600 text-white"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          </div>
        );
      case 'paused':
        return (
          <div className="flex gap-3">
            <Button
              onClick={handleResumeRecording}
              className="flex-1 h-16"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button
              onClick={handleStopRecording}
              variant="outline"
              className="flex-1 h-16"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop
            </Button>
          </div>
        );
      case 'completed':
        return (
          <div className="text-center">
            <div className="mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-700 dark:text-green-300">
                Recording Complete!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isProcessing ? 'Processing your meeting...' : 'Processing complete'}
              </p>
            </div>
          </div>
        );
      case 'error':
        return (
          <Button
            onClick={handleStartRecording}
            className="w-full h-16 text-lg"
            disabled={!meetingTitle.trim()}
          >
            <Mic className="h-5 w-5 mr-2" />
            Try Again
          </Button>
        );
      default:
        return (
          <Button
            onClick={handleStartRecording}
            className="w-full h-16 text-lg"
            disabled={!meetingTitle.trim()}
          >
            <Mic className="h-5 w-5 mr-2" />
            Start Recording
          </Button>
        );
    }
  };

  const isRecording = recordingState === 'recording' || recordingState === 'paused';

  return (
    <div className="h-full px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Start New Meeting
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Record a live meeting with real-time transcription and speaker identification.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recording Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Live Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recording Controls */}
                <div className="text-center">
                  {getRecordingButton()}
                  
                  {isRecording && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-center gap-4 text-lg font-mono">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span className="text-2xl font-bold">
                          {formatDuration(duration)}
                        </span>
                        {recordingState === 'recording' && (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-500 text-sm font-medium">LIVE</span>
                          </div>
                        )}
                        {recordingState === 'paused' && (
                          <Badge variant="secondary">PAUSED</Badge>
                        )}
                      </div>
                      
                      {recordingState === 'recording' && (
                        <div className="flex items-center justify-center gap-3">
                          <Volume2 className="h-4 w-4 text-gray-500" />
                          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-100"
                              style={{ width: `${audioLevel * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Meeting Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Title *
                    </label>
                    <Input
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Enter meeting title..."
                      disabled={isRecording}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Notes (Optional)
                    </label>
                    <Textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Add any agenda items or context..."
                      rows={3}
                      disabled={isRecording}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Speaker Selection */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableSpeakers.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      No speakers configured
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/speakers/setup')}
                      disabled={isRecording}
                    >
                      Setup Speakers
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Select meeting participants:
                    </p>
                    <div className="space-y-2">
                      {availableSpeakers.map((speaker) => {
                        const isSelected = selectedSpeakers.find(s => s.id === speaker.id);
                        return (
                          <div
                            key={speaker.id}
                            onClick={() => !isRecording && toggleSpeaker(speaker)}
                            className={`p-2 border rounded-lg transition-colors ${
                              isRecording 
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            } ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-blue-600' : 'bg-gray-300'
                              }`} />
                              <span className="text-sm font-medium">{speaker.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedSpeakers.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          {selectedSpeakers.length} participant{selectedSpeakers.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">
                      Recording Tips
                    </h4>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Use a quiet environment</li>
                      <li>• Speak clearly and at normal volume</li>
                      <li>• You can pause/resume anytime</li>
                      <li>• Processing happens after recording</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Actions */}
        {recordingState === 'idle' && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push('/meetings')}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
