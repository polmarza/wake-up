import { describe, it, expect, afterEach, vi } from 'vitest'

/**
 * El guardarraíl de envío real. Es la única barrera entre un borrador y la bandeja de
 * entrada de alguien, así que se prueba a conciencia: los correos del dataset son
 * @example.com y no deben salir jamás.
 */

const ENTORNO_BASE = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ejemplo.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  RESEND_API_KEY: 're_test',
  RESEND_FROM: 'hola@ejemplo.com',
  ENVIO_REAL_HABILITADO: 'true',
  EMAIL_OPERADOR: 'operador@ejemplo.com',
  ALUMNO_REAL_EMAIL: 'alumno.real@ejemplo.com',
}

const original = { ...process.env }

async function cargar(cambios: Record<string, string | undefined> = {}) {
  process.env = { ...original, ...ENTORNO_BASE, ...cambios } as NodeJS.ProcessEnv
  // El módulo cachea la configuración validada: hay que descargarlo en cada caso.
  vi.resetModules()
  return import('@/lib/config/entorno')
}

afterEach(() => {
  process.env = { ...original }
})

describe('puedeEnviarDeVerdad', () => {
  it('deja pasar el buzón del operador', async () => {
    const { puedeEnviarDeVerdad } = await cargar()
    expect(puedeEnviarDeVerdad('operador@ejemplo.com')).toBe(true)
  })

  it('deja pasar el correo del alumno real', async () => {
    const { puedeEnviarDeVerdad } = await cargar()
    expect(puedeEnviarDeVerdad('alumno.real@ejemplo.com')).toBe(true)
  })

  it('no distingue mayúsculas ni espacios sobrantes', async () => {
    const { puedeEnviarDeVerdad } = await cargar()
    expect(puedeEnviarDeVerdad('  Operador@Ejemplo.COM ')).toBe(true)
  })

  it('bloquea cualquier dirección del dataset', async () => {
    const { puedeEnviarDeVerdad } = await cargar()
    expect(puedeEnviarDeVerdad('laura.aranda@example.com')).toBe(false)
  })

  it('bloquea todo si el interruptor está desactivado', async () => {
    const { puedeEnviarDeVerdad } = await cargar({ ENVIO_REAL_HABILITADO: 'false' })
    expect(puedeEnviarDeVerdad('operador@ejemplo.com')).toBe(false)
  })

  it('bloquea todo si falta la clave de Resend', async () => {
    const { puedeEnviarDeVerdad } = await cargar({ RESEND_API_KEY: undefined })
    expect(puedeEnviarDeVerdad('operador@ejemplo.com')).toBe(false)
  })

  it('acepta un dominio entero en la lista de destinatarios reales', async () => {
    const { puedeEnviarDeVerdad } = await cargar({
      EMAIL_OPERADOR: 'operador@ejemplo.com',
      ALUMNO_REAL_EMAIL: '@learningheroes.com',
    })
    expect(puedeEnviarDeVerdad('quien.sea@learningheroes.com')).toBe(true)
    expect(puedeEnviarDeVerdad('otra@learningheroes.com')).toBe(true)
  })

  it('un dominio permitido no abre la puerta a las direcciones del dataset', async () => {
    const { puedeEnviarDeVerdad } = await cargar({
      EMAIL_OPERADOR: undefined,
      ALUMNO_REAL_EMAIL: '@learningheroes.com',
    })
    expect(puedeEnviarDeVerdad('laura.aranda@example.com')).toBe(false)
    // Ni a un dominio que solo se le parece.
    expect(puedeEnviarDeVerdad('intruso@falsolearningheroes.com')).toBe(false)
  })

  it('bloquea todo si no hay ninguna dirección permitida configurada', async () => {
    const { puedeEnviarDeVerdad } = await cargar({
      EMAIL_OPERADOR: undefined,
      ALUMNO_REAL_EMAIL: undefined,
    })
    expect(puedeEnviarDeVerdad('quien.sea@ejemplo.com')).toBe(false)
  })
})

describe('motivoNoEnviable', () => {
  it('no da motivo cuando todo está en orden', async () => {
    const { motivoNoEnviable } = await cargar()
    expect(motivoNoEnviable('operador@ejemplo.com')).toBeNull()
  })

  it('acepta una dirección cubierta por un dominio autorizado', async () => {
    // El caso que rompió un envío de verdad: la lista contiene el dominio, no la
    // dirección, y comparar con includes() nunca casa.
    const { motivoNoEnviable } = await cargar({
      EMAIL_OPERADOR: undefined,
      ALUMNO_REAL_EMAIL: '@learningheroes.com',
    })
    expect(motivoNoEnviable('polm@learningheroes.com')).toBeNull()
  })

  it('nombra la credencial que falta, en vez de culpar a la dirección', async () => {
    const { motivoNoEnviable } = await cargar({ RESEND_API_KEY: undefined })
    expect(motivoNoEnviable('operador@ejemplo.com')).toContain('RESEND_API_KEY')
  })

  it('nombra el interruptor cuando el envío real está desactivado', async () => {
    const { motivoNoEnviable } = await cargar({ ENVIO_REAL_HABILITADO: 'false' })
    expect(motivoNoEnviable('operador@ejemplo.com')).toContain('ENVIO_REAL_HABILITADO')
  })

  it('dice que la dirección no está autorizada cuando de verdad no lo está', async () => {
    const { motivoNoEnviable } = await cargar()
    expect(motivoNoEnviable('laura.aranda@example.com')).toContain('no está autorizada')
  })
})
