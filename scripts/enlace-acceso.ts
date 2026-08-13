/**
 * Genera un enlace de acceso y lo imprime por consola, sin pasar por el correo.
 *
 *   pnpm tsx scripts/enlace-acceso.ts [correo]
 *
 * Para cuando el servicio de email integrado de Supabase está limitando los envíos:
 * usa la API de administración con la clave secreta y devuelve el mismo enlace que
 * te habría llegado por correo.
 *
 * El enlace es de un solo uso y caduca. No lo pegues en ningún chat ni lo compartas:
 * quien lo tenga entra con tu cuenta.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SECRET_KEY

  if (!url || !clave) {
    console.error('\nFaltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local\n')
    process.exit(1)
  }

  const correo = process.argv[2] ?? process.env.EMAIL_OPERADOR
  if (!correo) {
    console.error('\nIndica un correo, o rellena EMAIL_OPERADOR en .env.local\n')
    process.exit(1)
  }

  const permitidos = (process.env.EMAILS_PERMITIDOS ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)

  if (permitidos.length > 0 && !permitidos.includes(correo.toLowerCase())) {
    console.error(
      `\n${correo} no está en EMAILS_PERMITIDOS, así que el middleware lo echaría nada más entrar.\n` +
        `Añádelo a la lista o usa uno de estos: ${permitidos.join(', ')}\n`,
    )
    process.exit(1)
  }

  const supabase = createClient(url, clave, { auth: { persistSession: false } })

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: correo,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback` },
  })

  if (error) {
    console.error(`\nNo se pudo generar el enlace: ${error.message}\n`)
    process.exit(1)
  }

  console.log(`\nEnlace de acceso para ${correo} (un solo uso, no lo compartas):\n`)
  console.log(data.properties.action_link)
  console.log('')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
