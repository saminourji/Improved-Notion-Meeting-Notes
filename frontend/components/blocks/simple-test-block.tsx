"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { ReactSlashMenuItem } from "@blocknote/react";

// Extremely simple test block
export const SimpleTestBlockSpec = createReactBlockSpec(
  {
    type: "simpleTest",
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      console.log('🟢 Simple test block rendering');
      return (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f0f0f0', 
          border: '2px solid #333',
          borderRadius: '8px'
        }}>
          <h3>✅ Simple Test Block Works!</h3>
          <p>This is a minimal test block.</p>
        </div>
      );
    },
  }
);

// Slash menu item
export const insertSimpleTestBlock: any = {
  name: "Simple Test",
  execute: (editor: any) => {
    console.log('🟢 Inserting simple test block');
    editor.insertBlocks([{ type: "simpleTest" }], editor.getTextCursorPosition().block, "after");
  },
  aliases: ["test", "simple"],
  group: "Test",
  hint: "Insert a simple test block",
};

