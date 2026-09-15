import type { RubroPublico, SeoMetadata } from './types.js'
import { escapeHtml } from './text.js'
import { getRubroPath } from './data/rubros.js'

export function renderLayout(metadata: SeoMetadata, content: string) {
  const imageTags = metadata.image
    ? `
    <meta property="og:image" content="${escapeHtml(metadata.image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="628">
    <meta name="twitter:image" content="${escapeHtml(metadata.image)}">`
    : ''

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(metadata.title)}</title>
    <meta name="description" content="${escapeHtml(metadata.description)}">
    <link rel="canonical" href="${escapeHtml(metadata.url)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="CRV4 Mayorista">
    <meta property="og:title" content="${escapeHtml(metadata.title)}">
    <meta property="og:description" content="${escapeHtml(metadata.description)}">
    <meta property="og:url" content="${escapeHtml(metadata.url)}">${imageTags}
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="/styles.css">
    <script src="/app.js" defer></script>
  </head>
  <body>
    <button class="menu-backdrop" type="button" data-menu-close aria-label="Cerrar menu"></button>
    <aside class="side-menu" id="site-menu" aria-hidden="true">
      <div class="side-menu-header">
        <img src="/assets/logo.svg" alt="">
        <button class="icon-button" type="button" data-menu-close aria-label="Cerrar menu">×</button>
      </div>
      <nav class="side-nav">
        <a href="/">Inicio</a>
        <a href="/rubros">Rubros</a>
        <a href="/#mayorista">Venta mayorista</a>
        <a href="/#contacto">Contacto</a>
      </nav>
    </aside>
    <header class="site-header">
      <button class="hamburger" type="button" data-menu-open aria-controls="site-menu" aria-expanded="false" aria-label="Abrir menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <a class="brand" href="/" aria-label="CRV4 Mayorista">
        <img src="/assets/logo.svg" alt="">
      </a>
      <nav class="top-nav">
        <a href="/rubros">Rubros</a>
      </nav>
    </header>
    <main>${content}</main>
  </body>
</html>`
}

export function renderHome(rubros: RubroPublico[]) {
  const featuredRubros = rubros.slice(0, 6)
  return `
    <section class="hero">
      <div>
        <p>CRV4 MAYORISTA</p>
        <h1>Insumos y accesorios mayoristas para revender mejor</h1>
        <span>Catalogo online con rubros, portadas y novedades pensado para compartir rapido con tus clientes.</span>
        <div class="hero-actions">
          <a class="primary-link" href="/rubros">Ver rubros</a>
          <a class="secondary-link" href="#mayorista">Como comprar</a>
        </div>
      </div>
    </section>
    <section class="commercial-strip" id="mayorista">
      <article>
        <strong>Precios mayoristas</strong>
        <span>Rubros listos para explorar y compartir.</span>
      </article>
      <article>
        <strong>Portadas para redes</strong>
        <span>Imagenes optimizadas para WhatsApp y enlaces.</span>
      </article>
      <article>
        <strong>Pedidos online</strong>
        <span>Base preparada para el proximo modulo web.</span>
      </article>
    </section>
    <section class="section-title">
      <div>
        <p>Catalogo</p>
        <h2>Rubros destacados</h2>
      </div>
      <a href="/rubros">Ver todos</a>
    </section>
    ${renderRubroGrid(featuredRubros)}
    <section class="contact-band" id="contacto">
      <div>
        <p>CRV4 MAYORISTA</p>
        <h2>Armemos tu pedido mayorista</h2>
      </div>
      <a class="primary-link" href="/rubros">Explorar catalogo</a>
    </section>
  `
}

export function renderRubroList(rubros: RubroPublico[]) {
  return `
    <section class="page-title">
      <h1>Rubros</h1>
    </section>
    ${renderRubroGrid(rubros)}
  `
}

export function renderRubroDetail(rubro: RubroPublico, imageUrl?: string) {
  return `
    <article class="rubro-detail">
      ${imageUrl ? `<img class="cover" src="${escapeHtml(imageUrl)}" alt="">` : ''}
      <div class="detail-body">
        <span class="code">${escapeHtml(rubro.codigo)}</span>
        <h1>${escapeHtml(rubro.nombre)}</h1>
        <p>${escapeHtml(getDescription(rubro))}</p>
      </div>
    </article>
  `
}

function renderRubroGrid(rubros: RubroPublico[]) {
  return `
    <section class="grid">
      ${rubros.map(renderRubroCard).join('')}
    </section>
  `
}

function renderRubroCard(rubro: RubroPublico) {
  const image = rubro.imagenPrincipal?.trim()
  return `
    <a class="rubro-card" href="${getRubroPath(rubro)}">
      ${image ? `<img src="${escapeHtml(image)}" alt="">` : '<div class="image-placeholder"></div>'}
      <div>
        <span>${escapeHtml(rubro.codigo)}</span>
        <strong>${escapeHtml(rubro.nombre)}</strong>
        <p>${escapeHtml(getDescription(rubro))}</p>
      </div>
    </a>
  `
}

export function getDescription(rubro: RubroPublico) {
  return rubro.descripcion?.trim() || `${rubro.nombre} en CRV4 Mayorista.`
}
