"use client";

import React from 'react';
import { Block, CodeBlock, HeadingBlock, ListBlock, ListItemBlock, ParagraphBlock, QuoteBlock, TextSpan, TodoBlock } from '@/types/blocks';
import { highlightMentionsSimple } from '@/lib/markdown/mentions';

interface Props {
  blocks: Block[];
}

export const SummaryBlocksRenderer: React.FC<Props> = ({ blocks }) => {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i}>{renderBlock(b)}</div>
      ))}
    </div>
  );
};

function renderBlock(block: Block): React.ReactNode {
  switch (block.type) {
    case 'heading':
      return renderHeading(block as HeadingBlock);
    case 'paragraph':
      return <p className="text-sm text-gray-900 dark:text-gray-100">{renderSpans((block as ParagraphBlock).children)}</p>;
    case 'list':
      return renderList(block as ListBlock);
    case 'listItem':
      return renderListItem(block as ListItemBlock);
    case 'todo':
      return renderTodo(block as TodoBlock);
    case 'quote':
      return renderQuote(block as QuoteBlock);
    case 'code':
      return renderCode(block as CodeBlock);
    case 'thematicBreak':
      return <hr className="border-gray-200 dark:border-gray-700 my-3" />;
    default:
      return null;
  }
}

function renderHeading(h: HeadingBlock) {
  const classBy = {
    1: 'text-2xl font-bold mb-2',
    2: 'text-xl font-semibold mb-2',
    3: 'text-lg font-medium mb-2',
  } as const;
  return <div className={classBy[h.level]}>{renderSpans(h.children)}</div>;
}

function renderList(list: ListBlock) {
  const Cmp: any = list.ordered ? 'ol' : 'ul';
  const cls = list.ordered ? 'list-decimal ml-6 space-y-1' : 'list-disc ml-6 space-y-1';
  return (
    <Cmp className={cls}>
      {list.children.map((li, idx) => {
        // If this is a TodoBlock, render it directly without wrapping in <li>
        if (li.type === 'todo') {
          return <div key={idx}>{renderTodo(li as TodoBlock)}</div>;
        }
        // Otherwise, wrap in <li> for regular list items
        return <li key={idx}>{renderListItem(li as ListItemBlock)}</li>;
      })}
    </Cmp>
  );
}

function renderListItem(li: ListItemBlock) {
  return (
    <div className="space-y-1">
      {li.children.map((child, i) => (
        <div key={i}>{renderBlock(child)}</div>
      ))}
    </div>
  );
}

function renderTodo(todo: TodoBlock) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <input type="checkbox" readOnly checked={todo.checked} className="mt-0.5 mr-2" />
      <div className="text-sm text-gray-900 dark:text-gray-100">{renderSpans(todo.children)}</div>
    </div>
  );
}

function renderQuote(q: QuoteBlock) {
  return (
    <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 text-gray-700 dark:text-gray-300">
      {q.children.map((b, i) => (
        <div key={i}>{renderBlock(b)}</div>
      ))}
    </blockquote>
  );
}

function renderCode(c: CodeBlock) {
  return (
    <pre className="bg-gray-100 dark:bg-gray-800 text-xs p-3 rounded overflow-auto">
      <code>{c.text}</code>
    </pre>
  );
}

function renderSpans(spans: TextSpan[]) {
  return spans.map((s, i) => <Span key={i} span={s} />);
}

function Span({ span }: { span: TextSpan }) {
  let content: React.ReactNode = span.text;
  const marks = span.marks || [];
  
  // Check if this is inside code - don't highlight mentions in code
  const isInCode = marks.some(m => m.type === 'code');
  
  // If not in code, highlight mentions
  if (!isInCode) {
    content = highlightMentionsSimple(span.text);
  }
  
  for (const m of marks) {
    if (m.type === 'bold') content = <strong>{content}</strong>;
    else if (m.type === 'italic') content = <em>{content}</em>;
    else if (m.type === 'code') content = <code className="bg-gray-100 px-1 rounded">{content}</code>;
    else if (m.type === 'link') content = <a href={m.href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{content}</a>;
  }
  return <>{content}</>;
}
