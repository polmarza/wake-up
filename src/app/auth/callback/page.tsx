'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clienteNavegador } from '@/lib/supabase/navegador'

/**
 * Canje del enlace mágico.
 *
 * Es una página de cliente y no una ruta de servidor por un motivo concreto: según
 * cómo se pidiera el enlace, Supabase devuelve la sesión de dos formas distintas.
 *
 *   ?code=…                 flujo PKCE (lo que usa el navegador al pedir el enlace)
 *   #access_token=…         flujo implícito (enlaces generados por la API de admin)
 *
 * El fragmento `#` **nunca se envía al servidor**, así que una ruta de servidor no
 * puede verlo: recibiría una URL sin nada y respondería con un error engañoso. Aquí
 * se manejan los dos, y también los errores que devuelve el propio Supabase.
 */
export default function Callback() {
  const router = useRouter()
  const [fallo, setFallo] = useState<{ titulo: string; detalle: string } | null>(null)

  useEffect(() => {
    async function canjear() {
      const supabase = clienteNavegador()
      const url = new URL(window.location.href)
      const fragmento = new URLSearchParams(url.hash.replace(/^#/, ''))

      const leer = (clave: string) => url.searchParams.get(clave) ?? fragmento.get(clave)

      // 1. Supabase rechazó el enlace antes de llegar aquí.
      const codigoError = leer('error_code')
      const descripcion = leer('error_description')
      if (codigoError || leer('error')) {
        setFallo({
          titulo:
            codigoError === 'otp_expired'
              ? 'Ese enlace ya se usó o caducó'
              : 'Supabase rechazó el enlace',
          detalle:
            (descripcion?.replace(/\+/g, ' ') ?? codigoError ?? 'sin detalle') +
            '. Los enlaces son de un solo uso: si tu correo tiene un antivirus que abre los ' +
            'enlaces antes que tú, puede haberlo consumido por el camino.',
        })
        return
      }

      // 2. Flujo PKCE: el código se canjea con el verificador que guardó este navegador.
      const codigo = url.searchParams.get('code')
      if (codigo) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo)
        if (error) {
          setFallo({
            titulo: 'No se pudo canjear el enlace en este navegador',
            detalle:
              `${error.message}. El enlace hay que abrirlo en el mismo navegador y en la misma ` +
              'dirección donde se pidió: si lo pediste en localhost y lo abres en la web publicada ' +
              '(o al revés), este navegador no tiene la pieza que falta para completarlo.',
          })
          return
        }
        router.replace('/cola')
        return
      }

      // 3. Flujo implícito: la sesión viene entera en el fragmento.
      const accessToken = fragmento.get('access_token')
      const refreshToken = fragmento.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setFallo({ titulo: 'No se pudo abrir la sesión', detalle: error.message })
          return
        }
        router.replace('/cola')
        return
      }

      setFallo({
        titulo: 'El enlace llegó sin datos de sesión',
        detalle:
          'La URL no trae ni código ni tokens. Suele pasar cuando se copia el enlace a mano y se ' +
          'pierde la parte de después del #.',
      })
    }

    canjear()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie p-6">
      <div className="w-full max-w-md rounded-[10px] border border-borde bg-white p-8">
        {fallo ? (
          <>
            <h1 className="font-display text-lg font-bold">{fallo.titulo}</h1>
            <p className="mt-3 text-[13px] text-texto-suave">{fallo.detalle}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-[6px] bg-rosa px-4 py-2 text-sm font-medium text-white"
            >
              Pedir otro enlace
            </Link>
          </>
        ) : (
          <p className="text-sm text-texto-suave">Abriendo sesión…</p>
        )}
      </div>
    </main>
  )
}
