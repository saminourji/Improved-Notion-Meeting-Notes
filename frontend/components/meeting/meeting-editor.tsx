"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/mock-edgestore";
import { useState, useEffect } from "react";

interface MeetingTranscript {
  segments: Array<{
    start: number;
    end: number;
    speaker: string;
    text: string;
  }>;
}

interface MeetingEditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  transcript?: MeetingTranscript;
  editable?: boolean;
  showTimestamps?: boolean;
  activeTab?: 'summary' | 'notes' | 'transcript';
}

const MeetingEditor = ({ 
  onChange, 
  initialContent, 
  transcript,
  editable = true,
  showTimestamps = true,
  activeTab = 'summary'
}: MeetingEditorProps) => {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const [transcriptBlocks, setTranscriptBlocks] = useState<any[]>([]);

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({
      file
    });
    return response.url;
  };

  // Convert transcript to BlockNote blocks
  useEffect(() => {
    if (transcript && activeTab === 'transcript') {
      const blocks: any[] = transcript.segments.map((segment, index) => ({
        id: `segment-${index}`,
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: showTimestamps ? `[${formatTime(segment.start)}] ` : "",
            styles: {
              textColor: "gray",
              bold: false,
            },
          },
          {
            type: "text", 
            text: `${segment.speaker}: `,
            styles: {
              bold: true,
              textColor: getSpeakerColor(segment.speaker),
            },
          },
          {
            type: "text",
            text: segment.text,
            styles: {},
          },
        ],
      }));
      setTranscriptBlocks(blocks);
    }
  }, [transcript, activeTab, showTimestamps]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string): string => {
    const colors = ["blue", "green", "purple", "orange", "red"];
    const hash = speaker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitialContent = (): any[] | undefined => {
    if (activeTab === 'transcript' && transcriptBlocks.length > 0) {
      return transcriptBlocks;
    }
    if (initialContent) {
      try {
        return JSON.parse(initialContent);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const editor: BlockNoteEditor = useBlockNote({
    editable: activeTab !== 'transcript' ? editable : false, // Transcript is read-only
    initialContent: getInitialContent(),
    onEditorContentChange: (editor) => {
      if (activeTab !== 'transcript') {
        onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
      }
    },
    uploadFile: handleUpload,
  });

  // Update editor content when tab changes
  useEffect(() => {
    if (activeTab === 'transcript' && transcriptBlocks.length > 0) {
      editor.replaceBlocks(editor.topLevelBlocks, transcriptBlocks);
    } else if (activeTab !== 'transcript' && initialContent) {
      try {
        const content = JSON.parse(initialContent);
        editor.replaceBlocks(editor.topLevelBlocks, content);
      } catch {
        // Handle invalid JSON
      }
    }
  }, [activeTab, transcriptBlocks, initialContent, editor]);

  return (
    <div className="meeting-editor">
      {activeTab === 'transcript' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            📝 This transcript was automatically generated from your meeting audio with speaker identification.
            {showTimestamps && " Click timestamps to jump to that moment in the recording."}
          </p>
        </div>
      )}
      
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        className={`min-h-[400px] ${
          activeTab === 'transcript' 
            ? 'transcript-view' 
            : activeTab === 'summary' 
            ? 'summary-view'
            : 'notes-view'
        }`}
      />

      <style jsx>{`
        .transcript-view .ProseMirror {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          line-height: 1.6;
        }
        
        .transcript-view .ProseMirror p {
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          border-radius: 0.375rem;
          background-color: rgba(0, 0, 0, 0.02);
        }
        
        .transcript-view .ProseMirror p:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .summary-view .ProseMirror {
          font-size: 1.1rem;
          line-height: 1.7;
        }
        
        .notes-view .ProseMirror {
          font-size: 1rem;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default MeetingEditor;
