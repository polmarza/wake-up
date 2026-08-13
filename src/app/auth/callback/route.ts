import { NextResponse, type NextRequest } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'

/** Canjea el código del enlace mágico por una sesión y entra en la cola. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const codigo = searchParams.get('code')

  if (!codigo) {
    return NextResponse.redirect(`${origin}/login?error=sin-codigo`)
  }

  const supabase = await clienteServidor()
  const { error } = await supabase.auth.exchangeCodeForSession(codigo)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=enlace-caducado`)
  }

  return NextResponse.redirect(`${origin}/cola`)
}
