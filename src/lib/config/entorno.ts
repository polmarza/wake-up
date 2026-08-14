import { z } from 'zod'
import { listaDeAcceso } from './acceso'

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

  /** Buzón del operador. Puede recibir envíos reales. */
  EMAIL_OPERADOR: opcional(z.string().email()),

  /**
   * Correo del alumno real que añade el seed. También puede recibir envíos reales:
   * si no, no se podría ver en la demo el email que se le escribe.
   */
  ALUMNO_REAL_EMAIL: opcional(z.string().email()),

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
  return [...new Set(
    [env.EMAIL_OPERADOR, env.ALUMNO_REAL_EMAIL]
      .filter((correo): correo is string => Boolean(correo))
      .map((correo) => correo.trim().toLowerCase()),
  )]
}

/**
 * Un envío real solo puede salir si el interruptor está activo, hay clave de Resend y
 * el destinatario está en esa lista corta.
 *
 * Las direcciones del dataset son @example.com y no son entregables: dejarlas pasar
 * generaría rebotes y ensuciaría la reputación del dominio.
 */
export function puedeEnviarDeVerdad(destinatario: string): boolean {
  const env = entorno()
  if (!env.ENVIO_REAL_HABILITADO) return false
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return false

  const permitidos = destinatariosRealesPermitidos()
  if (permitidos.length === 0) return false

  return permitidos.includes(destinatario.trim().toLowerCase())
}
