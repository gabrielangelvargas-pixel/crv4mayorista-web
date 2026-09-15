export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function compareCodes(first: string, second: string) {
  return first.localeCompare(second, 'es-AR', { numeric: true, sensitivity: 'base' })
}

export function toAbsoluteUrl(siteUrl: string, value?: string | null) {
  if (!value) {
    return undefined
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const normalizedSite = siteUrl.replace(/\/+$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  return `${normalizedSite}${normalizedPath}`
}
