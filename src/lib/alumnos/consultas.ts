import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * Envíos que ya salieron y siguen sin resultado registrado. Es la bandeja del ciclo:
 * mientras un envío esté aquí, el bandit no ha aprendido nada de él.
 */

export type EnvioPendiente = {
  id: string
  alumno_id: string
  plantilla_id: string | null
  segmento: string | null
  asunto: string | null
  enviado_at: string | null
  abierto_at: string | null
  respondido: boolean
  reactivado_at: string | null
  tipo_reactivacion: string | null
  nombre: string
  apellidos: string
  email: string
  curso_nombre: string
  reactivado: boolean
}

type FilaCruda = Omit<EnvioPendiente, 'nombre' | 'apellidos' | 'email' | 'curso_nombre' | 'reactivado'> & {
  alumnos: {
    nombre: string
    apellidos: string
    email: string
    curso_nombre: string
    reactivado: boolean
  } | null
}

async function enviosEnviados(): Promise<EnvioPendiente[]> {
  const supabase = await clienteServidor()

  const { data, error } = await supabase
    .from('envios')
    .select(
      'id, alumno_id, plantilla_id, segmento, asunto, enviado_at, abierto_at, respondido, ' +
        'reactivado_at, tipo_reactivacion, alumnos(nombre, apellidos, email, curso_nombre, reactivado)',
    )
    .eq('estado_envio', 'enviado')
    .order('enviado_at', { ascending: false })
    .limit(400)

  if (error) throw new Error(`No se pudieron leer los envíos: ${error.message}`)

  return ((data ?? []) as unknown as FilaCruda[])
    .filter((fila) => fila.alumnos !== null)
    .map((fila) => ({
      ...fila,
      nombre: fila.alumnos!.nombre,
      apellidos: fila.alumnos!.apellidos,
      email: fila.alumnos!.email,
      curso_nombre: fila.alumnos!.curso_nombre,
      reactivado: fila.alumnos!.reactivado,
    }))
}

export async function bandejaDeResultados(): Promise<{
  pendientes: EnvioPendiente[]
  cerrados: EnvioPendiente[]
}> {
  const envios = await enviosEnviados()
  return {
    pendientes: envios.filter((envio) => !envio.reactivado),
    cerrados: envios.filter((envio) => envio.reactivado && envio.reactivado_at !== null),
  }
}
