"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileAudio,
  X,
  Users,
  Settings,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiService, SpeakerConfig, MeetingData } from "@/lib/api";
import { useDropzone } from "react-dropzone";

export default function MeetingUploadPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [selectedSpeakers, setSelectedSpeakers] = useState<SpeakerConfig[]>([]);
  const [availableSpeakers, setAvailableSpeakers] = useState<SpeakerConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [progress, setProgress] = useState(0);

  // Load speakers on component mount
  useEffect(() => {
    loadSpeakers();
  }, []);

  const loadSpeakers = async () => {
    try {
      const speakers = await apiService.getSpeakers();
      setAvailableSpeakers(speakers.filter(s => s.voice_sample)); // Only speakers with samples
    } catch (error) {
      console.error('Error loading speakers:', error);
      toast.error('Failed to load speakers');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast.error('Please upload a valid audio file (MP3, WAV, M4A, WebM)');
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setAudioFile(file);
      if (!meetingTitle) {
        setMeetingTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
      toast.success('Audio file uploaded successfully!');
    }
  }, [meetingTitle]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm', '.ogg']
    },
    multiple: false,
  });

  const handleRemoveFile = () => {
    setAudioFile(null);
    toast.success('Audio file removed');
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

  const simulateProgress = () => {
    const steps = [
      { step: "Uploading audio file...", duration: 1000 },
      { step: "Preprocessing audio...", duration: 2000 },
      { step: "Performing speaker diarization...", duration: 3000 },
      { step: "Transcribing speech...", duration: 4000 },
      { step: "Identifying speakers...", duration: 2000 },
      { step: "Generating summary...", duration: 2000 },
      { step: "Extracting action items...", duration: 1500 },
      { step: "Finalizing results...", duration: 1000 },
    ];

    let currentProgress = 0;
    let stepIndex = 0;

    const progressInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProcessingStep(steps[stepIndex].step);
        const stepProgress = 100 / steps.length;
        currentProgress += stepProgress;
        setProgress(Math.min(currentProgress, 95));
        stepIndex++;
      } else {
        clearInterval(progressInterval);
        setProgress(100);
        setProcessingStep("Processing complete!");
      }
    }, 2000);

    return progressInterval;
  };

  const handleProcessMeeting = async () => {
    if (!audioFile) {
      toast.error('Please upload an audio file');
      return;
    }

    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStep("Starting processing...");

    // Start progress simulation
    const progressInterval = simulateProgress();

    try {
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

      clearInterval(progressInterval);
      setProgress(100);
      setProcessingStep("Processing complete!");

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
          duration: Math.round(audioFile.size / (1024 * 16)), // Rough estimate
          participants: selectedSpeakers.map(s => s.name),
        };

        // Save meeting
        await apiService.saveMeeting(meetingData);

        toast.success('Meeting processed successfully!');
        
        // Redirect to meeting view
        setTimeout(() => {
          router.push(`/meetings/${result.meeting_id}`);
        }, 1000);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error processing meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Processing failed: ${errorMessage}`);
      setProcessingStep("Processing failed");
      setProgress(0);
    } finally {
      // Keep processing state for a bit to show completion
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (file: File) => {
    // This is a rough estimate based on file size
    // In a real app, you'd use the HTML5 audio API to get actual duration
    const estimatedSeconds = Math.round(file.size / (1024 * 16)); // Rough estimate
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `~${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Upload Meeting Audio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload an audio file to generate transcripts, summaries, and action items with speaker identification.
          </p>
        </div>

        {isProcessing ? (
          /* Processing View */
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Processing Your Meeting
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This may take a few minutes depending on the audio length...
                  </p>
                </div>

                <div className="mb-6">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(progress)}% complete
                  </p>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {processingStep}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Audio File
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!audioFile ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    {isDragActive ? (
                      <p className="text-blue-600 dark:text-blue-400">Drop the audio file here...</p>
                    ) : (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Drag & drop an audio file here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports MP3, WAV, M4A, WebM (max 100MB)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileAudio className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          {audioFile.name}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {formatFileSize(audioFile.size)} • {formatDuration(audioFile)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-green-700 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meeting Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Title *
                  </label>
                  <Input
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Enter meeting title..."
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
                    placeholder="Add any additional context or agenda items..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Speaker Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Speaker Identification
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableSpeakers.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No speakers configured
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Set up speaker voice profiles to enable speaker identification.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/speakers/setup')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Setup Speakers
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select up to 3 speakers who participated in this meeting:
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {availableSpeakers.map((speaker) => {
                        const isSelected = selectedSpeakers.find(s => s.id === speaker.id);
                        return (
                          <div
                            key={speaker.id}
                            onClick={() => toggleSpeaker(speaker)}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  isSelected ? 'bg-blue-600' : 'bg-gray-300'
                                }`} />
                                <span className="font-medium">{speaker.name}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {speaker.sample_type}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedSpeakers.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Selected {selectedSpeakers.length} speaker{selectedSpeakers.length !== 1 ? 's' : ''}: {' '}
                          {selectedSpeakers.map(s => s.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Process Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/meetings')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessMeeting}
                disabled={!audioFile || !meetingTitle.trim()}
                className="min-w-[150px]"
              >
                <Play className="h-4 w-4 mr-2" />
                Process Meeting
              </Button>
            </div>

            {/* Info Box */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Processing Information
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Processing time depends on audio length (typically 2-5 minutes per hour of audio)</li>
                      <li>• Speaker identification works best with clear audio and configured voice profiles</li>
                      <li>• You can process meetings without speaker selection for anonymous transcription</li>
                      <li>• All processing happens securely and your audio files are not permanently stored</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
