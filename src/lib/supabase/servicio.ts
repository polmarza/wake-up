import { createClient } from '@supabase/supabase-js'
import { entorno } from '@/lib/config/entorno'

/**
 * Cliente con la clave de servicio. **Salta el RLS.**
 *
 * Solo para el seed, el cron y el webhook de Resend. Nunca debe importarse desde un
 * componente que se renderice en el cliente: la clave no puede salir del servidor.
 */
export function clienteServicio() {
  const env = entorno()

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
