import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Presupuesto = {
  id: string
  titulo: string
  detalles: string | null
  fecha_limite: string
  created_at: string
  updated_at: string
}

export type ArchivoAdjunto = {
  id: string
  presupuesto_id: string
  nombre_archivo: string
  ruta_archivo: string
  tipo_archivo: string
  tamaño_archivo: number
  created_at: string
}
