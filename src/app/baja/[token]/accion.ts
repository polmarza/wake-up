'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { entorno } from '@/lib/config/entorno'

/**
 * Baja pública. Va con la clave publicable —rol `anon`— a propósito: esta operación
 * no necesita ningún privilegio, y usar la clave de servicio aquí sería darle a una
 * ruta pública mucho más poder del que su trabajo requiere.
 *
 * La función `baja_por_token` es `security definer`, no devuelve datos y responde
 * igual con un token válido que con uno inventado.
 */
export async function darDeBajaAccion(datos: FormData) {
  const token = String(datos.get('token') ?? '')
  const env = entorno()

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  })

  // Un token con formato inválido no llega ni a la base de datos, pero la respuesta
  // al usuario es la misma: no se le confirma si el token existía o no.
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
  if (esUuid) {
    await supabase.rpc('baja_por_token', { p_token: token })
  }

  redirect(`/baja/${token}?hecho=1`)
}
