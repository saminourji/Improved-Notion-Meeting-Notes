import React, { useState, useEffect, useRef } from 'react'
import { Mic, Square, Play, Pause } from 'lucide-react'
import { useRecording } from '../../context/AppContext'

interface AudioRecorderProps {
  type: 'voice_sample' | 'meeting'
  targetSpeakerId?: string
  maxDuration: number // in seconds
  onRecordingComplete: (audioBlob: Blob) => void
  isActive: boolean
}

type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'completed' | 'error'

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  type,
  targetSpeakerId,
  maxDuration,
  onRecordingComplete,
  isActive
}) => {
  const { startRecording, stopRecording } = useRecording()
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            handleStopRecording()
          }
          return newDuration
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [recordingState, maxDuration])

  const cleanup = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const updateAudioLevel = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserRef.current.getByteFrequencyData(dataArray)

      // Calculate average volume
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength
      setAudioLevel(average / 255) // Normalize to 0-1

      if (recordingState === 'recording') {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
    }
  }

  const handleStartRecording = async () => {
    setRecordingState('requesting_permission')
    setError(null)
    setDuration(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })

      // Set up audio analysis
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(audioBlob)
        setRecordingState('completed')

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        cleanup()
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setRecordingState('recording')
      startRecording(type, targetSpeakerId)
      updateAudioLevel()

    } catch (err) {
      console.error('Error starting recording:', err)
      let errorMessage = 'Failed to start recording'

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.'
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.'
        }
      }

      setError(errorMessage)
      setRecordingState('error')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      stopRecording(new Blob()) // We'll get the actual blob in onstop
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getButtonText = () => {
    switch (recordingState) {
      case 'requesting_permission':
        return 'Requesting Access...'
      case 'recording':
        return type === 'meeting' ? 'Stop Meeting' : 'Stop Recording'
      case 'completed':
        return 'Record Again'
      case 'error':
        return 'Try Again'
      default:
        return type === 'meeting' ? 'Start Meeting' : 'Record Voice Sample'
    }
  }

  const getButtonIcon = () => {
    switch (recordingState) {
      case 'recording':
        return <Square className="h-4 w-4" />
      case 'requesting_permission':
        return <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      default:
        return <Mic className="h-4 w-4" />
    }
  }

  const isRecording = recordingState === 'recording'
  const canRecord = !isActive || (isActive && recordingState === 'idle')

  return (
    <div className="space-y-3">
      {/* Recording Button */}
      <button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        disabled={!canRecord && recordingState !== 'recording'}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : recordingState === 'completed'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'btn-primary'
        }`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {/* Duration & Audio Level Display */}
      {(isRecording || recordingState === 'completed') && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="caption-text">
              {formatDuration(duration)} / {formatDuration(maxDuration)}
            </span>
            {isRecording && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 text-xs">REC</span>
              </div>
            )}
          </div>

          {/* Audio Level Indicator */}
          {isRecording && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Level:</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Recording Tips */}
      {type === 'voice_sample' && recordingState === 'idle' && (
        <div className="text-xs text-gray-500">
          Record 10-60 seconds of clear speech for best results
        </div>
      )}
    </div>
  )
}

export default AudioRecorder