import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { entorno } from '@/lib/config/entorno'
import { clienteServicio } from '@/lib/supabase/servicio'

/**
 * Webhook de Resend. Es el camino por el que la realidad entra en la política de
 * supresión sin que nadie tenga que acordarse: un rebote duro o una queja de spam
 * dejan al alumno fuera de la vista de candidatos en el acto.
 *
 * Usa la clave de servicio porque no hay usuario detrás de esta petición, y por eso
 * mismo la firma se verifica **antes** de tocar nada.
 */

export async function POST(request: NextRequest) {
  const env = entorno()

  if (!env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 })
  }

  const cuerpo = await request.text()

  let evento
  try {
    // La verificación necesita el cuerpo crudo: cualquier reserialización del JSON
    // cambia los bytes y tira la firma.
    evento = new Resend(env.RESEND_API_KEY).webhooks.verify({
      payload: cuerpo,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    })
  } catch {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const contenido = evento as unknown as { type: string; data?: Record<string, unknown> }
  const datos = contenido.data ?? {}
  const tipo = contenido.type
  const emailId = typeof datos.email_id === 'string' ? datos.email_id : null

  if (!emailId) return NextResponse.json({ ok: true, ignorado: 'sin email_id' })

  const db = clienteServicio()

  const { data: envio } = await db
    .from('envios')
    .select('id, alumno_id')
    .eq('resend_id', emailId)
    .maybeSingle()

  // Un evento de un email que no salió de aquí no es un error: puede ser una prueba
  // desde el panel de Resend.
  if (!envio) return NextResponse.json({ ok: true, ignorado: 'envío desconocido' })

  const hoy = new Date().toISOString().slice(0, 10)

  switch (tipo) {
    case 'email.delivered':
      await db.from('envios').update({ entregado: true }).eq('id', envio.id)
      break

    case 'email.opened':
      await db.from('envios').update({ abierto_at: hoy }).eq('id', envio.id)
      break

    case 'email.clicked':
      await db.from('envios').update({ click_at: hoy }).eq('id', envio.id)
      break

    case 'email.bounced': {
      await db.from('envios').update({ bounce: true, entregado: false }).eq('id', envio.id)

      /**
       * Un rebote temporal (buzón lleno, servidor caído) no significa que la dirección
       * no exista, y tratarlo como definitivo borraría a un alumno válido para siempre.
       *
       * La condición se escribe al revés —suprimir salvo que sea explícitamente
       * temporal— porque Resend documenta `email.bounced` como "el servidor rechazó el
       * correo de forma permanente". Si algún día el campo `bounce.type` viniera vacío,
       * la lectura correcta de ese evento es permanente; comprobar `=== 'Permanent'`
       * dejaría de suprimir sin que nadie se enterase.
       */
      const rebote = datos.bounce as { type?: string } | undefined
      const temporal = ['temporary', 'transient'].includes(rebote?.type?.toLowerCase() ?? '')

      if (!temporal) {
        await db.from('alumnos').update({ hard_bounce: true }).eq('id', envio.alumno_id)
      }
      break
    }

    case 'email.failed':
      // Fallo de entrega sin veredicto sobre la dirección: se anota, no se suprime.
      await db.from('envios').update({ entregado: false }).eq('id', envio.id)
      break

    case 'email.complained':
      // Marcar spam es definitivo: no se pregunta ni se reintenta.
      await db.from('alumnos').update({ queja_spam: true }).eq('id', envio.alumno_id)
      break

    default:
      return NextResponse.json({ ok: true, ignorado: tipo })
  }

  return NextResponse.json({ ok: true, tipo })
}
