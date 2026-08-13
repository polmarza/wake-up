/**
 * Diagnóstico del enlace mágico de acceso.
 *
 *   pnpm tsx scripts/probar-login.ts [correo]
 *
 * El correo de acceso NO lo manda Resend: lo manda Supabase Auth con su propio
 * servicio de email. Este script pide el enlace por la misma vía que la pantalla de
 * login y enseña el error tal cual viene de la API, que es lo que la interfaz oculta
 * a propósito (para no revelar quién pertenece al equipo).
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !clave) {
    console.error('\nFaltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\n')
    process.exit(1)
  }

  const correo = process.argv[2] ?? process.env.EMAIL_OPERADOR
  if (!correo) {
    console.error('\nIndica un correo, o rellena EMAIL_OPERADOR en .env.local\n')
    process.exit(1)
  }

  console.log(`\nPidiendo enlace mágico para ${correo}…`)

  const supabase = createClient(url, clave)
  const inicio = Date.now()
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  })
  const ms = Date.now() - inicio

  if (error) {
    console.log(`\n❌ La API lo rechazó (${ms} ms)`)
    console.log(`   status : ${error.status}`)
    console.log(`   code   : ${error.code}`)
    console.log(`   message: ${error.message}\n`)
    process.exit(1)
  }

  console.log(`\n✅ Supabase aceptó la petición (${ms} ms).`)
  console.log('   Si el correo no llega, el problema está en la entrega, no en la aplicación:')
  console.log('   el servicio de email integrado de Supabase limita a unos pocos correos por hora')
  console.log('   y no está pensado para producción. La solución es configurar SMTP propio.\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
