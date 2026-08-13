import { describe, it, expect, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

/**
 * La política de supresión es lo único de este proyecto cuyo fallo es irreversible:
 * un email enviado no se recupera y un exalumno que marca spam no vuelve.
 *
 * Estos tests van contra la base de datos a propósito. La política vive en la vista
 * `candidatos_reactivacion`, así que probar una reimplementación en TypeScript no
 * demostraría nada: comprobaría que dos copias de la regla coinciden, no que la regla
 * que se aplica de verdad es correcta.
 *
 * Requieren SUPABASE_TEST_URL y SUPABASE_TEST_SECRET_KEY (una base de datos de
 * test, nunca la de desarrollo). Sin ellas, la suite se salta con un aviso.
 */

const URL = process.env.SUPABASE_TEST_URL
const CLAVE = process.env.SUPABASE_TEST_SECRET_KEY
const hayBaseDeDatos = Boolean(URL && CLAVE)

const alumnoBase = {
  nombre: 'Test',
  apellidos: 'Supresión',
  idioma: 'es',
  curso_id: 'c_test',
  curso_nombre: 'Curso de prueba',
  total_sesiones: 10,
  fecha_alta: '2025-01-01',
  estado: 'inactivo',
  ultima_sesion_completada: 4,
  consentimiento_marketing: true,
  grupo_experimento: 'tratamiento',
  emails_enviados_total: 0,
  hard_bounce: false,
  queja_spam: false,
  reactivado: false,
}

function hace(dias: number): string {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

describe.skipIf(!hayBaseDeDatos)('política de supresión', () => {
  let db: SupabaseClient
  const creados: string[] = []

  beforeAll(() => {
    db = createClient(URL!, CLAVE!, { auth: { persistSession: false } })
  })

  /** Crea un alumno con la variación indicada y responde si aparece en la cola. */
  async function apareceEnLaCola(variacion: Record<string, unknown>): Promise<boolean> {
    const email = `test-${crypto.randomUUID()}@example.com`
    const { data, error } = await db
      .from('alumnos')
      .insert({ ...alumnoBase, email, ultima_actividad_at: hace(60), ...variacion })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    creados.push(data.id)

    const { data: candidato } = await db
      .from('candidatos_reactivacion')
      .select('id')
      .eq('id', data.id)
      .maybeSingle()

    return candidato !== null
  }

  it('incluye a un alumno elegible', async () => {
    expect(await apareceEnLaCola({})).toBe(true)
  })

  it('excluye a quien no dio consentimiento de marketing', async () => {
    expect(await apareceEnLaCola({ consentimiento_marketing: false })).toBe(false)
  })

  it('excluye a quien se dio de baja', async () => {
    expect(await apareceEnLaCola({ opt_out_at: hace(5) })).toBe(false)
  })

  it('excluye a quien tiene rebote duro', async () => {
    expect(await apareceEnLaCola({ hard_bounce: true })).toBe(false)
  })

  it('excluye a quien marcó spam', async () => {
    expect(await apareceEnLaCola({ queja_spam: true })).toBe(false)
  })

  it('excluye a quien ya se reactivó', async () => {
    expect(await apareceEnLaCola({ reactivado: true })).toBe(false)
  })

  it('excluye a quien está de baja en la escuela', async () => {
    expect(await apareceEnLaCola({ estado: 'baja' })).toBe(false)
  })

  it('excluye al grupo de control (holdout)', async () => {
    expect(await apareceEnLaCola({ grupo_experimento: 'holdout' })).toBe(false)
  })

  it('excluye a quien sigue activo: menos de 21 días de inactividad', async () => {
    expect(await apareceEnLaCola({ ultima_actividad_at: hace(20) })).toBe(false)
  })

  it('incluye justo en el umbral de 21 días', async () => {
    expect(await apareceEnLaCola({ ultima_actividad_at: hace(21) })).toBe(true)
  })

  it('excluye a quien recibió un email hace menos de 14 días (cooldown)', async () => {
    expect(await apareceEnLaCola({ ultimo_envio_at: hace(13), emails_enviados_total: 1 })).toBe(
      false,
    )
  })

  it('incluye justo en el umbral de 14 días de cooldown', async () => {
    expect(await apareceEnLaCola({ ultimo_envio_at: hace(14), emails_enviados_total: 1 })).toBe(true)
  })

  it('excluye a quien agotó el techo de 3 intentos', async () => {
    expect(await apareceEnLaCola({ emails_enviados_total: 3, ultimo_envio_at: hace(30) })).toBe(
      false,
    )
  })

  it('sobre el dataset completo, ningún alumno del holdout está en la cola', async () => {
    const { data: enCola } = await db
      .from('candidatos_reactivacion')
      .select('id, grupo_experimento')

    expect(enCola).not.toBeNull()
    expect(enCola!.every((c) => c.grupo_experimento === 'tratamiento')).toBe(true)
  })
})

describe.skipIf(hayBaseDeDatos)('política de supresión (omitida)', () => {
  it('avisa de que no hay base de datos de test configurada', () => {
    console.warn(
      '\n  Tests de supresión omitidos: faltan SUPABASE_TEST_URL y ' +
        'SUPABASE_TEST_SECRET_KEY en .env.local.\n' +
        '  Son los tests más importantes del proyecto: configúralos antes de producción.\n',
    )
    expect(hayBaseDeDatos).toBe(false)
  })
})
