import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compareCodes, slugify } from '../text.js';
const dataPath = path.join(process.cwd(), 'data', 'rubros.json');
export async function getRubros() {
    const raw = await readFile(dataPath, 'utf8');
    const rubros = JSON.parse(raw);
    return rubros
        .filter((rubro) => rubro.codigo && rubro.nombre)
        .sort((first, second) => compareCodes(first.codigo, second.codigo));
}
export async function getRubroByCodigo(codigo) {
    const normalizedCode = codigo.trim().toLowerCase();
    const rubros = await getRubros();
    return rubros.find((rubro) => rubro.codigo.toLowerCase() === normalizedCode) ?? null;
}
export function getRubroPath(rubro) {
    return `/rubros/${encodeURIComponent(rubro.codigo)}/${slugify(rubro.nombre)}`;
}
