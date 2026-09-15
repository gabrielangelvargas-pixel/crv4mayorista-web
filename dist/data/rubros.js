import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { compareCodes, slugify } from '../text.js';
const dataPath = path.join(process.cwd(), 'data', 'rubros.json');
const databaseUrl = process.env.DATABASE_URL;
export async function getRubros() {
    const databaseRubros = await getDatabaseRubros();
    if (databaseRubros.length > 0) {
        return databaseRubros;
    }
    const raw = await readFile(dataPath, 'utf8');
    const rubros = JSON.parse(raw);
    return sortRubros(rubros);
}
async function getDatabaseRubros() {
    if (!databaseUrl) {
        return [];
    }
    const connection = await mysql.createConnection(databaseUrl);
    try {
        const [rows] = await connection.execute(`
      SELECT
        r.Id,
        r.IdRubro,
        r.NombreRubro,
        r.Descripcion,
        r.ImagenPrincipal,
        r.IdPadre,
        padre.NombreRubro AS NombrePadre,
        r.Orden
      FROM rubros r
      LEFT JOIN rubros padre ON padre.Id = r.IdPadre
      ORDER BY r.IdRubro
    `);
        return sortRubros(rows.map((row) => ({
            codigo: row.IdRubro,
            nombre: row.NombreRubro,
            descripcion: row.Descripcion,
            imagenPrincipal: row.ImagenPrincipal,
            idPadre: row.IdPadre,
            nombrePadre: row.NombrePadre,
            orden: row.Orden ?? 0,
        })));
    }
    finally {
        await connection.end();
    }
}
function sortRubros(rubros) {
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
