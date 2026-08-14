import 'server-only'
import { Resend } from 'resend'
import { entorno, motivoNoEnviable } from '@/lib/config/entorno'
import { renderHtml, renderTexto, type Contexto } from './render'

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
  contexto: Contexto
}): Promise<ResultadoEnvio> {
  const impedimento = motivoNoEnviable(parametros.destinatario)
  if (impedimento) return { enviado: false, motivo: impedimento }

  const env = entorno()
  const resend = new Resend(env.RESEND_API_KEY!)

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM!,
    to: parametros.destinatario,
    subject: parametros.asunto,
    html: renderHtml(parametros.cuerpo, parametros.contexto),
    text: renderTexto(parametros.cuerpo, parametros.contexto),
  })

  if (error) return { enviado: false, motivo: error.message }
  if (!data) return { enviado: false, motivo: 'Resend no devolvió identificador' }

  return { enviado: true, resendId: data.id }
}
