import './styles/mermaid.scss'
import {onDocumentReady} from './render/utils'
import {MermaidMarkdownViewer} from './lib/markdown-viewer'


// example values
const DiagramDefinition: string = 'graph TD;\n    Customers-->|browse menu|Pizzas;\n    Pizzas-->|add to cart|Cart;\n    Cart-->|review and edit|Cart;\n    Cart-->|checkout|Orders;\n    Orders-->|Payment| Orders;\n    Orders-->|Confirmation|Customers;\n';

   // `"data":"graph TD;\n    Customers--&gt;|browse menu|Pizzas;\n    Pizzas--&gt;|add to cart|Cart;\n    Cart--&gt;|review and edit|Cart;\n    Cart--&gt;|checkout|Orders;\n    Orders--&gt;|Payment| Orders;\n    Orders--&gt;|Confirmation|Customers;\n"`;
const DiagramWidth: number = 1012;
const DiagramContainer: string = '.mermaid-view';
const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
<h1>Hello Mermaid / Vite!</h1>
<a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
<div class="is-embedded" style="width: 1000px; height: 700px">
  <div class="render-shell js-render-shell">
    <div class="border-wrap mermaid-view">
        <div class="mermaid">
        </div>
    </div>
  </div>
</div>
`;

function init() {
  const viewer = new MermaidMarkdownViewer({ code: DiagramDefinition, width: DiagramWidth }, DiagramContainer);
  viewer.initialize()
}


export {init}

onDocumentReady(init)

