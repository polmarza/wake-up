/**
 * Prueba la generación de punta a punta contra la API real, sin pasar por la interfaz.
 *
 *   pnpm tsx scripts/probar-generacion.ts            → un candidato al azar
 *   pnpm tsx scripts/probar-generacion.ts <email>    → un candidato concreto
 *
 * No escribe nada en la base de datos y no envía ningún email: solo lee un candidato,
 * deja que el bandit elija plantilla y enseña lo que escribiría Claude.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { elegirPlantilla, tasaEsperada, type PlantillaBandit } from '../src/lib/bandit/thompson'
import { generarBorrador } from '../src/lib/generacion/generar'
import { validarBorrador } from '../src/lib/generacion/esquema'
import type { Candidato } from '../src/lib/candidatos/consultas'

config({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.SUPABASE_SECRET_KEY

if (!URL || !CLAVE) {
  console.error('\nFaltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local\n')
  process.exit(1)
}

const db = createClient(URL, CLAVE, { auth: { persistSession: false } })

async function main() {
  const email = process.argv[2]

  let consulta = db.from('candidatos_reactivacion').select('*')
  if (email) consulta = consulta.eq('email', email)

  const { data, error } = await consulta.limit(email ? 1 : 5)

  if (error) {
    console.error(`\nNo se pudo leer la cola: ${error.message}\n`)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.error(`\nNo hay candidatos${email ? ` con el correo ${email}` : ''}.\n`)
    process.exit(1)
  }

  const candidato = data[Math.floor(data.length / 2)] as Candidato

  const { data: plantillas } = await db
    .from('plantillas')
    .select('id, segmento, tono, longitud, cta, asunto_patron, activa, envios, reactivaciones, alpha, beta')
    .eq('segmento', candidato.segmento_calculado)

  const { elegida, muestras } = elegirPlantilla((plantillas ?? []) as PlantillaBandit[])

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${candidato.nombre} ${candidato.apellidos} · ${candidato.email}`)
  console.log(
    `${candidato.segmento_calculado} · ${candidato.curso_nombre} · ` +
      `sesión ${candidato.ultima_sesion_completada}/${candidato.total_sesiones} · ` +
      `${candidato.dias_inactivo} días inactivo · ` +
      `motivo: ${candidato.motivo_abandono_declarado || 'no declarado'} · idioma: ${candidato.idioma}`,
  )

  console.log(`\nThompson sampling:`)
  for (const muestra of muestras) {
    const marca = muestra.id === elegida.id ? '→' : ' '
    console.log(
      `  ${marca} ${muestra.id.padEnd(26)} α${String(muestra.alpha).padStart(3)} β${String(muestra.beta).padStart(3)}` +
        `  esperada ${(tasaEsperada(muestra) * 100).toFixed(1).padStart(5)}%  muestra ${muestra.muestra.toFixed(4)}`,
    )
  }

  console.log(`\nGenerando con ${process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'}…`)
  const inicio = Date.now()
  const { borrador, reintentado } = await generarBorrador(candidato, elegida)
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1)

  console.log(`${'─'.repeat(72)}`)
  console.log(`ASUNTO: ${borrador.asunto}`)
  console.log(`${'─'.repeat(72)}`)
  console.log(borrador.cuerpo)
  console.log(`${'─'.repeat(72)}`)

  const problemas = validarBorrador(borrador)
  console.log(
    `${segundos}s · ${borrador.cuerpo.split(/\s+/).length} palabras · ` +
      `validación: ${problemas.length === 0 ? 'limpia' : problemas.map((p) => `${p.campo} ${p.problema}`).join('; ')}` +
      `${reintentado ? ' · hizo falta un reintento' : ''}\n`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
