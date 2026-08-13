'use server'

import { revalidatePath } from 'next/cache'
import { clienteServidor } from '@/lib/supabase/servidor'
import { obtenerCandidato, borradorPendiente } from '@/lib/candidatos/consultas'
import { plantillasDeSegmento } from '@/lib/plantillas/consultas'
import { elegirPlantilla } from '@/lib/bandit/thompson'
import { generarBorrador, PROMPT_VERSION } from '@/lib/generacion/generar'
import { enviarEmail } from '@/lib/email/enviar'

/**
 * Las mutaciones de la cola. Todas pasan por aquí, y todas terminan en una función
 * de base de datos cuando tocan contadores: así el bandit no se puede falsear desde
 * la interfaz y la aprobación revalida la elegibilidad en la misma transacción.
 */

export type Respuesta = { ok: true; mensaje?: string } | { ok: false; error: string }

export async function generarBorradorAccion(
  alumnoId: string,
  instruccionExtra?: string,
): Promise<Respuesta> {
  try {
    const candidato = await obtenerCandidato(alumnoId)
    if (!candidato) {
      return { ok: false, error: 'El alumno ya no es elegible: se dio de baja, rebotó o agotó sus intentos' }
    }

    const plantillas = await plantillasDeSegmento(candidato.segmento_calculado)
    const { elegida } = elegirPlantilla(plantillas)

    const { borrador, modelo, reintentado } = await generarBorrador(candidato, elegida, instruccionExtra)

    const supabase = await clienteServidor()
    const pendiente = await borradorPendiente(alumnoId)

    const fila = {
      alumno_id: alumnoId,
      plantilla_id: elegida.id,
      segmento: candidato.segmento_calculado,
      canal: 'email',
      asunto: borrador.asunto,
      cuerpo: borrador.cuerpo,
      modelo_generador: modelo,
      prompt_version: PROMPT_VERSION,
      estado_envio: 'borrador',
      editado_por_humano: false,
    }

    const { error } = pendiente
      ? await supabase.from('envios').update(fila).eq('id', pendiente.id)
      : await supabase.from('envios').insert(fila)

    if (error) return { ok: false, error: `No se pudo guardar el borrador: ${error.message}` }

    revalidatePath(`/cola/${alumnoId}`)
    return {
      ok: true,
      mensaje: reintentado ? 'Generado (hizo falta un reintento: el primer intento no pasó la validación)' : undefined,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

export async function guardarEdicionAccion(
  envioId: string,
  asunto: string,
  cuerpo: string,
): Promise<Respuesta> {
  const supabase = await clienteServidor()

  const { error } = await supabase
    .from('envios')
    .update({ asunto, cuerpo, editado_por_humano: true })
    .eq('id', envioId)
    .eq('estado_envio', 'borrador')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Aprobar. La función de base de datos revalida la elegibilidad, mueve el estado,
 * incrementa los contadores del alumno y el denominador del bandit — todo o nada.
 *
 * El envío real se intenta *después* de que el registro esté cerrado: si Resend
 * falla, el envío consta igualmente y el operador ve el motivo, en lugar de quedar
 * un alumno en un estado a medias.
 */
export async function aprobarAccion(
  envioId: string,
  alumnoId: string,
  intentarEnvioReal: boolean,
): Promise<Respuesta> {
  const supabase = await clienteServidor()

  const { data: envio, error: errorLectura } = await supabase
    .from('envios')
    .select('asunto, cuerpo')
    .eq('id', envioId)
    .single()

  if (errorLectura || !envio) return { ok: false, error: 'No se encontró el borrador' }

  const { error } = await supabase.rpc('aprobar_envio', {
    p_envio_id: envioId,
    p_envio_real: intentarEnvioReal,
  })

  if (error) return { ok: false, error: error.message }

  let mensaje = 'Envío registrado'

  if (intentarEnvioReal) {
    const { data: alumno } = await supabase
      .from('alumnos')
      .select('email, baja_token')
      .eq('id', alumnoId)
      .single()

    if (alumno) {
      const resultado = await enviarEmail({
        destinatario: alumno.email,
        asunto: envio.asunto ?? '',
        cuerpo: envio.cuerpo ?? '',
        bajaToken: alumno.baja_token,
      })

      if (resultado.enviado) {
        await supabase.from('envios').update({ resend_id: resultado.resendId }).eq('id', envioId)
        mensaje = 'Enviado de verdad y registrado'
      } else {
        await supabase.from('envios').update({ envio_real: false }).eq('id', envioId)
        mensaje = `Registrado, pero no salió: ${resultado.motivo}`
      }
    }
  }

  revalidatePath('/cola')
  revalidatePath(`/cola/${alumnoId}`)
  return { ok: true, mensaje }
}

/** Descartar no consume intento: el alumno vuelve a la cola en el siguiente ciclo. */
export async function descartarAccion(
  envioId: string,
  alumnoId: string,
  motivo: string,
): Promise<Respuesta> {
  const supabase = await clienteServidor()

  const { error } = await supabase.rpc('descartar_envio', { p_envio_id: envioId, p_motivo: motivo })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/cola')
  revalidatePath(`/cola/${alumnoId}`)
  return { ok: true, mensaje: 'Descartado. No ha consumido ningún intento.' }
}

/**
 * Prueba en el buzón del operador. No toca ningún contador ni cambia el estado del
 * borrador: es solo ver cómo queda el email en un cliente de correo real.
 */
export async function probarEnMiBuzonAccion(envioId: string): Promise<Respuesta> {
  const supabase = await clienteServidor()

  const { data: envio, error } = await supabase
    .from('envios')
    .select('asunto, cuerpo, alumno_id, alumnos(email, baja_token)')
    .eq('id', envioId)
    .single()

  if (error || !envio) return { ok: false, error: 'No se encontró el borrador' }

  const alumno = envio.alumnos as unknown as { email: string; baja_token: string } | null
  if (!alumno) return { ok: false, error: 'No se encontró el alumno' }

  const resultado = await enviarEmail({
    destinatario: alumno.email,
    asunto: envio.asunto ?? '',
    cuerpo: envio.cuerpo ?? '',
    bajaToken: alumno.baja_token,
  })

  return resultado.enviado
    ? { ok: true, mensaje: 'Enviado a tu buzón' }
    : { ok: false, error: resultado.motivo }
}
