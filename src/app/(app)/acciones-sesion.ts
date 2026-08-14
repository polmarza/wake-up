'use server'

import { redirect } from 'next/navigation'
import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * Cerrar sesión. Es una acción de servidor y no una llamada desde el navegador
 * porque la sesión vive en cookies: borrarla desde el servidor es lo que garantiza
 * que no queda una cookie huérfana con la que el `proxy` siga dejando pasar.
 */
export async function cerrarSesionAccion() {
  const supabase = await clienteServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
