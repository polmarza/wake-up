/**
 * Carga el dataset sintético en Supabase.
 *
 *   pnpm seed
 *
 * Es idempotente: hace upsert por id, así que se puede reejecutar sin duplicar nada.
 * El orden es obligatorio (plantillas → alumnos → envios) por las claves foráneas.
 *
 * Si están definidas ALUMNO_REAL_* añade un alumno más con datos reales, para poder
 * ver un email de verdad en la demo. Es el único registro no sintético de la base.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.SUPABASE_SECRET_KEY

if (!URL || !CLAVE) {
  console.error(
    '\nFaltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.\n' +
      'Cópialas del panel de Supabase (Project Settings → API).\n',
  )
  process.exit(1)
}

const db = createClient(URL, CLAVE, { auth: { persistSession: false } })

// ─── Dataset ──────────────────────────────────────────────────────────────────

type Registro = Record<string, unknown>

const dataset = JSON.parse(
  readFileSync(resolve(process.cwd(), 'supabase/seed/dataset.json'), 'utf-8'),
) as {
  generado_at: string
  aviso: string
  alumnos: Registro[]
  envios: Registro[]
  plantillas: Registro[]
}

/**
 * Campos que vienen en el dataset pero NO se importan porque son derivados: los
 * calcula la base de datos. Guardarlos sería tener dos verdades y que una envejezca.
 */
const DERIVADOS_ALUMNO = ['progreso_pct', 'dias_inactivo', 'segmento']
const DERIVADOS_PLANTILLA = ['tasa_observada']

function sinCampos(registro: Registro, campos: string[]): Registro {
  return Object.fromEntries(Object.entries(registro).filter(([clave]) => !campos.includes(clave)))
}

// ─── Alumno real (opcional) ───────────────────────────────────────────────────

/** Id fijo para que reejecutar el seed lo actualice en vez de duplicarlo. */
const ID_ALUMNO_REAL = '00000000-0000-4000-8000-000000000001'

function hace(dias: number): string {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

function alumnoReal(): Registro | null {
  const email = process.env.ALUMNO_REAL_EMAIL ?? process.env.EMAIL_OPERADOR
  if (!email) return null

  // Perfil elegido a propósito para la demo: abandono tardío, el segmento con mejor
  // tasa histórica (29%). Se quedó a dos sesiones de acabar, hace 22 días — justo por
  // encima del mínimo de 21, así que aparece de los primeros en la cola.
  return {
    id: ID_ALUMNO_REAL,
    nombre: process.env.ALUMNO_REAL_NOMBRE ?? 'Pol',
    apellidos: process.env.ALUMNO_REAL_APELLIDOS ?? 'Marzà',
    email,
    telefono: null,
    idioma: 'es',
    curso_id: 'c_vibe_web',
    curso_nombre: 'Vibe Coding Web',
    cohorte: '2026-2T',
    total_sesiones: 10,
    precio_pagado_eur: 390,
    fuente_captacion: 'organico',
    fecha_alta: hace(120),
    fecha_fin: null,
    estado: 'inactivo',
    ultima_sesion_completada: 8,
    ultima_actividad_at: hace(22),
    motivo_abandono_declarado: 'falta_tiempo',
    canal_preferido: 'email',
    consentimiento_marketing: true,
    consentimiento_at: hace(120),
    opt_out_at: null,
    hard_bounce: false,
    queja_spam: false,
    grupo_experimento: 'tratamiento',
    emails_enviados_total: 0,
    ultimo_envio_at: null,
    reactivado: false,
    reactivado_at: null,
    tipo_reactivacion: null,
  }
}

// ─── Importación ──────────────────────────────────────────────────────────────

async function upsert(tabla: string, filas: Registro[]) {
  const { error } = await db.from(tabla).upsert(filas, { onConflict: 'id' })
  if (error) {
    console.error(`\nError importando ${tabla}: ${error.message}\n`)
    process.exit(1)
  }
  console.log(`  ${tabla.padEnd(12)} ${filas.length} filas`)
}

async function main() {
  console.log(`\nDataset generado el ${dataset.generado_at}`)
  console.log(`${dataset.aviso}\n`)

  const plantillas = dataset.plantillas.map((p) => ({
    ...sinCampos(p, DERIVADOS_PLANTILLA),
    activa: true,
  }))

  const alumnos = dataset.alumnos.map((a) => sinCampos(a, DERIVADOS_ALUMNO))

  const real = alumnoReal()
  if (real) alumnos.push(real)

  // Los envíos históricos ya salieron: su estado es 'enviado', no 'borrador'.
  const envios = dataset.envios.map((e) => ({ ...e, estado_envio: 'enviado' }))

  console.log('Importando:')
  await upsert('plantillas', plantillas)
  await upsert('alumnos', alumnos)
  await upsert('envios', envios)

  if (real) {
    console.log(`\n  Alumno real añadido: ${real.nombre} <${real.email}>`)
    console.log('  Abandono tardío · sesión 8 de 10 · 22 días inactivo')
  } else {
    console.log('\n  Sin alumno real (define EMAIL_OPERADOR o ALUMNO_REAL_EMAIL para añadirlo)')
  }

  await verificar()
}

// ─── Verificación ─────────────────────────────────────────────────────────────
// Un seed que "funciona" pero deja la cola vacía o cuela a un suprimido es peor que
// uno que falla: parece que todo va bien.

async function verificar() {
  console.log('\nVerificando la política de supresión:')

  const { data: candidatos, error } = await db
    .from('candidatos_reactivacion')
    .select('id, segmento_calculado, dias_inactivo')

  if (error) {
    console.error(`\nNo se pudo leer la vista candidatos_reactivacion: ${error.message}\n`)
    process.exit(1)
  }

  if (!candidatos || candidatos.length === 0) {
    console.error(
      '\nLa vista devuelve 0 candidatos. Algo va mal: revisa que las migraciones\n' +
        'estén aplicadas y que las fechas del dataset no hayan quedado obsoletas.\n',
    )
    process.exit(1)
  }

  const { data: suprimidos } = await db
    .from('alumnos')
    .select('id')
    .or(
      'consentimiento_marketing.is.false,opt_out_at.not.is.null,hard_bounce.is.true,' +
        'queja_spam.is.true,reactivado.is.true,estado.eq.baja,grupo_experimento.eq.holdout',
    )

  const idsSuprimidos = new Set((suprimidos ?? []).map((a) => a.id))
  const colados = candidatos.filter((c) => idsSuprimidos.has(c.id))

  if (colados.length > 0) {
    console.error(`\nFALLO GRAVE: ${colados.length} alumnos suprimidos aparecen en la cola.\n`)
    process.exit(1)
  }

  const porSegmento = candidatos.reduce<Record<string, number>>((acc, c) => {
    const clave = String(c.segmento_calculado)
    acc[clave] = (acc[clave] ?? 0) + 1
    return acc
  }, {})

  console.log(`  ${candidatos.length} candidatos elegibles`)
  for (const [segmento, total] of Object.entries(porSegmento).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${segmento.padEnd(20)} ${total}`)
  }
  console.log(`  ${idsSuprimidos.size} alumnos suprimidos, ninguno en la cola`)

  const real = candidatos.find((c) => c.id === ID_ALUMNO_REAL)
  if (real) console.log(`  El alumno real está en la cola (${real.dias_inactivo} días inactivo)`)

  console.log('\nListo.\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
