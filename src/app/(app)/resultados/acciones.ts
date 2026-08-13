'use server'

import { revalidatePath } from 'next/cache'
import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * Registrar que un alumno volvió. Es el paso que cierra el ciclo: la función de base
 * de datos marca la reactivación y **recalcula los priors de la plantilla que se usó**
 * en la misma transacción, que es lo que hace que el bandit aprenda.
 *
 * Es idempotente: registrar dos veces el mismo resultado no suma dos veces.
 */
export async function registrarResultadoAccion(
  envioId: string,
  tipo: 'reinscripcion' | 'respuesta_email' | 'login',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await clienteServidor()

  const { error } = await supabase.rpc('registrar_resultado', { p_envio_id: envioId, p_tipo: tipo })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/resultados')
  revalidatePath('/seguimiento')
  revalidatePath('/cola')
  return { ok: true }
}
