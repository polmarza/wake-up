import { NextResponse, type NextRequest } from 'next/server'
import { entorno } from '@/lib/config/entorno'
import { clienteServicio } from '@/lib/supabase/servicio'
import { elegirPlantilla, type PlantillaBandit } from '@/lib/bandit/thompson'
import { generarBorrador, PROMPT_VERSION } from '@/lib/generacion/generar'
import type { Candidato } from '@/lib/candidatos/consultas'

/**
 * Preparación diaria de la cola.
 *
 * **Prepara borradores; no envía nada.** Ese límite no es una limitación técnica —
 * dejar que despache la cola serían pocas líneas— sino la decisión de producto de la
 * que cuelga todo lo demás: el coste de un email mal calibrado a un exalumno supera
 * al valor que intenta recuperar.
 *
 * Lo que cambia es de quién es el trabajo. Sin esto, el operador llega y espera a que
 * el modelo escriba; con esto, llega y encuentra diez borradores esperando un sí o un
 * no. Pasa de redactar a decidir, que es donde un humano aporta algo que el modelo no.
 */

export const maxDuration = 300

/** Cuántos borradores se preparan por ejecución. */
const TOPE_DIARIO = 10

export async function GET(request: NextRequest) {
  const env = entorno()

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
  }

  // Vercel Cron manda el secreto en Authorization; se acepta también como cabecera
  // propia para poder dispararlo a mano en la demo.
  const autorizacion = request.headers.get('authorization')
  const cabecera = request.headers.get('x-cron-secret')
  const autorizado = autorizacion === `Bearer ${env.CRON_SECRET}` || cabecera === env.CRON_SECRET

  if (!autorizado) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = clienteServicio()

  const { data: candidatosData, error } = await db
    .from('candidatos_reactivacion')
    .select('*')
    .limit(TOPE_DIARIO * 3)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const candidatos = (candidatosData ?? []) as unknown as Candidato[]

  const { data: borradoresData } = await db
    .from('envios')
    .select('alumno_id')
    .eq('estado_envio', 'borrador')

  const yaTienenBorrador = new Set((borradoresData ?? []).map((fila) => fila.alumno_id))

  const { data: plantillasData } = await db
    .from('plantillas')
    .select('id, segmento, tono, longitud, cta, asunto_patron, activa, envios, reactivaciones, alpha, beta')

  const plantillas = (plantillasData ?? []) as unknown as PlantillaBandit[]

  const pendientes = candidatos.filter((candidato) => !yaTienenBorrador.has(candidato.id)).slice(0, TOPE_DIARIO)

  const preparados: string[] = []
  const fallidos: { alumno: string; motivo: string }[] = []

  for (const candidato of pendientes) {
    try {
      const delSegmento = plantillas.filter(
        (plantilla) => plantilla.segmento === candidato.segmento_calculado,
      )
      const { elegida } = elegirPlantilla(delSegmento)
      const { borrador, modelo } = await generarBorrador(candidato, elegida)

      const { error: errorInsert } = await db.from('envios').insert({
        alumno_id: candidato.id,
        plantilla_id: elegida.id,
        segmento: candidato.segmento_calculado,
        canal: 'email',
        asunto: borrador.asunto,
        cuerpo: borrador.cuerpo,
        modelo_generador: modelo,
        prompt_version: PROMPT_VERSION,
        estado_envio: 'borrador',
      })

      if (errorInsert) throw new Error(errorInsert.message)
      preparados.push(candidato.id)
    } catch (fallo) {
      // Un borrador que falla no tumba la preparación entera: se anota y se sigue.
      fallidos.push({
        alumno: candidato.id,
        motivo: fallo instanceof Error ? fallo.message : 'error desconocido',
      })
    }
  }

  // Contado aparte y no derivado de la consulta de arriba, que va limitada: un total
  // calculado sobre una lista truncada parecería un dato y no lo sería.
  const { count: candidatosTotales } = await db
    .from('candidatos_reactivacion')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    ok: true,
    preparados: preparados.length,
    fallidos: fallidos.length,
    detalleFallos: fallidos,
    candidatosElegiblesEnTotal: candidatosTotales ?? null,
  })
}
