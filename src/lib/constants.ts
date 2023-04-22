
interface DiagramInfo {
    definition: string,
    width?: number
};

export const RENDER_EVENT = 'RENDER_EVENT';

export const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  // foreignObject is necessary for links to work
  'foreignObject',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'h7',
  'h8',
  'hr',
  'i',
  'li',
  'ul',
  'ol',
  'p',
  'pre',
  'span',
  'strike',
  'strong',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr'
]

