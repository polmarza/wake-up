import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente para componentes de cliente. Solo usa la clave pública.
 *
 * ── Por qué flujo implícito y no PKCE ──
 *
 * PKCE es el flujo más seguro y sería el elegido si dependiera solo de nosotros: el
 * enlace del correo llega con un `?code=` que hay que canjear usando un verificador
 * guardado en el navegador que pidió el enlace.
 *
 * Ese "el navegador que pidió el enlace" es el problema. En cuanto el correo se abre
 * en otro sitio —otro perfil, la vista web del cliente de correo, el móvil— el
 * verificador no está y el enlace es irrecuperable. Con cuentas de trabajo pasa
 * constantemente, y no hay configuración que lo arregle.
 *
 * Con el flujo implícito la sesión viene entera en el fragmento de la URL, así que el
 * enlace funciona se abra donde se abra. A cambio, los tokens pasan por la barra de
 * direcciones y quedan en el historial del navegador, cosa que con PKCE no ocurre.
 *
 * Para una herramienta interna detrás de una lista blanca es un intercambio
 * razonable, pero **no es la solución definitiva**: esa es cambiar la plantilla de
 * correo a `{{ .TokenHash }}` y usar `/auth/confirm`, que verifica en el servidor y no
 * tiene ninguno de los dos inconvenientes. Cuando esa plantilla esté activa, quita el
 * `flowType` de aquí y se vuelve a PKCE.
 */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: 'implicit' } },
  )
}
