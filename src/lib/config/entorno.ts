import { z } from 'zod'
import { listaDeAcceso, correoPermitido } from './acceso'

/**
 * Configuración validada al arrancar. Si falta algo o está mal escrito, el proceso
 * falla aquí y no doce capas más abajo con un `undefined` en una cabecera HTTP.
 */

/**
 * Una variable presente pero vacía es lo mismo que una variable ausente.
 *
 * Sin esto, un `.env.local` copiado de `.env.example` con las claves opcionales sin
 * rellenar tumba el arranque entero: la cadena vacía no pasa `min(1)` y el error
 * apunta a una clave que en realidad no hacía falta.
 */
function opcional<T extends z.ZodTypeAny>(esquema: T) {
  return z.preprocess((valor) => (valor === '' ? undefined : valor), esquema.optional())
}

const esquemaServidor = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),

  ANTHROPIC_API_KEY: opcional(z.string().min(1)),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5'),

  RESEND_API_KEY: opcional(z.string().min(1)),
  RESEND_FROM: opcional(z.string().min(1)),
  /** Firma de los webhooks de Resend. Sin ella el endpoint devuelve 503, no pasa nada. */
  RESEND_WEBHOOK_SECRET: opcional(z.string().min(1)),

  /**
   * Interruptor de seguridad. Con `false` ningún email sale al exterior, aunque
   * alguien llame directamente a la acción de envío.
   */
  ENVIO_REAL_HABILITADO: z
    .string()
    .default('false')
    .transform((valor) => valor === 'true'),

  /**
   * Buzón del operador. Puede recibir envíos reales.
   *
   * Admite los mismos formatos que EMAILS_PERMITIDOS: una dirección concreta o un
   * dominio entero (`@learningheroes.com`). Ojo con la diferencia: en la lista de
   * acceso, un dominio decide *quién entra*; aquí decide *a quién se le puede
   * escribir*, y un error se materializa en la bandeja de otra persona.
   */
  EMAIL_OPERADOR: opcional(z.string().min(1)),

  /**
   * Correo del alumno real que añade el seed. También puede recibir envíos reales:
   * si no, no se podría ver en la demo el email que se le escribe. Mismo formato.
   */
  ALUMNO_REAL_EMAIL: opcional(z.string().min(1)),

  /** Quién puede entrar: direcciones sueltas o dominios enteros (@learningheroes.com). */
  EMAILS_PERMITIDOS: z.string().default('').transform(listaDeAcceso),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  CRON_SECRET: opcional(z.string().min(1)),
})

export type Entorno = z.infer<typeof esquemaServidor>

let cache: Entorno | null = null

export function entorno(): Entorno {
  if (cache) return cache

  const resultado = esquemaServidor.safeParse(process.env)

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Configuración de entorno inválida:\n${detalle}`)
  }

  cache = resultado.data
  return cache
}

/**
 * Direcciones que pueden recibir un envío real: el buzón del operador y el del alumno
 * real, que suelen ser dos correos distintos de la misma persona. Nada más.
 */
export function destinatariosRealesPermitidos(): string[] {
  const env = entorno()
  // Se deduplica porque lo habitual es que las dos variables apunten al mismo buzón,
  // y una lista que repite la misma dirección dos veces parece un error de datos.
  return [...new Set([...listaDeAcceso(env.EMAIL_OPERADOR), ...listaDeAcceso(env.ALUMNO_REAL_EMAIL)])]
}

/**
 * Por qué este email no puede salir de verdad, o `null` si sí puede.
 *
 * Devuelve el motivo en vez de un booleano a propósito: con un `false` a secas, quien
 * lo consume tiene que adivinar la causa, y adivinar acaba en mensajes que culpan a
 * la dirección cuando lo que falta es una credencial. Cada motivo se arregla de una
 * forma distinta, así que cada motivo se dice.
 */
export function motivoNoEnviable(destinatario: string): string | null {
  const env = entorno()

  if (!env.ENVIO_REAL_HABILITADO) {
    return 'El interruptor ENVIO_REAL_HABILITADO está en false'
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    const faltan = [
      !env.RESEND_API_KEY ? 'RESEND_API_KEY' : null,
      !env.RESEND_FROM ? 'RESEND_FROM' : null,
    ].filter(Boolean)
    return `Falta ${faltan.join(' y ')} en el entorno de la aplicación`
  }

  const permitidos = destinatariosRealesPermitidos()
  if (permitidos.length === 0) {
    return 'No hay ninguna dirección autorizada: falta EMAIL_OPERADOR o ALUMNO_REAL_EMAIL'
  }

  if (!correoPermitido(destinatario, permitidos)) {
    return `${destinatario} no está autorizada para envíos reales (${permitidos.join(', ')})`
  }

  return null
}

/**
 * Las direcciones del dataset son @example.com y no son entregables: dejarlas pasar
 * generaría rebotes y ensuciaría la reputación del dominio.
 */
export function puedeEnviarDeVerdad(destinatario: string): boolean {
  return motivoNoEnviable(destinatario) === null
}
