import {decodeHTML} from '../render/utils'
import MermaidRenderer from './mermaid-renderer'
import {MermaidViewer, DiagramInfo, RENDER_EVENT} from './mermaid-viewer'


class MermaidMarkdownViewer extends MermaidViewer<DiagramInfo> {
  initialize() {
    let evt = new Event(RENDER_EVENT);
    if(event) {
        event.initEvent(RENDER_EVENT, true, true);
        document.dispatchEvent(evt);
    }
  }

  onLoad(info: DiagramInfo, renderer?: MermaidRenderer): MermaidRenderer {
    // the data gets HTML escaped when added to the content node, so we
    // have to unescape it here.
    const decoded = decodeHTML(info.code)
    const width = info.width

    if (!(renderer instanceof MermaidRenderer)) {
      renderer = new MermaidRenderer({data: decoded, el: this.el, width})
      window.addEventListener('resize', this.lazyRender(renderer))
    } else {
      renderer.width = width
    }

    return renderer
  }
}

export {MermaidMarkdownViewer}

