// API service layer for connecting to FastAPI backend

export interface SpeakerConfig {
  id: string;
  name: string;
  voice_sample?: File;
  sample_type?: string;
  metadata?: Record<string, any>;
}

export interface MeetingData {
  id: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  speakers: SpeakerConfig[];
  transcription?: {
    segments: Array<{
      start: number;
      end: number;
      speaker: string;
      text: string;
    }>;
  };
  summary?: string;
  action_items?: any[];
  audio_file?: File;
  duration?: number;
  participants?: string[];
}

export interface ProcessMeetingRequest {
  audio: File;
  generate_insights?: boolean;
  generate_all_action_views?: boolean;
}

export interface ProcessMeetingResponse {
  success: boolean;
  meeting_id: string;
  transcription: {
    segments: Array<{
      start: number;
      end: number;
      speaker: string;
      text: string;
    }>;
  };
  speakers?: Array<{ name: string; matched: boolean }>;
  summary: string;
  action_items: any[];
  error?: string;
}

class APIService {
  private baseURL: string;

  constructor() {
    // Use environment variable with fallback
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  async processMeeting(request: ProcessMeetingRequest): Promise<ProcessMeetingResponse> {
    const formData = new FormData();
    
    // Backend expects 'meeting_audio' not 'audio'
    // Ensure we have a File with proper filename
    const audioFile = request.audio instanceof File 
      ? request.audio 
      : new File([request.audio], 'recording.webm', { type: 'audio/webm' });
    formData.append('meeting_audio', audioFile, audioFile.name);
    
    
    // Add options
    formData.append('generate_insights', String(request.generate_insights ?? true));
    formData.append('generate_all_action_views', String(request.generate_all_action_views ?? false));

    try {
      const response = await fetch(`${this.baseURL}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If can't parse error, use status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Backend returns different structure, adapt it
      return {
        success: true,
        meeting_id: data.meeting_id || Date.now().toString(),
        transcription: data.transcription || { segments: [] },
        speakers: data.speakers || [],
        summary: data.summary || '',
        action_items: data.action_items_by_speaker || data.action_items || [],
      };
    } catch (error) {
      console.error('Error processing meeting:', error);
      return {
        success: false,
        meeting_id: '',
        transcription: { segments: [] },
        speakers: [],
        summary: '',
        action_items: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getMeetings(): Promise<MeetingData[]> {
    // For now, return stored meetings from localStorage
    // In production, this would call your backend API
    const stored = localStorage.getItem('meetings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  async getMeeting(id: string): Promise<MeetingData | null> {
    const meetings = await this.getMeetings();
    return meetings.find(m => m.id === id) || null;
  }

  async saveMeeting(meeting: MeetingData): Promise<void> {
    const meetings = await this.getMeetings();
    const existingIndex = meetings.findIndex(m => m.id === meeting.id);
    
    if (existingIndex >= 0) {
      meetings[existingIndex] = meeting;
    } else {
      meetings.unshift(meeting);
    }
    
    localStorage.setItem('meetings', JSON.stringify(meetings));
  }

  async deleteMeeting(id: string): Promise<void> {
    const meetings = await this.getMeetings();
    const filtered = meetings.filter(m => m.id !== id);
    localStorage.setItem('meetings', JSON.stringify(filtered));
  }

  async getSpeakers(): Promise<SpeakerConfig[]> {
    const res = await fetch(`${this.baseURL}/speakers`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    const speakers = (data?.speakers || []) as Array<{ id: string; name: string; metadata?: Record<string, any> }>;
    return speakers.map(s => ({ id: s.id, name: s.name, metadata: s.metadata }));
  }

  async saveSpeaker(name: string, voiceSample: File | Blob): Promise<SpeakerConfig | null> {
    const form = new FormData();
    form.append('name', name);
    form.append('voice_sample', voiceSample);
    const res = await fetch(`${this.baseURL}/speakers`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data.id || data.name, name: data.name, metadata: data.metadata };
  }

  async deleteSpeaker(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseURL}/speakers/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to delete speaker ${name}: ${res.status} ${errorText}`);
      }
      return res.ok;
    } catch (error) {
      console.error(`Error deleting speaker ${name}:`, error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new APIService();
