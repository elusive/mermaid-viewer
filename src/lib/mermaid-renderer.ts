import DOMPurify from 'dompurify'
import render from './mermaid-initializer'
import {ALLOWED_TAGS} from './constants'
import {assertSVGElement, invariant} from '../render/utils'

const reSanitize = (content: string) =>
  DOMPurify.sanitize(content, {
    USE_PROFILES: {
      svg: true
    },
    RETURN_DOM_FRAGMENT: true,
    ADD_TAGS: ALLOWED_TAGS,
    ADD_ATTR: ['transform-origin']
  })

type RendererConfig = {
  data: string
  el: HTMLElement
  width: number
}

class MermaidRenderer {
  data: string
  el: HTMLElement
  width: number

  constructor({data = '', el, width}: RendererConfig) {
    this.data = data
    this.el = el
    this.width = width
  }

  async render(){
      const insertRenderedSvg = (svgCode) => {
          const mermaidNode = document.createElement('div');
          mermaidNode.classList.add('mermaid');
          const sanitized = reSanitize(svgCode);
          mermaidNode.appendChild(sanitized);
          this.el.replaceChildren(mermaidNode);
      }

      const MIN_HEIGHT = 180;
      let graph = await render('diagram', this.data, insertRenderedSvg);
      console.log(graph);
  }


  async render2() {
    // We must set a minimum height to allow space for the view/pan controls
    const MIN_HEIGHT = 180
    const {svg} = await render('diagram', this.data)
    const sanitized = reSanitize(svg)
    // Many types of charts are generated with ridiculously huge margins.
    // This helps to mitigate that.
    const sanitizedSVG = sanitized.querySelector('svg')
    invariant(assertSVGElement(sanitizedSVG))

    // Manually set the svg height attribute based on the svg viewbox
    // See https://github.com/mermaid-js/mermaid/issues/3659
    const svgViewBoxParts = sanitizedSVG.getAttribute('viewBox')?.split(' ') || []
    const [, , svgViewBoxRawWidth, svgViewBoxRawHeight] = svgViewBoxParts
    if (!sanitizedSVG.hasAttribute('height')) {
      sanitizedSVG.setAttribute('height', svgViewBoxRawHeight)
    }

    sanitizedSVG.setAttribute('preserveAspectRatio', 'xMinYMin')

    const mermaidNode = document.createElement('div')
    mermaidNode.classList.add('mermaid')
    mermaidNode.appendChild(sanitized)

    this.el.replaceChildren(mermaidNode)

    const elBBox = this.el.getBoundingClientRect()
    // Make sure we get the padding / margin to avoid weird scroll bar
    // display in the dotcom iframe
    const diagramHeight = elBBox.height + elBBox.x + elBBox.y

    // Currently mermaid.js will not properly scale graph SVGs. See
    // https://github.com/mermaid-js/mermaid/issues/2657 and many similar
    // issues. The root cause is that mermaid calculates svg height/width
    // before overriding width to 100%. When rendered onto a narrower window
    // than max width, width will scale down but height will remain at the
    // original calculated value. This leaves massive top/bottom margins.
    //
    // To compensate, we take the width of the window
    // in dotcom, calculate how much the svg width will have to scale down, and
    // scale down the svg height by the same ratio.
    const svgWidth = Number(svgViewBoxRawWidth)

    if (svgWidth && this.width < svgWidth) {
      const ratio = this.width / svgWidth
      return Math.max(diagramHeight * ratio, MIN_HEIGHT)
    }

    return Math.max(diagramHeight, MIN_HEIGHT)
  }
}

export default MermaidRenderer

