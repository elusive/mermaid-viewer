import {DEFAULT_DOCS_LINK_HOSTNAME} from './constants'

/**
 * Determine if a value is nullish (undefined or null)
 * @param {*} value The value to check
 * @returns boolean
 */
function isDefined<T = unknown>(value?: T): value is NonNullable<T> {
  return value !== null && value !== undefined && typeof value !== 'undefined'
}

function onDocumentReady(initializer: () => void) {
  if (document.readyState === 'complete') {
    initializer()
  } else {
    document.addEventListener('DOMContentLoaded', initializer)
  }
}

function decodeHTML(html: string) {
  // DOMParser won't run javascript and just returns text,
  // so this should be safe.
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.documentElement.textContent ?? ''
}

class InvariantViolationError extends Error {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invariant(condition: any, message?: string): asserts condition {
  if (condition) return

  throw new InvariantViolationError(message ?? 'Invariant violation')
}

export const assertElement = (node: any): node is Element => node instanceof Element

const assertHTMLElement = (node: Element | ParentNode | HTMLElement | null): node is HTMLElement =>
  node instanceof HTMLElement

const assertSVGElement = (node: SVGElement | SVGSVGElement | null): node is SVGElement => node instanceof SVGElement

const getGitHubDocsHostname = () =>
  document.body.getAttribute('data-github-docs-hostname') || DEFAULT_DOCS_LINK_HOSTNAME

export {isDefined, onDocumentReady, decodeHTML, invariant, assertHTMLElement, assertSVGElement, getGitHubDocsHostname}

