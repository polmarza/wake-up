import { clienteServidor } from '@/lib/supabase/servidor'
import type { PlantillaBandit } from '@/lib/bandit/thompson'
import { tasaEsperada } from '@/lib/bandit/thompson'

/**
 * Métricas de resultado.
 *
 * A este volumen (301 alumnos, 317 envíos) se trae todo y se agrega en TypeScript:
 * es más legible que media docena de vistas materializadas y el coste es irrelevante.
 */

type FilaAlumno = {
  id: string
  grupo_experimento: string
  emails_enviados_total: number
  reactivado: boolean
  tipo_reactivacion: string | null
  precio_pagado_eur: number | null
  consentimiento_marketing: boolean
  opt_out_at: string | null
  hard_bounce: boolean
  queja_spam: boolean
  estado: string
}

export type Grupo = { alumnos: number; reactivados: number; tasa: number }

export type Uplift = {
  tratamiento: Grupo
  holdout: Grupo
  /** Diferencia en puntos porcentuales. Puede ser negativa, y si lo es hay que verlo. */
  diferenciaPuntos: number
  /**
   * El holdout no registra ni una sola reactivación. En datos reales eso no pasa:
   * siempre hay gente que vuelve sola. Es un artefacto de cómo se generó el dataset
   * sintético, y sin él la comparación no mide nada.
   */
  holdoutSinReactivaciones: boolean
}

export type FilaSegmento = { segmento: string; contactados: number; reactivados: number; tasa: number }

export type FilaPlantilla = PlantillaBandit & { tasaObservada: number; tasaEsperada: number }

export type TipoReactivacion = { tipo: string; total: number }

export type Resultados = {
  uplift: Uplift
  porSegmento: FilaSegmento[]
  porPlantilla: FilaPlantilla[]
  porTipo: TipoReactivacion[]
  /** Ingreso recuperado: solo las reinscripciones, que son las que facturan. */
  reinscripciones: number
  ingresoEstimado: number
  ticketMedio: number
}

function grupo(alumnos: FilaAlumno[]): Grupo {
  const reactivados = alumnos.filter((alumno) => alumno.reactivado).length
  return {
    alumnos: alumnos.length,
    reactivados,
    tasa: alumnos.length > 0 ? reactivados / alumnos.length : 0,
  }
}

export async function obtenerResultados(): Promise<Resultados> {
  const supabase = await clienteServidor()

  const [{ data: alumnosData, error: errorAlumnos }, { data: enviosData }, { data: plantillasData }] =
    await Promise.all([
      supabase
        .from('alumnos')
        .select(
          'id, grupo_experimento, emails_enviados_total, reactivado, tipo_reactivacion, precio_pagado_eur, ' +
            'consentimiento_marketing, opt_out_at, hard_bounce, queja_spam, estado',
        ),
      supabase.from('envios').select('alumno_id, segmento, estado_envio'),
      supabase
        .from('plantillas')
        .select('id, segmento, tono, longitud, cta, asunto_patron, activa, envios, reactivaciones, alpha, beta')
        .order('segmento'),
    ])

  if (errorAlumnos) throw new Error(`No se pudieron leer los resultados: ${errorAlumnos.message}`)

  const alumnos = (alumnosData ?? []) as unknown as FilaAlumno[]
  const envios = (enviosData ?? []) as unknown as {
    alumno_id: string
    segmento: string | null
    estado_envio: string
  }[]
  const plantillas = (plantillasData ?? []) as unknown as PlantillaBandit[]

  /**
   * El grupo de tratamiento son los que **recibieron** un email, no todos los que
   * podrían haberlo recibido: meter a los que aún no se han trabajado diluiría la
   * tasa y haría parecer que el sistema funciona peor de lo que funciona.
   */
  const tratamiento = alumnos.filter(
    (alumno) => alumno.grupo_experimento === 'tratamiento' && alumno.emails_enviados_total > 0,
  )

  /**
   * Del holdout se descuentan los que tampoco habrían sido contactables (sin
   * consentimiento, baja, rebote, queja). Comparar contra el holdout entero
   * infravaloraría su tasa y regalaría uplift.
   */
  const holdout = alumnos.filter(
    (alumno) =>
      alumno.grupo_experimento === 'holdout' &&
      alumno.consentimiento_marketing &&
      alumno.opt_out_at === null &&
      !alumno.hard_bounce &&
      !alumno.queja_spam &&
      alumno.estado !== 'baja',
  )

  const grupoTratamiento = grupo(tratamiento)
  const grupoHoldout = grupo(holdout)

  // El segmento se toma del envío: es el que tenía el alumno cuando se le escribió,
  // no el que tiene ahora.
  const reactivadoPorAlumno = new Map(alumnos.map((alumno) => [alumno.id, alumno.reactivado]))

  const contactadosPorSegmento = new Map<string, Set<string>>()
  for (const envio of envios) {
    if (envio.estado_envio !== 'enviado' || !envio.segmento) continue
    if (!contactadosPorSegmento.has(envio.segmento)) contactadosPorSegmento.set(envio.segmento, new Set())
    contactadosPorSegmento.get(envio.segmento)!.add(envio.alumno_id)
  }

  const porSegmento: FilaSegmento[] = [...contactadosPorSegmento.entries()]
    .map(([segmento, ids]) => {
      const reactivados = [...ids].filter((id) => reactivadoPorAlumno.get(id)).length
      return { segmento, contactados: ids.size, reactivados, tasa: reactivados / ids.size }
    })
    .sort((a, b) => b.tasa - a.tasa)

  const porPlantilla: FilaPlantilla[] = plantillas.map((plantilla) => ({
    ...plantilla,
    tasaObservada: plantilla.envios > 0 ? plantilla.reactivaciones / plantilla.envios : 0,
    tasaEsperada: tasaEsperada(plantilla),
  }))

  const conteoTipos = new Map<string, number>()
  for (const alumno of alumnos) {
    if (!alumno.reactivado || !alumno.tipo_reactivacion) continue
    conteoTipos.set(alumno.tipo_reactivacion, (conteoTipos.get(alumno.tipo_reactivacion) ?? 0) + 1)
  }
  const porTipo = [...conteoTipos.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)

  const precios = alumnos.map((alumno) => Number(alumno.precio_pagado_eur)).filter((precio) => precio > 0)
  const ticketMedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0
  const reinscripciones = conteoTipos.get('reinscripcion') ?? 0

  return {
    uplift: {
      tratamiento: grupoTratamiento,
      holdout: grupoHoldout,
      diferenciaPuntos: (grupoTratamiento.tasa - grupoHoldout.tasa) * 100,
      holdoutSinReactivaciones: grupoHoldout.reactivados === 0,
    },
    porSegmento,
    porPlantilla,
    porTipo,
    reinscripciones,
    ingresoEstimado: reinscripciones * ticketMedio,
    ticketMedio,
  }
}
