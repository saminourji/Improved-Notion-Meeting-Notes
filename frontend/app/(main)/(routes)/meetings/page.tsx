"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mic,
  Upload,
  Users,
  Calendar,
  Clock,
  Search,
  Filter,
  PlayCircle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiService, MeetingData } from "@/lib/api";
import { toast } from "sonner";

export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const loadedMeetings = await apiService.getMeetings();
      setMeetings(loadedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.participants && meeting.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesFilter = filterStatus === "all" || meeting.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalMeetings: meetings.length,
    totalHours: meetings.reduce((acc, m) => acc + (m.duration || 0), 0) / 60,
    avgDuration: meetings.length > 0 
      ? Math.round(meetings.reduce((acc, m) => acc + (m.duration || 0), 0) / meetings.length / 60)
      : 0,
    thisWeek: meetings.filter(m => {
      const meetingDate = new Date(m.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return meetingDate > weekAgo;
    }).length,
  };

  return (
    <div className="h-full px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Meeting Notes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered meeting transcription with speaker identification and smart summaries
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/meetings/new")}>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg mr-4">
                <Mic className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Start Recording</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Record a new meeting</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/meetings/upload")}>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upload Audio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Process existing recording</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/speakers/setup")}>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Setup Speakers</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage voice profiles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Meetings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalMeetings}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgDuration}m</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.thisWeek}</p>
                </div>
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Meetings
          </h2>
          
          {filteredMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No meetings found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                  {searchQuery ? "Try adjusting your search terms" : "Start by recording or uploading your first meeting"}
                </p>
                <Button onClick={() => router.push("/meetings/new")}>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMeetings.map((meeting) => (
              <Card 
                key={meeting.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/meetings/${meeting.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {meeting.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {meeting.status}
                        </Badge>
                      </div>
                      
                        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{meeting.duration ? `${Math.round(meeting.duration / 60)} min` : 'Unknown'}</span>
                          </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{meeting.participants?.length || 0} participants</span>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {meeting.summary || 'No summary available'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {meeting.participants?.slice(0, 3).map((participant, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {participant}
                          </Badge>
                        ))}
                        {(meeting.participants?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(meeting.participants?.length || 0) - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="ml-6">
                      <PlayCircle className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
