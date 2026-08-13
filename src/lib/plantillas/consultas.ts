import { clienteServidor } from '@/lib/supabase/servidor'
import type { PlantillaBandit } from '@/lib/bandit/thompson'

const CAMPOS = 'id, segmento, tono, longitud, cta, asunto_patron, activa, envios, reactivaciones, alpha, beta'

export async function plantillasDeSegmento(segmento: string): Promise<PlantillaBandit[]> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase.from('plantillas').select(CAMPOS).eq('segmento', segmento)

  if (error) throw new Error(`No se pudieron leer las plantillas: ${error.message}`)

  return (data ?? []) as PlantillaBandit[]
}

export async function todasLasPlantillas(): Promise<PlantillaBandit[]> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase.from('plantillas').select(CAMPOS).order('segmento')

  if (error) throw new Error(`No se pudieron leer las plantillas: ${error.message}`)

  return (data ?? []) as PlantillaBandit[]
}
