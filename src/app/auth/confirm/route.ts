import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { clienteServidor } from '@/lib/supabase/servidor'

/**
 * Acceso por `token_hash`, que es lo que Supabase recomienda para aplicaciones con
 * servidor.
 *
 * La diferencia con `/auth/callback` no es de estilo. El flujo PKCE guarda un
 * verificador **en el navegador que pidió el enlace** y lo necesita para completar el
 * canje: si el correo abre el enlace en otro navegador, en otro perfil, en la vista
 * web de la aplicación de correo, o si el almacenamiento se limpió por el camino, el
 * canje falla y no hay forma de recuperarlo.
 *
 * Aquí el canje ocurre entero en el servidor. No hay nada que el navegador tenga que
 * haber guardado antes, así que el enlace funciona se abra donde se abra.
 *
 * Requiere cambiar la plantilla de correo en Supabase (Authentication → Email
 * Templates → Magic Link) por:
 *
 *   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Entrar</a>
 */

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const tokenHash = searchParams.get('token_hash')
  const tipo = searchParams.get('type') as EmailOtpType | null
  const destino = searchParams.get('next') ?? '/cola'

  if (!tokenHash || !tipo) {
    return NextResponse.redirect(`${origin}/login?error=sin-codigo`)
  }

  const supabase = await clienteServidor()
  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })

  if (error) {
    // El motivo se pasa tal cual: distinguir "caducado" de "ya usado" ahorra media
    // hora de depuración a quien lo lea.
    const url = new URL(`${origin}/login`)
    url.searchParams.set('error', 'enlace-invalido')
    url.searchParams.set('detalle', error.message)
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(`${origin}${destino}`)
}
