

/**
 * This is set within the github css. However, because we need to manually
 * update the render container's height during pjax nav events, we also need to ensure that
 * every renderable type fires a resize event some height; this is a fallback for types
 * that did not previously report their height. For now, those types are `geojson` and `stl`
 */
export const DEFAULT_CONTAINER_HEIGHT = 500

export const DEFAULT_DOCS_LINK_HOSTNAME = 'https://docs.github.com'

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
