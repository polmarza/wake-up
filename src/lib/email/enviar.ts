import 'server-only'
import { Resend } from 'resend'
import { entorno, puedeEnviarDeVerdad, destinatariosRealesPermitidos } from '@/lib/config/entorno'
import { renderHtml, renderTexto } from './render'

/**
 * Envío real. Todo lo que llega aquí ya pasó por la aprobación humana; esta capa
 * solo se ocupa de que no salga nada que no deba.
 *
 * El guardarraíl está aquí y no en la interfaz porque la interfaz cambia y esto no:
 * ninguna ruta de la aplicación puede mandar un email a una dirección del dataset.
 */

export type ResultadoEnvio =
  | { enviado: true; resendId: string }
  | { enviado: false; motivo: string }

export async function enviarEmail(parametros: {
  destinatario: string
  asunto: string
  cuerpo: string
  bajaToken: string
}): Promise<ResultadoEnvio> {
  const env = entorno()

  if (!env.ENVIO_REAL_HABILITADO) {
    return { enviado: false, motivo: 'El envío real está desactivado (ENVIO_REAL_HABILITADO=false)' }
  }

  if (!puedeEnviarDeVerdad(parametros.destinatario)) {
    const permitidos = destinatariosRealesPermitidos()
    return {
      enviado: false,
      motivo:
        permitidos.length === 0
          ? 'No hay ninguna dirección autorizada para envíos reales'
          : `Solo se puede enviar de verdad a ${permitidos.join(' o ')}, nunca a una dirección del dataset`,
    }
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return { enviado: false, motivo: 'Faltan RESEND_API_KEY o RESEND_FROM' }
  }

  const resend = new Resend(env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: parametros.destinatario,
    subject: parametros.asunto,
    html: renderHtml(parametros.cuerpo, parametros.bajaToken),
    text: renderTexto(parametros.cuerpo, parametros.bajaToken),
  })

  if (error) return { enviado: false, motivo: error.message }
  if (!data) return { enviado: false, motivo: 'Resend no devolvió identificador' }

  return { enviado: true, resendId: data.id }
}
