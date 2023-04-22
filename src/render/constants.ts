

/**
 * This is set within the github css. However, because we need to manually
 * update the render container's height during pjax nav events, we also need to ensure that
 * every renderable type fires a resize event some height; this is a fallback for types
 * that did not previously report their height. For now, those types are `geojson` and `stl`
 */
export const DEFAULT_CONTAINER_HEIGHT = 500

export const DEFAULT_DOCS_LINK_HOSTNAME = 'https://docs.github.com'

