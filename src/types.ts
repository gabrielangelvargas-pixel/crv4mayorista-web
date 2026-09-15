export type RubroPublico = {
  codigo: string
  nombre: string
  descripcion?: string | null
  imagenPrincipal?: string | null
  idPadre?: number | null
  nombrePadre?: string | null
  orden?: number
  activo?: boolean
  fechaModificacion?: string | null
}

export type SeoMetadata = {
  title: string
  description: string
  url: string
  image?: string
}
