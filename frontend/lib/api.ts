// API service layer for connecting to FastAPI backend

export interface SpeakerConfig {
  id: string;
  name: string;
  sample_type: 'recorded' | 'uploaded';
  voice_sample?: File | Blob;
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
  speaker_names?: string;
  voice_sample_1?: File;
  voice_sample_2?: File;
  voice_sample_3?: File;
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
    formData.append('meeting_audio', request.audio);
    
    // Add speaker names
    if (request.speaker_names) {
      formData.append('speaker_names', request.speaker_names);
    }
    
    // Add voice samples
    if (request.voice_sample_1) formData.append('voice_sample_1', request.voice_sample_1);
    if (request.voice_sample_2) formData.append('voice_sample_2', request.voice_sample_2);
    if (request.voice_sample_3) formData.append('voice_sample_3', request.voice_sample_3);
    
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
        summary: data.summary || '',
        action_items: data.action_items_by_speaker || data.action_items || [],
      };
    } catch (error) {
      console.error('Error processing meeting:', error);
      return {
        success: false,
        meeting_id: '',
        transcription: { segments: [] },
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
    const stored = localStorage.getItem('speakers');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  async saveSpeaker(speaker: SpeakerConfig): Promise<void> {
    const speakers = await this.getSpeakers();
    const existingIndex = speakers.findIndex(s => s.id === speaker.id);
    
    if (existingIndex >= 0) {
      speakers[existingIndex] = speaker;
    } else {
      speakers.push(speaker);
    }
    
    localStorage.setItem('speakers', JSON.stringify(speakers));
  }

  async deleteSpeaker(id: string): Promise<void> {
    const speakers = await this.getSpeakers();
    const filtered = speakers.filter(s => s.id !== id);
    localStorage.setItem('speakers', JSON.stringify(filtered));
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
