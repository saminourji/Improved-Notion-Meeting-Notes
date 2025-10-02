export type TextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'link'; href: string };

export interface TextSpan {
  text: string;
  marks?: TextMark[];
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | ListItemBlock
  | TodoBlock
  | QuoteBlock
  | CodeBlock
  | ThematicBreakBlock;

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  children: TextSpan[];
}

export interface ParagraphBlock {
  type: 'paragraph';
  children: TextSpan[];
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  children: ListItemBlock[];
}

export interface ListItemBlock {
  type: 'listItem';
  children: Array<ParagraphBlock | ListBlock>;
}

export interface TodoBlock {
  type: 'todo';
  checked: boolean;
  children: TextSpan[];
}

export interface QuoteBlock {
  type: 'quote';
  children: Block[];
}

export interface CodeBlock {
  type: 'code';
  language?: string;
  text: string;
}

export interface ThematicBreakBlock {
  type: 'thematicBreak';
}


