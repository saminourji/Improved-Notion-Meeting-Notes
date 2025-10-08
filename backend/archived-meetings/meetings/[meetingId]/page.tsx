"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParticipantBadge } from "@/components/meeting/participant-badge";
import { 
  FileText, 
  Edit, 
  MessageSquare, 
  Clock, 
  Users, 
  Calendar,
  Download,
  Share,
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiService, MeetingData } from "@/lib/api";
import { toast } from "sonner";
import { SettingsIcon } from "@/components/ui/settings-icon";

interface MeetingIdPageProps {
  params: {
    meetingId: string;
  };
}

type TabType = 'summary' | 'notes' | 'transcript';

const MeetingIdPage = ({ params }: MeetingIdPageProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [meeting, setMeeting] = useState<MeetingData | null>(null);

  const MeetingEditor = useMemo(
    () => dynamic(() => import("@/components/meeting/meeting-editor"), { ssr: false }),
    []
  );

  const loadMeeting = useCallback(async () => {
    try {
      const loadedMeeting = await apiService.getMeeting(params.meetingId);
      setMeeting(loadedMeeting);
    } catch (error) {
      console.error('Error loading meeting:', error);
      toast.error('Failed to load meeting');
    } finally {
      setIsLoading(false);
    }
  }, [params.meetingId]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  const tabs = [
    {
      id: 'summary' as TabType,
      name: 'Summary',
      icon: FileText,
      description: 'AI-generated meeting summary'
    },
    {
      id: 'notes' as TabType,
      name: 'Notes',
      icon: Edit,
      description: 'Your personal meeting notes'
    },
    {
      id: 'transcript' as TabType,
      name: 'Transcript',
      icon: MessageSquare,
      description: 'Full conversation with speaker identification'
    }
  ];

  const getTabContent = () => {
    if (!meeting) return '';
    
    switch (activeTab) {
      case 'summary':
        return meeting.summary || '';
      case 'notes':
        return ''; // Notes will be handled by the editor
      case 'transcript':
        return ''; // Transcript is handled differently in MeetingEditor
      default:
        return '';
    }
  };

  const handleContentChange = (content: string) => {
    // Save content changes - implement API call here
    console.log('Content changed:', content);
  };

  if (isLoading) {
    return (
      <div className="pb-40">
        <div className="md:max-w-5xl lg:max-w-6xl mx-auto">
          <div className="space-y-4 pl-8 pt-4">
            <Skeleton className="h-8 w-[60%]" />
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Meeting not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The meeting you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      <div className="md:max-w-5xl lg:max-w-6xl mx-auto">
        {/* Meeting Header */}
        <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {meeting.title}
              </h1>
              
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{meeting.duration ? `${Math.round(meeting.duration / 60)} min` : 'Unknown duration'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{meeting.participants?.length || 0} participants</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {meeting.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {meeting.participants?.map((participant, index) => (
                  <ParticipantBadge key={index} participantName={participant} />
                )) || null}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-6">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-8">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          <MeetingEditor
            onChange={handleContentChange}
            initialContent={getTabContent()}
            transcript={activeTab === 'transcript' ? meeting.transcription : undefined}
            activeTab={activeTab}
            editable={activeTab !== 'transcript'}
            showTimestamps={true}
          />
        </div>
      </div>
    </div>
  );
};

export default MeetingIdPage;
