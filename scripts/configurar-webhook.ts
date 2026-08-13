/**
 * Da de alta el webhook de Resend por API y devuelve la clave de firma.
 *
 *   pnpm tsx scripts/configurar-webhook.ts https://tu-app.vercel.app
 *
 * Alternativa al panel de Resend. La URL tiene que ser **pública y HTTPS**: Resend
 * llama desde sus servidores, así que un `localhost` no le sirve de nada.
 *
 * Solo se dan de alta los eventos que el endpoint sabe manejar. Suscribirse a todos
 * llenaría el log de eventos que se descartan.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { config } from 'dotenv'
import { Resend } from 'resend'

config({ path: '.env.local' })

const EVENTOS = [
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
  'email.failed',
] as const

async function main() {
  const clave = process.env.RESEND_API_KEY
  if (!clave) {
    console.error('\nFalta RESEND_API_KEY en .env.local\n')
    process.exit(1)
  }

  const base = process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL
  if (!base) {
    console.error('\nIndica la URL pública de la app. Ejemplo:')
    console.error('  pnpm tsx scripts/configurar-webhook.ts https://tu-app.vercel.app\n')
    process.exit(1)
  }

  const endpoint = `${base.replace(/\/$/, '')}/api/webhooks/resend`

  if (!endpoint.startsWith('https://')) {
    console.error(`\n${endpoint} no es HTTPS público. Resend llama desde sus servidores:`)
    console.error('despliega primero, o levanta un túnel (ngrok, cloudflared) para probar en local.\n')
    process.exit(1)
  }

  const resend = new Resend(clave)
  const { data, error } = await resend.webhooks.create({ endpoint, events: [...EVENTOS] })

  if (error) {
    console.error(`\nNo se pudo crear el webhook: ${error.message}\n`)
    process.exit(1)
  }

  const secreto = data!.signing_secret

  console.log(`\nWebhook creado: ${data!.id}`)
  console.log(`  endpoint: ${endpoint}`)
  console.log(`  eventos : ${EVENTOS.join(', ')}`)

  // Se guarda en .env.local (ignorado por git) en vez de dejarlo solo por pantalla:
  // una clave que hay que copiar de un scroll de terminal se pierde o acaba pegada
  // donde no debe.
  const ruta = '.env.local'
  if (existsSync(ruta)) {
    const contenido = readFileSync(ruta, 'utf-8')
    if (/^RESEND_WEBHOOK_SECRET=\s*$/m.test(contenido)) {
      writeFileSync(ruta, contenido.replace(/^RESEND_WEBHOOK_SECRET=\s*$/m, `RESEND_WEBHOOK_SECRET=${secreto}`))
      console.log(`\n  Clave de firma guardada en ${ruta}`)
    } else {
      console.log(`\n  ${ruta} ya tenía RESEND_WEBHOOK_SECRET con valor: no se toca.`)
      console.log(`  Clave nueva: ${secreto}`)
    }
  } else {
    console.log(`\nRESEND_WEBHOOK_SECRET=${secreto}`)
  }

  console.log('\nCópiala también al entorno de Vercel y vuelve a desplegar.')
  console.log('Sin esa variable el endpoint responde 503 y no procesa nada.\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
