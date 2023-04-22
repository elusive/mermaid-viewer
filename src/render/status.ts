import unescape from 'lodash.unescape'
import type {TopoJSON} from 'topojson-specification'
import {MESSAGE_RESPONSE_TYPES, RENDER_FORMATS, STATUS_TYPES} from './constants'
import {isDefined} from './utils'
import LinkNavigator from './link-navigator'

class InvalidProtocolError extends Error {
  constructor() {
    super('The client:// protocol is invalid.')
  }
}

window.Render = window.Render || {}

const isClientUrl = (url: string) => /^client:\/\//i.exec(url)

type StatusOptions = {
  allowLinks?: boolean
  initialMessage?: STATUS_TYPES
}

type RenderStatusMessage = {
  sent: boolean
  status: STATUS_TYPES
  when: number
  payload: Record<string, unknown> | null
}

type RenderableLoaderCallbacks<Data = unknown, E extends Error = Error> = {
  before: (xhr?: XMLHttpRequest, settings?: Record<string, unknown>) => void
  success: (data: Data, response: Response) => void
  error: (error: E, xhr: Response) => void
}

type RenderableLoaderOptions = {
  attempts?: number
  timeout?: number
  json?: boolean
}

type DataResponseTypes = string | ArrayBuffer | TopoJSON | JSON | undefined

const renderableLoaderDefaults = {
  setStatus: true,
  attempts: 3,
  timeout: 30_000,
  json: true
}

const statusOptionDefaults = {
  allowLinks: false,
  initialMessage: STATUS_TYPES.hello
}

/**
 * Responsible for handling communication between the render DOM and it's parent iframe
 *
 * @param format Valid renderable file format @see RENDER_FORMATS
 * @param opts.allowLinks? Should this class allow redirects from link within the render area?
 * @param opts.initial? The initial status message to be communicated
 */
class Status {
  acked = false
  format: RENDER_FORMATS
  githubEnv: string | null
  githubHostname: string | null
  identity: string
  initialStatusTimeout: NodeJS.Timeout | null
  messages: RenderStatusMessage[]

  constructor(format: RENDER_FORMATS, opts: StatusOptions = {}) {
    const options = {...statusOptionDefaults, ...opts}

    this.githubHostname = document.body.getAttribute('data-github-hostname') ?? 'github.localhost'
    this.githubEnv = document.body.getAttribute('data-deploy-env') ?? 'development'
    this.format = format
    this.initialStatusTimeout = null

    if (options.allowLinks) {
      new LinkNavigator({hasParent: this.haveParent()})
    }

    this.identity = window.location.hash.substring(1)

    this.messages = [
      {status: STATUS_TYPES.constructor, payload: null, when: Date.now(), sent: true} // Debugging ctor call timing
    ]

    window.addEventListener('message', this.handleMessage)

    if (this.haveParent()) {
      this.sendInitial(options.initialMessage, 10, 1000)
    }
  }

  /**
   * This function is responsible for communicating the initial status of the renderer back to the parent frame.
   * Necessary as the render JS functionality is embedded in an iframe. This function will attempt to
   * contact its parent frame until it receives a response or exhausts the pool of attempts.
   */
  sendInitial = (initial: STATUS_TYPES, remaining = 10, interval = 1000) => {
    if (this.initialStatusTimeout && (this.acked || remaining < 1)) {
      clearTimeout(this.initialStatusTimeout)
      return
    }

    this.initialStatusTimeout = setTimeout(() => this.sendInitial(initial, remaining - 1, interval), interval)
    window.debug(
      `Sending hello. Will try again ${remaining} more times in ${interval / 1000} second intervals until ack'd`
    )
    return this.set(initial)
  }

  // Fired when content is loaded and ready to be displayed.
  #onSuccess = () => {
    this.set(STATUS_TYPES.loaded)
  }

  // Fires when requested content fails to load.
  #onError = () => {
    this.set(STATUS_TYPES.error)
  }

  #onBeforeSend() {
    return void 0
  }

  //# Raw status access
  // Handles whether or not to post a message to the parent window
  // TODO: Rename? The name set is incredibly generic and doesn't really encapsulate
  // what this method does. It also does two things, adding a message to the message list
  // and posting that message?
  set = (status: STATUS_TYPES, payload = {}) => {
    const sent = this.alreadySentStatus(status)

    if (isDefined(sent) && ![STATUS_TYPES.hello, STATUS_TYPES.resize].includes(status)) {
      const ago = Math.abs(Date.now() - sent.when)
      return window.debug(`Already set status '${status}' ${ago}ms ago`)
    }

    const message = {status, payload, when: Date.now(), sent: false}
    // Don't push duplicate hello messages into our message cache.
    // However, it seems that we do still send duplicate `hello` messages to dotcom.
    if (!sent || status !== STATUS_TYPES.hello) {
      this.messages.push(message)
    }

    if (status === STATUS_TYPES.ready) {
      this.onReady()
    }

    if (!this.requireAck(status)) {
      message.sent = true

      return this.post({
        type: 'render',
        body: status,
        payload
      })
    }
  }

  alreadySentStatus(status: STATUS_TYPES) {
    const found = this.messages.filter(e => e.status === status)
    return found[0]
  }

  async #prepareFetchedData(result: Response, options: RenderableLoaderOptions): Promise<DataResponseTypes> {
    const contentType = result.headers.get('content-type')

    /**
     * using vanilla XMLHTTPRequest / jquery, we were able to force the response
     * header's content-type to a specific value. This was needed for stl files,
     * since they may be a binary file OR ASCII text.
     *
     * We can't force the header with `fetch`, so we need to check for a header that
     * indicates a response with an array buffer data type.
     *
     * This works in all major browsers for CORs requests.
     */
    if (contentType === 'application/octet-stream') {
      return await result.arrayBuffer()
    }

    if (!options.json) {
      return await result.text()
    }

    try {
      return await result.json()
    } catch (error) {
      // Apparently Mobile Safari requires this, though it is unclear why.
      // Google searches didn't yield fruit
      window.debug(`Error while trying to parse initial JSON: ${error}`)
      window.debug('Attempting to parse htmlDecoded JSON')
      try {
        const maybeJson = await result.text()
        return JSON.parse(unescape(maybeJson))
      } catch (e) {
        this.set(STATUS_TYPES.fatal)
      }
    }

    return
  }

  async load(
    url: string,
    opts: RenderableLoaderOptions & Partial<RenderableLoaderCallbacks> = renderableLoaderDefaults
  ) {
    const finalOptions = {...renderableLoaderDefaults, ...opts} as RenderableLoaderOptions & RenderableLoaderCallbacks

    if (isClientUrl(url)) {
      throw new InvalidProtocolError()
    }

    this.set(STATUS_TYPES.loading)

    finalOptions.attempts = finalOptions.attempts ?? this.clientTimeoutAttempts()
    finalOptions.before = finalOptions.before ?? this.#onBeforeSend
    finalOptions.success = finalOptions.success ?? this.#onSuccess
    finalOptions.error = finalOptions.error ?? this.#onError

    finalOptions.before?.()

    const requestController = new AbortController()
    const abortTimeoutId = setTimeout(() => {
      requestController.abort()
    }, finalOptions.timeout)

    const settings = {
      method: 'GET',
      signal: requestController.signal
    }

    try {
      const response = await fetch(url, settings)

      if (response.status < 400) {
        const data = await this.#prepareFetchedData(response, finalOptions)
        this.set(STATUS_TYPES.loaded)
        finalOptions.success(data, response)

        return
      }
    } catch (e) {
      this.set(STATUS_TYPES.error)
      if (requestController.signal.aborted) {
        this.submitGiveup()
      }
    } finally {
      clearTimeout(abortTimeoutId)
    }

    finalOptions.attempts -= 1
    if (finalOptions.attempts > 0) {
      window.debug(`Couldn't load, going to retry up to ${finalOptions.attempts} more times`)
      setTimeout(() => {
        this.load(url, finalOptions)
      }, 1000)
    } else {
      this.set(STATUS_TYPES.error)
      this.submitGiveup()
      finalOptions.error(new Error('Failed to load content.'), new Response(null, {status: 500}))
    }
  }

  post(msg: {identity?: string; type: string; body: STATUS_TYPES; payload?: Record<string, unknown> | null}) {
    msg.identity = msg.identity ?? this.identity

    if (!this.haveParent()) {
      window.debug('WARNING: No window.parent: postMessage:', msg)
      return
    }

    const targetOrigin = '*'

    window.debug('Render Status:', msg)
    window.parent.postMessage(msg, targetOrigin)
  }

  // Called when a status of "ready" is set for the first time
  onReady = () => {
    const localTiming: Partial<Record<STATUS_TYPES, number>> = {}
    for (const message of this.messages) {
      localTiming[message.status] = message.when
    }

    return this.submitTiming('local', localTiming)
  }

  onAck = () => {
    window.debug("Ack'd, sending saved messages")
    this.acked = true
    for (const msg of this.messages) {
      if (msg.sent) {
        continue
      }

      msg.sent = true
      this.post({
        type: 'render',
        body: msg.status,
        payload: msg.payload
      })
    }
  }

  /**
   * Determines whether the render iframe has sent its initial status message to the
   * parent window
   */
  requireAck = (status = '') => {
    return !this.acked && status !== 'hello'
  }

  submitTiming = (origin: string, timing: Record<string, unknown>) => {
    window.debug(`Got ${origin} timing: ${this.format} => ${JSON.stringify(timing)}`)
    const baseRenderUrl = document.body.getAttribute('data-render-url')
    const didQueue = navigator.sendBeacon?.(
      `${baseRenderUrl}/stats/timing/${origin}/${this.format}/`,
      JSON.stringify(timing)
    )

    if (!didQueue) {
      window.debug('Failed to send remote timing info')
    } else {
      window.debug(`Sent ${origin} timing info:`, timing)
    }
  }

  submitGiveup = () => {
    const baseRenderUrl = document.body.getAttribute('data-render-url')

    const didQueue = navigator.sendBeacon?.(`${baseRenderUrl}/stats/${this.format}/gave_up`)

    if (!didQueue) {
      window.debug('Failed to send give up info')
    } else {
      window.debug('Sent give up status info.')
    }
  }

  handleCmd = (cmd: MESSAGE_RESPONSE_TYPES, arg: Record<string, unknown> | boolean) => {
    if (cmd === MESSAGE_RESPONSE_TYPES.branding) {
      document.body.classList.remove('is-embedded')

      return
    }

    const renderableContent = arg as Record<string, unknown>

    switch (cmd) {
      case MESSAGE_RESPONSE_TYPES.ack:
        if (this.requireAck()) {
          this.onAck()
        }

        break
      // this has to match the string in github/github/app/assets/modules/github/behaviors/render-editor.ts
      case MESSAGE_RESPONSE_TYPES.markdown:
        this.trigger(document, MESSAGE_RESPONSE_TYPES.markdown, {
          data: renderableContent.data,
          width: renderableContent.width
        })
        break
      case MESSAGE_RESPONSE_TYPES.containerSize:
        this.trigger(document, MESSAGE_RESPONSE_TYPES.containerSize, {width: renderableContent.width})
        break
      default:
        window.debug(`Invalid command '${cmd}':`, arg)
    }
  }

  handleMessage = (event: MessageEvent) => {
    const wantGitHubOrigin = new RegExp(`.${this.githubHostname}$`)
    const {data, origin} = event
    if (!data || !origin) {
      return
    }

    if (!wantGitHubOrigin.test(origin)) {
      return
    }

    const {type, identity, body} = (() => {
      try {
        return JSON.parse(data)
      } catch (error) {
        return data
      }
    })()
    if (!type || !body) {
      return
    }
    if (identity && identity !== this.identity) {
      return window.debug(`Message has identity '${identity}', expected '${this.identity}'.`)
    }

    switch (type) {
      case 'render:timing': {
        const {timing, format} = body
        if (!timing || !format) {
          return window.debug('Malformed timing message:', body)
        }
        if (format !== this.format) {
          return window.debug(`Format mismatch: got '${format}' expected '${this.format}'`)
        }
        return this.submitTiming('remote', timing)
      }
      case 'render:cmd': {
        const {cmd} = body
        const arg = body[cmd]
        if (isDefined(cmd) && isDefined(arg)) {
          return this.handleCmd(cmd, arg)
        }
        break
      }
      default:
        return window.debug(`Unknown message type: ${type}`)
    }
  }

  // Is the viewscreen renderer running inside an iframe?
  haveParent = () => {
    return window.parent !== window
  }

  clientTimeoutAttempts() {
    return Number(document.body.getAttribute('data-client-timeout-attempts'))
  }

  trigger(target: Document | HTMLElement, name: string, data = {}) {
    const event = new CustomEvent(name, {detail: {...data}})
    target.dispatchEvent(event)
  }
}

export default Status

