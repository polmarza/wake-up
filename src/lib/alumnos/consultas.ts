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

/**
 * El embudo del envío: cuántos salieron, cuántos se abrieron y cuántos acabaron en
 * una vuelta. Es la lectura que un porcentaje suelto no da — dónde se cae la gente.
 */
export type Embudo = { enviados: number; abiertos: number; respondidos: number; volvieron: number }

export async function bandejaDeResultados(): Promise<{
  pendientes: EnvioPendiente[]
  cerrados: EnvioPendiente[]
  embudo: Embudo
}> {
  const envios = await enviosEnviados()

  const pendientes = envios.filter((envio) => !envio.reactivado)
  const cerrados = envios.filter((envio) => envio.reactivado && envio.reactivado_at !== null)

  /**
   * Los pendientes se ordenan por señal, no por fecha: quien abrió el email ya
   * levantó la mano, y es con quien más rentable es gastar el minuto siguiente.
   * Ordenar por fecha entierra esa información entre los 275.
   */
  const puntuar = (envio: EnvioPendiente) =>
    (envio.respondido ? 2 : 0) + (envio.abierto_at ? 1 : 0)

  pendientes.sort((a, b) => {
    const diferencia = puntuar(b) - puntuar(a)
    if (diferencia !== 0) return diferencia
    return (b.enviado_at ?? '').localeCompare(a.enviado_at ?? '')
  })

  return {
    pendientes,
    cerrados,
    embudo: {
      enviados: envios.length,
      abiertos: envios.filter((envio) => envio.abierto_at !== null).length,
      respondidos: envios.filter((envio) => envio.respondido).length,
      volvieron: cerrados.length,
    },
  }
}
