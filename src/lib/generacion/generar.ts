import Anthropic from '@anthropic-ai/sdk'
import { entorno } from '@/lib/config/entorno'
import type { Candidato } from '@/lib/candidatos/consultas'
import type { PlantillaBandit } from '@/lib/bandit/thompson'
import { SISTEMA, PROMPT_VERSION, construirPrompt } from './prompt'
import { esquemaBorrador, jsonSchemaBorrador, validarBorrador, type Borrador } from './esquema'

export { PROMPT_VERSION }

export type ResultadoGeneracion = {
  borrador: Borrador
  modelo: string
  promptVersion: string
  /** Problemas detectados en el primer intento, si hubo reintento. Se registra, no se oculta. */
  reintentado: boolean
}

let clienteCache: Anthropic | null = null

function cliente(): Anthropic {
  if (clienteCache) return clienteCache
  const env = entorno()
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY en .env.local')
  }
  clienteCache = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  return clienteCache
}

async function pedirBorrador(prompt: string, modelo: string): Promise<Borrador> {
  const respuesta = await cliente().messages.create({
    model: modelo,
    max_tokens: 2000,
    system: SISTEMA,
    // Salida estructurada: el modelo no puede devolver algo que no encaje en el
    // esquema, así que no hay que pelearse con JSON mal formado.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: jsonSchemaBorrador },
    },
    messages: [{ role: 'user', content: prompt }],
  })

  if (respuesta.stop_reason === 'refusal') {
    throw new Error('El modelo declinó generar este email')
  }

  const texto = respuesta.content.find((bloque) => bloque.type === 'text')
  if (!texto || texto.type !== 'text') {
    throw new Error('El modelo no devolvió texto')
  }

  return esquemaBorrador.parse(JSON.parse(texto.text))
}

/**
 * Genera el borrador para un candidato con la plantilla que eligió el bandit.
 *
 * Un reintento y no más. Si el segundo intento tampoco pasa la validación, el
 * borrador se marca como fallido y el operador pasa al siguiente: es preferible una
 * cola con un hueco a un email con un marcador sin sustituir.
 */
export async function generarBorrador(
  candidato: Candidato,
  plantilla: PlantillaBandit,
  instruccionExtra?: string,
): Promise<ResultadoGeneracion> {
  const env = entorno()
  const modelo = env.ANTHROPIC_MODEL
  const base = construirPrompt(candidato, plantilla)
  const prompt = instruccionExtra ? `${base}\n\nInstrucción adicional del operador: ${instruccionExtra}` : base

  const primero = await pedirBorrador(prompt, modelo)
  const problemas = validarBorrador(primero)

  if (problemas.length === 0) {
    return { borrador: primero, modelo, promptVersion: PROMPT_VERSION, reintentado: false }
  }

  const correccion =
    `${prompt}\n\nEl intento anterior no vale porque ` +
    problemas.map((p) => `el ${p.campo} ${p.problema}`).join('; ') +
    '. Reescríbelo entero corrigiéndolo.'

  const segundo = await pedirBorrador(correccion, modelo)
  const problemasSegundo = validarBorrador(segundo)

  if (problemasSegundo.length > 0) {
    throw new Error(
      `El borrador sigue sin ser válido tras el reintento: ` +
        problemasSegundo.map((p) => `${p.campo} ${p.problema}`).join('; '),
    )
  }

  return { borrador: segundo, modelo, promptVersion: PROMPT_VERSION, reintentado: true }
}
