import compression from 'compression';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRubroByCodigo, getRubroPath, getRubros } from './data/rubros.js';
import { getDescription, renderHome, renderLayout, renderRubroDetail, renderRubroList } from './render.js';
import { slugify, toAbsoluteUrl } from './text.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PORT ?? 3000);
const siteUrl = (process.env.SITE_URL ?? 'https://crv4mayorista.com.ar').replace(/\/+$/, '');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static(path.join(projectRoot, 'public'), { maxAge: '1h' }));
app.get('/health', (_request, response) => {
    response.json({ ok: true });
});
app.get('/', async (_request, response, next) => {
    try {
        const rubros = await getRubros();
        response.send(renderLayout({
            title: 'CRV4 Mayorista',
            description: 'Catalogo publico de rubros mayoristas de CRV4.',
            url: `${siteUrl}/`,
        }, renderHome(rubros)));
    }
    catch (error) {
        next(error);
    }
});
app.get('/rubros', async (_request, response, next) => {
    try {
        const rubros = await getRubros();
        response.send(renderLayout({
            title: 'Rubros | CRV4 Mayorista',
            description: 'Rubros disponibles en el catalogo mayorista de CRV4.',
            url: `${siteUrl}/rubros`,
        }, renderRubroList(rubros)));
    }
    catch (error) {
        next(error);
    }
});
const renderRubroRoute = async (request, response, next) => {
    try {
        const codigo = Array.isArray(request.params.codigo) ? request.params.codigo[0] : request.params.codigo;
        const rubro = await getRubroByCodigo(codigo);
        if (!rubro) {
            response.status(404).send(renderLayout({
                title: 'Rubro no encontrado | CRV4 Mayorista',
                description: 'No se encontro el rubro solicitado.',
                url: `${siteUrl}${request.path}`,
            }, '<section class="empty"><h1>Rubro no encontrado</h1></section>'));
            return;
        }
        const expectedSlug = slugify(rubro.nombre);
        if (request.params.slug !== expectedSlug) {
            response.redirect(301, getRubroPath(rubro));
            return;
        }
        const imageUrl = toAbsoluteUrl(siteUrl, rubro.imagenPrincipal);
        const rubroUrl = `${siteUrl}${getRubroPath(rubro)}`;
        response.send(renderLayout({
            title: `${rubro.nombre} | CRV4 Mayorista`,
            description: getDescription(rubro),
            url: rubroUrl,
            image: imageUrl,
        }, renderRubroDetail(rubro, imageUrl)));
    }
    catch (error) {
        next(error);
    }
};
app.get('/rubros/:codigo', renderRubroRoute);
app.get('/rubros/:codigo/:slug', renderRubroRoute);
app.listen(port, () => {
    console.log(`CRV4 Mayorista publica escuchando en http://localhost:${port}`);
});
