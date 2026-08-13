import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { entorno } from '@/lib/config/entorno'

/**
 * Cliente para Server Components y Server Actions. Respeta el RLS: solo ve lo que
 * puede ver el usuario autenticado.
 */
export async function clienteServidor() {
  const env = entorno()
  const almacen = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return almacen.getAll()
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) => {
            almacen.set(name, value, options)
          })
        } catch {
          // Server Component: la sesión la refresca el middleware, no pasa nada.
        }
      },
    },
  })
}
