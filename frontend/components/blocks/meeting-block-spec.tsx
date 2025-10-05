"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ReactSlashMenuItem } from "@blocknote/react";
import { MicIcon } from "lucide-react";
import { MeetingBlock } from "./meeting-block";

// Define the Meeting Block data structure
export interface MeetingBlockProps {
  id: string;
  title: string;
  status: "idle" | "recording" | "processing" | "completed" | "error";
  participants: string; // JSON string of Array<{ name: string; matched: boolean }>
  duration: number;
  audioUrl?: string;
  transcript?: string;
  summary?: string;
  actionItems?: string;
  createdAt: string;
  errorMessage?: string;
}

// Create the block specification
export const MeetingBlockSpec = createReactBlockSpec(
  {
    type: "meetingBlock",
    propSchema: {
      id: { default: "" },
      title: { default: "New Meeting" },
      status: { default: "idle" },
      participants: { default: "" },
      duration: { default: 0 },
      audioUrl: { default: "" },
      transcript: { default: "" },
      summary: { default: "" },
      actionItems: { default: "" },
      createdAt: { default: "" },
      errorMessage: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      console.log('📦 BlockNote render called with props:', props);
      return <MeetingBlock {...props} />;
    },
  }
);

// Slash menu item to insert the block
export const insertMeetingBlock: any = {
  name: "Meeting Notes",
  execute: (editor: any) => {
    console.log('🚀 Inserting meeting block...');
    const meetingId = `meeting-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    try {
      editor.insertBlocks(
        [
          {
            type: "meetingBlock" as any,
            props: {
              id: meetingId,
              title: "New Meeting",
              status: "idle",
              participants: JSON.stringify([]),
              duration: 0,
              createdAt: timestamp,
            } as any,
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
      console.log('✅ Meeting block inserted successfully');
    } catch (error) {
      console.error('❌ Error inserting meeting block:', error);
    }
  },
  aliases: ["meeting", "notes", "audio", "record", "transcript"],
  group: "Meeting",
  icon: <MicIcon size={18} />,
  hint: "Insert a meeting notes component with AI transcription",
};
