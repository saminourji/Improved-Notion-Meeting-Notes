"use client";

import { BlockNoteEditor, PartialBlock, defaultBlockSpecs } from "@blocknote/core";
import { BlockNoteView, useBlockNote, getDefaultReactSlashMenuItems } from "@blocknote/react";
import "@blocknote/core/style.css";
import { useTheme } from "next-themes";
import { MeetingBlockSpec, insertMeetingBlock } from "@/components/blocks";
import { SimpleTestBlockSpec, insertSimpleTestBlock } from "@/components/blocks/simple-test-block";

interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
}

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  const { resolvedTheme } = useTheme();
  // Mock edgestore for standalone version
  const edgestore = {
    publicFiles: {
      upload: async (data: any) => {
        console.log('Upload file:', data.file.name);
        // Return a mock URL for demo purposes
        return { url: 'https://via.placeholder.com/400x200?text=Uploaded+Image' };
      }
    }
  };

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({
        file
    });
    return response.url;
  }

  const editor: any = useBlockNote({
    editable,
    initialContent: initialContent
      ? (JSON.parse(initialContent))
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
    blockSpecs: {
      // Include all default blocks
      ...defaultBlockSpecs,
      // Add our custom blocks
      simpleTest: SimpleTestBlockSpec,
      meetingBlock: MeetingBlockSpec,
    },
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(),
      insertSimpleTestBlock,
      insertMeetingBlock,
    ],
  });
  return (
    <div>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
};

export default Editor;