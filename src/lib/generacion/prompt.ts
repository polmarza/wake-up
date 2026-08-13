import type { Candidato } from '@/lib/candidatos/consultas'
import { ETIQUETAS_MOTIVO } from '@/lib/candidatos/consultas'
import type { PlantillaBandit } from '@/lib/bandit/thompson'

/**
 * El prompt. Es la pieza que decide *qué* se escribe; quién lo recibe ya viene
 * decidido por la vista de elegibilidad y no se discute aquí.
 *
 * Al cambiar este archivo hay que subir PROMPT_VERSION. Sin eso, comparar campañas
 * entre sí deja de tener sentido: no se sabe qué texto produjo qué resultado.
 */

export const PROMPT_VERSION = 'v1'

const TONOS: Record<string, string> = {
  empatico: 'Cercano y sin presión. Reconoce que la vida se cruza y que dejarlo no es un fracaso.',
  directo: 'Claro y al grano. Sin rodeos ni preámbulos, pero cálido.',
  reto: 'Plantea el final del curso como un reto alcanzable, no como una obligación pendiente.',
  urgencia: 'Transmite que el momento de retomar es ahora, sin inventar plazos ni amenazas.',
}

const CTAS: Record<string, string> = {
  retomar_sesion: 'Que retome el curso por la sesión donde lo dejó.',
  reservar_llamada: 'Que responda a este email para hablar quince minutos con su profesor.',
  onboarding: 'Que entre por primera vez y haga la primera sesión.',
  upsell_siguiente_curso: 'Que se plantee el siguiente curso del itinerario.',
}

const LONGITUDES: Record<string, string> = {
  corta: 'Muy breve: dos párrafos cortos, menos de 90 palabras en total.',
  media: 'Breve: tres párrafos cortos, menos de 150 palabras en total.',
}

export const SISTEMA = `Escribes emails de reactivación para Learning Heroes, una escuela online de cursos de IA, vibe coding, datos y automatización.

Escribes como el profesor del alumno, no como un departamento de marketing. La persona que recibe este email pagó por un curso y lo dejó a medias; el email debe sonar a alguien que se dio cuenta y se acordó de ella, porque eso es exactamente lo que está pasando.

Reglas que no se negocian:

1. Usa únicamente los datos de la ficha que te doy. No inventes nada más: ni contenidos del curso, ni nombres de profesores, ni fechas, ni lo que hicieron sus compañeros.
2. No prometas nada que la escuela tendría que cumplir después: descuentos, precios, plazas reservadas, becas, devoluciones, regalos, extensiones de acceso. No tienes autoridad para ofrecer ninguna de esas cosas.
3. No inventes urgencia falsa. Nada de "última oportunidad", "quedan pocas plazas" ni cuentas atrás que no existen.
4. Nada de culpa ni reproche. La persona no te debe nada. Si declaró un motivo para dejarlo, trátalo con respeto: el dinero, un cambio de trabajo o la falta de tiempo son motivos legítimos, no excusas.
5. Escribe en el idioma indicado. Si es catalán, escribe en catalán natural, no en castellano traducido.
6. Texto plano. Sin markdown, sin emoji, sin asteriscos, sin titulares. Saltos de línea entre párrafos.
7. No firmes ni te despidas con fórmulas corporativas, y no incluyas ningún enlace: eso se añade después.
8. El asunto no lleva comillas, ni emoji, ni la palabra "reactivación". Que parezca escrito por una persona.

El asunto de referencia que te doy es la idea a transmitir, no una plantilla literal: reescríbelo con los datos reales de este alumno.`

export function construirPrompt(candidato: Candidato, plantilla: PlantillaBandit): string {
  const sesionesRestantes = candidato.total_sesiones - candidato.ultima_sesion_completada
  const progreso = Math.round(Number(candidato.progreso_pct) * 100)
  const motivo = candidato.motivo_abandono_declarado
    ? (ETIQUETAS_MOTIVO[candidato.motivo_abandono_declarado] ?? candidato.motivo_abandono_declarado)
    : null

  const ficha = [
    `Nombre: ${candidato.nombre}`,
    `Idioma: ${candidato.idioma === 'ca' ? 'catalán' : 'castellano'}`,
    `Curso: ${candidato.curso_nombre}`,
    `Sesiones completadas: ${candidato.ultima_sesion_completada} de ${candidato.total_sesiones} (${progreso}%)`,
    sesionesRestantes > 0 ? `Sesiones que le faltan para acabar: ${sesionesRestantes}` : null,
    `Días sin actividad: ${candidato.dias_inactivo}`,
    motivo ? `Motivo que declaró al dejarlo: ${motivo}` : 'No declaró ningún motivo al dejarlo',
    candidato.emails_enviados_total > 0
      ? `Ya ha recibido ${candidato.emails_enviados_total} email(s) anteriores de reactivación, así que no repitas el mismo enfoque de cero.`
      : 'Es el primer email que se le escribe.',
  ]
    .filter(Boolean)
    .join('\n')

  const situacion =
    candidato.segmento_calculado === 'completado'
      ? `Terminó el curso entero. El email no es para que vuelva: es para reconocer que lo acabó y abrirle la puerta al siguiente paso.`
      : candidato.segmento_calculado === 'nunca_empezo'
        ? `Se apuntó y nunca llegó a entrar. No ha visto ni una sesión, así que no des por hecho que conoce el contenido.`
        : `Dejó el curso a medias, en la sesión ${candidato.ultima_sesion_completada}.`

  return `Ficha del alumno:
${ficha}

Situación: ${situacion}

Cómo escribirlo:
- Tono: ${TONOS[plantilla.tono ?? ''] ?? 'Cercano y directo.'}
- Longitud: ${LONGITUDES[plantilla.longitud ?? ''] ?? 'Breve: menos de 120 palabras.'}
- Qué queremos que haga: ${CTAS[plantilla.cta ?? ''] ?? 'Que retome el curso.'}
- Idea del asunto (reescríbela, no la copies): ${plantilla.asunto_patron}

Escribe el asunto y el cuerpo.`
}
