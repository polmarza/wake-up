import { createBrowserClient } from '@supabase/ssr'

/** Cliente para componentes de cliente. Solo usa la clave pública. */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
