import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import type { RubroPublico } from '../types.js'
import { compareCodes, slugify } from '../text.js'

const dataPath = path.join(process.cwd(), 'data', 'rubros.json')
const databaseUrl = process.env.DATABASE_URL

export class RubrosDatabaseError extends Error {
  constructor(cause: unknown) {
    super('La carga real de rubros fallo.')
    this.name = 'RubrosDatabaseError'
    this.cause = cause
  }
}

type RubroRow = RowDataPacket & {
  Id?: number
  IdRubro: string
  NombreRubro: string
  Descripcion: string | null
  ImagenPrincipal: string | null
  IdPadre: number | null
  NombrePadre: string | null
  Orden: number | null
}

export async function getRubros() {
  if (databaseUrl) {
    try {
      return await getDatabaseRubros()
    } catch (error) {
      throw new RubrosDatabaseError(error)
    }
  }

  const raw = await readFile(dataPath, 'utf8')
  const rubros = JSON.parse(raw) as RubroPublico[]

  return sortRubros(rubros)
}

async function getDatabaseRubros() {
  if (!databaseUrl) {
    return []
  }

  const connection = await mysql.createConnection(databaseUrl)
  try {
    const [rows] = await connection.execute<RubroRow[]>(`
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
    `)

    return sortRubros(rows.map((row) => ({
      codigo: row.IdRubro,
      nombre: row.NombreRubro,
      descripcion: row.Descripcion,
      imagenPrincipal: row.ImagenPrincipal,
      idPadre: row.IdPadre,
      nombrePadre: row.NombrePadre,
      orden: row.Orden ?? 0,
    })))
  } finally {
    await connection.end()
  }
}

function sortRubros(rubros: RubroPublico[]) {
  return rubros
    .filter((rubro) => rubro.codigo && rubro.nombre)
    .sort((first, second) => compareCodes(first.codigo, second.codigo))
}

export async function getRubroByCodigo(codigo: string) {
  const normalizedCode = codigo.trim().toLowerCase()
  const rubros = await getRubros()
  return rubros.find((rubro) => rubro.codigo.toLowerCase() === normalizedCode) ?? null
}

export function getRubroPath(rubro: RubroPublico) {
  return `/rubros/${encodeURIComponent(rubro.codigo)}/${slugify(rubro.nombre)}`
}
