/**
 * Añade personas reales del equipo como alumnos de la cola, para que en una demo
 * puedan recibir el email en su propio buzón.
 *
 *   pnpm tsx scripts/anadir-alumnos-demo.ts ana@learningheroes.com juan@learningheroes.com
 *
 * Cada uno recibe un perfil distinto —segmento, curso, sesión donde lo dejó, motivo—
 * para que la cola enseñe variedad en vez de cuatro filas clonadas. Los ids son
 * deterministas, así que reejecutarlo actualiza en vez de duplicar.
 *
 * Para que además puedan recibir correo de verdad, su dirección tiene que estar
 * autorizada en EMAIL_OPERADOR o ALUMNO_REAL_EMAIL (admiten dominios enteros).
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

/**
 * Perfiles pensados para que cada uno enseñe un caso distinto del producto: el que
 * casi acabó, el que ya terminó (upsell), el que nunca entró y el que lo dejó por
 * dinero, que es donde se ve que el sistema no ofrece descuentos.
 */
const PERFILES = [
  {
    curso_id: 'c_vibe_web',
    curso_nombre: 'Vibe Coding Web',
    total_sesiones: 10,
    ultima_sesion_completada: 8,
    estado: 'inactivo',
    motivo_abandono_declarado: 'falta_tiempo',
    dias: 24,
    precio: 390,
  },
  {
    curso_id: 'c_data_sql',
    curso_nombre: 'Datos y SQL desde Cero',
    total_sesiones: 12,
    ultima_sesion_completada: 12,
    estado: 'completado',
    motivo_abandono_declarado: null,
    dias: 28,
    precio: 450,
  },
  {
    curso_id: 'c_ia_prod',
    curso_nombre: 'IA para Producto',
    total_sesiones: 8,
    ultima_sesion_completada: 0,
    estado: 'inactivo',
    motivo_abandono_declarado: 'problema_tecnico',
    dias: 35,
    precio: 290,
  },
  {
    curso_id: 'c_n8n',
    curso_nombre: 'Automatizaciones con n8n',
    total_sesiones: 6,
    ultima_sesion_completada: 3,
    estado: 'inactivo',
    motivo_abandono_declarado: 'economico',
    dias: 41,
    precio: 230,
  },
]

function hace(dias: number): string {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

/** "marinam@learningheroes.com" → "Marinam". Se puede forzar con "Marina:correo". */
function nombreDesde(entrada: string): { nombre: string; email: string } {
  const [quizaNombre, quizaCorreo] = entrada.split(':')
  if (quizaCorreo) return { nombre: quizaNombre, email: quizaCorreo }
  const local = entrada.split('@')[0].replace(/[._-]+/g, ' ')
  return { nombre: local.charAt(0).toUpperCase() + local.slice(1), email: entrada }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SECRET_KEY

  if (!url || !clave) {
    console.error('\nFaltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local\n')
    process.exit(1)
  }

  const entradas = process.argv.slice(2)
  if (entradas.length === 0) {
    console.error('\nIndica al menos un correo:')
    console.error('  pnpm tsx scripts/anadir-alumnos-demo.ts ana@learningheroes.com\n')
    process.exit(1)
  }

  const db = createClient(url, clave, { auth: { persistSession: false } })

  const filas = entradas.map((entrada, indice) => {
    const { nombre, email } = nombreDesde(entrada)
    const perfil = PERFILES[indice % PERFILES.length]

    return {
      // Id determinista: reejecutar actualiza en vez de duplicar.
      id: `00000000-0000-4000-8000-${String(indice + 10).padStart(12, '0')}`,
      nombre,
      apellidos: '(equipo)',
      email,
      telefono: null,
      idioma: 'es',
      curso_id: perfil.curso_id,
      curso_nombre: perfil.curso_nombre,
      cohorte: '2026-2T',
      total_sesiones: perfil.total_sesiones,
      precio_pagado_eur: perfil.precio,
      fuente_captacion: 'organico',
      fecha_alta: hace(perfil.dias + 90),
      fecha_fin: perfil.estado === 'completado' ? hace(perfil.dias) : null,
      estado: perfil.estado,
      ultima_sesion_completada: perfil.ultima_sesion_completada,
      ultima_actividad_at: hace(perfil.dias),
      motivo_abandono_declarado: perfil.motivo_abandono_declarado,
      canal_preferido: 'email',
      consentimiento_marketing: true,
      consentimiento_at: hace(perfil.dias + 90),
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
  })

  const { error } = await db.from('alumnos').upsert(filas, { onConflict: 'id' })
  if (error) {
    console.error(`\nNo se pudieron añadir: ${error.message}\n`)
    process.exit(1)
  }

  console.log(`\n${filas.length} alumnos del equipo añadidos:\n`)
  for (const fila of filas) {
    const progreso = `${fila.ultima_sesion_completada}/${fila.total_sesiones}`
    console.log(
      `  ${fila.nombre.padEnd(10)} ${fila.email.padEnd(32)} ${fila.curso_nombre.padEnd(26)} ` +
        `sesión ${progreso.padEnd(6)} ${fila.motivo_abandono_declarado ?? 'sin motivo'}`,
    )
  }

  const { data: enCola } = await db
    .from('candidatos_reactivacion')
    .select('email, segmento_calculado, dias_inactivo')
    .in(
      'email',
      filas.map((fila) => fila.email),
    )

  console.log(`\nEn la cola: ${enCola?.length ?? 0} de ${filas.length}`)
  for (const fila of enCola ?? []) {
    console.log(`  ${fila.email.padEnd(32)} ${fila.segmento_calculado.padEnd(20)} ${fila.dias_inactivo} días`)
  }
  console.log('')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
