import { z } from 'zod'

/**
 * Validación del texto generado. La revisión humana es la defensa principal, pero
 * hay fallos que no deben llegar siquiera a la pantalla del operador: un marcador
 * sin sustituir delata la costura, y una promesa comercial inventada es un problema
 * que no se arregla pidiendo perdón.
 */

export const esquemaBorrador = z.object({
  asunto: z.string().min(10).max(90),
  cuerpo: z.string().min(150).max(1400),
})

export type Borrador = z.infer<typeof esquemaBorrador>

/** El mismo esquema en JSON Schema, que es lo que entiende la API. */
export const jsonSchemaBorrador = {
  type: 'object',
  properties: {
    asunto: {
      type: 'string',
      description: 'Asunto del email, sin comillas y sin emoji. Entre 10 y 90 caracteres.',
    },
    cuerpo: {
      type: 'string',
      description:
        'Cuerpo del email en texto plano, con saltos de línea entre párrafos. Sin firma, ' +
        'sin despedida corporativa y sin enlace de baja: eso se añade al renderizar.',
    },
  },
  required: ['asunto', 'cuerpo'],
  additionalProperties: false,
} as const

/**
 * Compromisos que el modelo no puede adquirir en nombre de la escuela. No es una
 * lista de palabras prohibidas por estilo: cada una implica algo que Learning Heroes
 * tendría que cumplir después.
 */
const COMPROMISOS_PROHIBIDOS: { patron: RegExp; motivo: string }[] = [
  { patron: /\bdescuent\w*/i, motivo: 'ofrece un descuento' },
  { patron: /\b\d{1,3}\s?%\s?(de\s+)?(descuento|dto)/i, motivo: 'ofrece un porcentaje de descuento' },
  { patron: /\bgratis\b|\bgratuit\w+/i, motivo: 'promete algo gratuito' },
  { patron: /\bbeca\w*/i, motivo: 'menciona una beca' },
  { patron: /\breembols\w+/i, motivo: 'promete un reembolso' },
  { patron: /\bdevoluci[oó]n del dinero\b/i, motivo: 'promete devolución del dinero' },
  { patron: /\bplaza\s+(reservada|garantizada)\b/i, motivo: 'afirma que hay una plaza reservada' },
  { patron: /\bte\s+(regalo|regalamos)\b/i, motivo: 'regala algo' },
  { patron: /\b\d+\s?€/, motivo: 'menciona un importe concreto' },
]

/** Marcadores de plantilla que se han quedado sin sustituir. */
const MARCADOR_SIN_SUSTITUIR = /\{[a-z_]+\}/i

export type ProblemaBorrador = { campo: 'asunto' | 'cuerpo'; problema: string }

export function validarBorrador(borrador: Borrador): ProblemaBorrador[] {
  const problemas: ProblemaBorrador[] = []

  for (const campo of ['asunto', 'cuerpo'] as const) {
    const texto = borrador[campo]

    if (MARCADOR_SIN_SUSTITUIR.test(texto)) {
      const marcador = texto.match(MARCADOR_SIN_SUSTITUIR)![0]
      problemas.push({ campo, problema: `contiene el marcador sin sustituir ${marcador}` })
    }

    for (const { patron, motivo } of COMPROMISOS_PROHIBIDOS) {
      if (patron.test(texto)) {
        problemas.push({ campo, problema: `${motivo}, y eso no lo puede prometer el sistema` })
      }
    }
  }

  return problemas
}
