import mermaid from 'mermaid'

const theme = document.querySelector('html')?.getAttribute('data-color-mode')

mermaid.initialize({
  startOnLoad: false,
  // stop user configs in the mermaid files from overriding these keys
  secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize'],
  // escape tags and disable click events within the diagram
  securityLevel: 'strict',
  flowchart: {
    diagramPadding: 48
  },
  gantt: {
    useWidth: 1200
  },
  pie: {
    useWidth: 1200
  },
  sequence: {
    diagramMarginY: 40
  },
  theme: theme === 'dark' ? 'dark' : 'default'
})

export default mermaid.render

