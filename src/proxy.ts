import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { listaDeAcceso, correoPermitido } from '@/lib/config/acceso'

/**
 * Refresca la sesión y protege todo lo que no sea explícitamente público.
 *
 * Públicos: el login, la callback de OAuth, la página de baja (tiene que funcionar
 * sin cuenta) y los endpoints que consumen terceros (cron y webhook), que llevan su
 * propia autenticación.
 */

const RUTAS_PUBLICAS = ['/login', '/auth/callback', '/auth/confirm', '/baja', '/api/cron', '/api/webhooks']

export async function proxy(request: NextRequest) {
  const respuesta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            respuesta.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname
  const esPublica = RUTAS_PUBLICAS.some((publica) => ruta.startsWith(publica))

  if (esPublica) return respuesta

  if (!user) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    return NextResponse.redirect(destino)
  }

  // Lista blanca: aunque alguien consiga un enlace mágico válido, si su correo no
  // está en el equipo no entra. Admite direcciones sueltas y dominios enteros.
  const permitidos = listaDeAcceso(process.env.EMAILS_PERMITIDOS)

  if (!correoPermitido(user.email ?? '', permitidos)) {
    await supabase.auth.signOut()
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    // Se distinguen los dos casos porque se arreglan de forma distinta: uno es que no
    // eres del equipo; el otro, que nadie configuró la variable y no entra nadie.
    destino.searchParams.set('error', permitidos.length === 0 ? 'sin-lista' : 'no-autorizado')
    return NextResponse.redirect(destino)
  }

  return respuesta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
