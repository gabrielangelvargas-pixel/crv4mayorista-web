import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { compareCodes, slugify } from '../text.js';
const dataPath = path.join(process.cwd(), 'data', 'rubros.json');
const databaseUrl = process.env.DATABASE_URL;
export class RubrosDatabaseError extends Error {
    constructor(cause) {
        super('La carga real de rubros fallo.');
        this.name = 'RubrosDatabaseError';
        this.cause = cause;
    }
}
export async function getRubros() {
    if (databaseUrl) {
        try {
            return await getDatabaseRubros();
        }
        catch (error) {
            throw new RubrosDatabaseError(error);
        }
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
        await ensureRubrosColumns(connection);
        const [rows] = await connection.execute(`
      SELECT
        r.Id,
        r.IdRubro,
        r.NombreRubro,
        r.Descripcion,
        r.ImagenPrincipal,
        r.IdPadre,
        padre.NombreRubro AS NombrePadre,
        r.Orden,
        r.Activo,
        r.FechaModificacion
      FROM rubros r
      LEFT JOIN rubros padre ON padre.Id = r.IdPadre
      WHERE COALESCE(r.Activo, 1) = 1
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
            activo: Boolean(row.Activo ?? true),
            fechaModificacion: normalizeDate(row.FechaModificacion),
        })));
    }
    finally {
        await connection.end();
    }
}
async function ensureRubrosColumns(connection) {
    await ensureRubrosColumn(connection, 'Activo', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `Orden`');
    await ensureRubrosColumn(connection, 'FechaModificacion', 'DATETIME NULL AFTER `Activo`');
}
async function ensureRubrosColumn(connection, columnName, columnDefinition) {
    const [rows] = await connection.execute(`
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'rubros'
        AND COLUMN_NAME = ?
    `, [columnName]);
    if (Number(rows[0]?.total ?? 0) > 0) {
        return;
    }
    await connection.execute(`ALTER TABLE rubros ADD COLUMN ${columnName} ${columnDefinition}`);
}
function sortRubros(rubros) {
    return rubros
        .filter((rubro) => rubro.codigo && rubro.nombre && rubro.activo !== false)
        .sort((first, second) => compareCodes(first.codigo, second.codigo));
}
function normalizeDate(value) {
    if (!value) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : value;
}
export async function getRubroByCodigo(codigo) {
    const normalizedCode = codigo.trim().toLowerCase();
    const rubros = await getRubros();
    return rubros.find((rubro) => rubro.codigo.toLowerCase() === normalizedCode) ?? null;
}
export function getRubroPath(rubro) {
    return `/rubros/${encodeURIComponent(rubro.codigo)}/${slugify(rubro.nombre)}`;
}
