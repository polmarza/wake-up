import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * Lectura de la cola.
 *
 * La única fuente de candidatos es la vista `candidatos_reactivacion`. No hay ni debe
 * haber en todo el proyecto una consulta a `alumnos` que decida a quién escribir: la
 * política de supresión vive en SQL para que ningún refactor pueda saltársela.
 */

export type Segmento =
  | 'nunca_empezo'
  | 'abandono_temprano'
  | 'abandono_medio'
  | 'abandono_tardio'
  | 'completado'

export type Candidato = {
  id: string
  nombre: string
  apellidos: string
  email: string
  idioma: string
  curso_id: string
  curso_nombre: string
  cohorte: string | null
  total_sesiones: number
  precio_pagado_eur: number | null
  estado: string
  ultima_sesion_completada: number
  progreso_pct: number
  ultima_actividad_at: string
  dias_inactivo: number
  motivo_abandono_declarado: string | null
  emails_enviados_total: number
  ultimo_envio_at: string | null
  segmento_calculado: Segmento
}

/** Intentos máximos por alumno. Es un techo duro, aplicado también en la vista. */
export const TECHO_INTENTOS = 3

export async function obtenerCandidatos(limite = 100): Promise<Candidato[]> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase
    .from('candidatos_reactivacion')
    .select('*')
    .limit(limite)

  if (error) throw new Error(`No se pudo leer la cola de candidatos: ${error.message}`)

  return (data ?? []) as Candidato[]
}

/**
 * Un candidato concreto. Devuelve null si ya no es elegible —se dio de baja, rebotó,
 * agotó intentos— y eso es información, no un 404 cualquiera: la pantalla lo dice.
 */
export async function obtenerCandidato(id: string): Promise<Candidato | null> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase
    .from('candidatos_reactivacion')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`No se pudo leer el candidato: ${error.message}`)

  return (data as Candidato) ?? null
}

/** Datos mínimos de un alumno aunque ya no esté en la cola. */
export async function alumnoPorId(id: string): Promise<{ email: string; nombre: string } | null> {
  const supabase = await clienteServidor()

  const { data } = await supabase
    .from('alumnos')
    .select('email, nombre')
    .eq('id', id)
    .maybeSingle()

  return (data as { email: string; nombre: string } | null) ?? null
}

export type EnvioHistorico = {
  id: string
  plantilla_id: string | null
  segmento: string | null
  asunto: string | null
  cuerpo: string | null
  estado_envio: string
  enviado_at: string | null
  abierto_at: string | null
  click_at: string | null
  respondido: boolean
  reactivado_at: string | null
  editado_por_humano: boolean
  envio_real: boolean
  descartado_motivo: string | null
}

/** Todo lo que se le ha escrito antes. Es el contexto que justifica escribir otra vez. */
export async function historialDeEnvios(alumnoId: string): Promise<EnvioHistorico[]> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase
    .from('envios')
    .select(
      'id, plantilla_id, segmento, asunto, cuerpo, estado_envio, enviado_at, abierto_at, ' +
        'click_at, respondido, reactivado_at, editado_por_humano, envio_real, descartado_motivo',
    )
    .eq('alumno_id', alumnoId)
    .order('enviado_at', { ascending: false, nullsFirst: true })

  if (error) throw new Error(`No se pudo leer el historial: ${error.message}`)

  return (data ?? []) as unknown as EnvioHistorico[]
}

/** Qué alumnos ya tienen un borrador esperando. Es el trabajo que el cron dejó hecho. */
export async function alumnosConBorrador(): Promise<Set<string>> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase
    .from('envios')
    .select('alumno_id')
    .eq('estado_envio', 'borrador')

  if (error) throw new Error(`No se pudieron leer los borradores: ${error.message}`)

  return new Set((data ?? []).map((fila) => fila.alumno_id as string))
}

/** El borrador pendiente de este alumno, si lo hay. Solo puede haber uno. */
export async function borradorPendiente(alumnoId: string): Promise<EnvioHistorico | null> {
  const envios = await historialDeEnvios(alumnoId)
  return envios.find((envio) => envio.estado_envio === 'borrador') ?? null
}

/**
 * Reparto por segmento, para el resumen de la cola. Se calcula sobre los candidatos
 * ya filtrados: son los que se pueden trabajar hoy, no el total de la escuela.
 */
export function repartoPorSegmento(candidatos: Candidato[]): Record<string, number> {
  return candidatos.reduce<Record<string, number>>((acc, candidato) => {
    acc[candidato.segmento_calculado] = (acc[candidato.segmento_calculado] ?? 0) + 1
    return acc
  }, {})
}

export const ETIQUETAS_SEGMENTO: Record<Segmento, string> = {
  nunca_empezo: 'Nunca empezó',
  abandono_temprano: 'Abandono temprano',
  abandono_medio: 'Abandono medio',
  abandono_tardio: 'Abandono tardío',
  completado: 'Completado',
}

export const ETIQUETAS_MOTIVO: Record<string, string> = {
  nivel_bajo: 'El nivel le venía grande',
  nivel_alto: 'El nivel le resultaba fácil',
  falta_tiempo: 'Falta de tiempo',
  economico: 'Motivos económicos',
  cambio_trabajo: 'Cambio de trabajo',
  problema_tecnico: 'Problema técnico',
}
