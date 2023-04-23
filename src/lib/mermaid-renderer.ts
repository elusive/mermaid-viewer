import DOMPurify from 'dompurify'
import render from './mermaid-initializer'
import {ALLOWED_TAGS} from '../render/constants'
import {assertSVGElement, invariant} from '../render/utils'

const reSanitize = (content: string) =>
    DOMPurify.sanitize(content, {
        USE_PROFILES: {
            svg: true
        },
        RETURN_DOM_FRAGMENT: true,
        ADD_TAGS: ALLOWED_TAGS,
        ADD_ATTR: ['transform-origin']
    });

type RendererConfig = {
    data: string
    el: HTMLElement
    width: number
};

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
        const MIN_HEIGHT = 180;
        let sanitized, sanitizedSVG : HTMLElement;
        await render('diagram', this.data, (svgCode:string) => {
            let mermaidNode = document.createElement('div');
            mermaidNode.classList.add('mermaid');
            sanitized = reSanitize(svgCode);
            sanitizedSVG = sanitized.querySelector('svg');
            invariant(assertSVGElement(sanitizedSVG));
            mermaidNode.appendChild(sanitized);
            this.el.replaceChildren(mermaidNode);
        });

        const elBBox = this.el.getBoundingClientRect();
        const diagramHeight = elBBox.height + elBBox.x + elBBox.y
        const svgViewBoxParts = sanitizedSVG.getAttribute('viewBox')?.split(' ') || []
        const [, , svgViewBoxRawWidth, svgViewBoxRawHeight] = svgViewBoxParts
        if (!sanitizedSVG.hasAttribute('height')) {
          sanitizedSVG.setAttribute('height', svgViewBoxRawHeight)
        }
        sanitizedSVG.setAttribute('preserveAspectRatio', 'xMinYMin')

        const svgWidth = Number(svgViewBoxRawWidth)

        if (svgWidth && this.width < svgWidth) {
          const ratio = this.width / svgWidth
          return Math.max(diagramHeight * ratio, MIN_HEIGHT)
        }

        return Math.max(diagramHeight, MIN_HEIGHT)
    }
}

export default MermaidRenderer

