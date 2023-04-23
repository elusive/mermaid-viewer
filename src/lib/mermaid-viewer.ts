import debounce from 'lodash.debounce'
import {assertHTMLElement, invariant, getGitHubDocsHostname} from '../render/utils'
import type MermaidRenderer from './mermaid-renderer'
import octicons from '@primer/octicons'

export type DiagramInfo = {
    code: string,
    width?: number
};

export const RENDER_EVENT = 'RENDER_EVENT';

const DOCS_LINK_PATH =
  '/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams'

export abstract class MermaidViewer<DiagramInfo> {
  el: HTMLElement
  diagram: DiagramInfo

  constructor(info: DiagramInfo, targetEl: string) {
    const node = document.querySelector(targetEl);
    invariant(assertHTMLElement(node), `Mermaid render node does not exist.`);

    this.el = node;
    this.diagram = info;

    let renderer: MermaidRenderer;
    document.addEventListener(RENDER_EVENT, (() => {
      renderer = this.onLoad(this.diagram, renderer);
      this.onAfterLoad(renderer);
    }) as EventListener);

    this.#panAndZoom();
  }

  lazyRender = (renderer: MermaidRenderer) =>
    debounce(async () => {
      const newWidth = this.el.getBoundingClientRect().width

      // The width of the element's container hasn't changed.
      if (renderer.width === newWidth) {
        return
      }

      renderer.width = newWidth
      await renderer.render()
    }, 200);

  protected abstract initialize(): void
  protected abstract onLoad(
    event: string,
    renderer?: MermaidRenderer
  ): MermaidRenderer

  protected async onAfterLoad(renderer: MermaidRenderer) {
    try {
      await renderer.render();
    } catch (error) {
      this.reportError(error as Error);
    }
  }

  protected reportError(error: Error) {
    const url = new URL(DOCS_LINK_PATH, getGitHubDocsHostname());
    const message = `
        ${error.message}
    
        For more information, see ${url.toString()}
      `.trim();
    console.log(message);
  }

  #panAndZoom = () => {
    const ZOOM_MIN = 0.5
    const ZOOM_MAX = 8

    let zoomLevel = 1
    const translate = {x: 0, y: 0}

    const reset = () => {
      zoomLevel = 1
      translate.x = 0
      translate.y = 0
      transformSvg(zoomLevel, translate.x, translate.y)
    }

    const doMove = (vertical: number, horizonal: number) => {
      translate.y += vertical
      translate.x += horizonal
      transformSvg(zoomLevel, translate.x, translate.y)
    }

    const doZoom = (value: number) => {
      zoomLevel += value
      zoomLevel = Math.min(Math.max(ZOOM_MIN, zoomLevel), ZOOM_MAX)
      transformSvg(zoomLevel, translate.x, translate.y)
    }

    const transformSvg = (zoom: number, x: number, y: number) => {
      const svg = this.el.getElementsByTagName('svg')[0]
      svg.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`
    }

    const controlPanel = this.#createElement('div', 'mermaid-viewer-control-panel', '', null)
    const df = document.createDocumentFragment()
    df.appendChild(this.#createElement('button', 'btn zoom-in', octicons['zoom-in'].toSVG(), () => doZoom(0.1)))
    df.appendChild(this.#createElement('button', 'btn zoom-out', octicons['zoom-out'].toSVG(), () => doZoom(-0.1)))
    df.appendChild(this.#createElement('button', 'btn reset', octicons['sync'].toSVG(), reset))
    df.appendChild(this.#createElement('button', 'btn up', octicons['chevron-up'].toSVG(), () => doMove(100, 0)))
    df.appendChild(this.#createElement('button', 'btn down', octicons['chevron-down'].toSVG(), () => doMove(-100, 0)))
    df.appendChild(this.#createElement('button', 'btn left', octicons['chevron-left'].toSVG(), () => doMove(0, 100)))
    df.appendChild(this.#createElement('button', 'btn right', octicons['chevron-right'].toSVG(), () => doMove(0, -100)))

    controlPanel.appendChild(df)
    document.body.appendChild(controlPanel)
  }

  #createElement = (
    tag: string,
    className: string,
    innerHTML: string,
    onClick: ((event: MouseEvent) => void) | null
  ): HTMLElement => {
    const element = document.createElement(tag)
    element.className = className
    element.innerHTML = innerHTML
    element.onclick = onClick
    return element
  }
}

