export function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
export function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function compareCodes(first, second) {
    return first.localeCompare(second, 'es-AR', { numeric: true, sensitivity: 'base' });
}
export function toAbsoluteUrl(siteUrl, value) {
    if (!value) {
        return undefined;
    }
    if (/^https?:\/\//i.test(value)) {
        return value;
    }
    const normalizedSite = siteUrl.replace(/\/+$/, '');
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return `${normalizedSite}${normalizedPath}`;
}
