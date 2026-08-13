'use client'

import { useState } from 'react'
import { clienteNavegador } from '@/lib/supabase/navegador'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado' | 'error'>('inicial')

  async function enviarEnlace(evento: React.FormEvent) {
    evento.preventDefault()
    setEstado('enviando')

    const supabase = clienteNavegador()
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    // Se responde igual haya o no cuenta: no se revela quién está en el equipo.
    setEstado(error ? 'error' : 'enviado')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie p-6">
      <div className="w-full max-w-sm rounded-[10px] border border-borde bg-white p-8">
        <h1 className="font-display text-2xl font-bold">Wake Up Heroes</h1>
        <p className="mt-1 text-sm text-texto-suave">Reactivación de alumnos de Learning Heroes</p>

        {estado === 'enviado' ? (
          <p className="mt-6 text-sm">
            Si ese correo pertenece al equipo, acabas de recibir un enlace de acceso. Revisa la
            bandeja.
          </p>
        ) : (
          <form onSubmit={enviarEnlace} className="mt-6 space-y-3">
            <label htmlFor="correo" className="block text-xs font-medium tracking-wide uppercase">
              Correo del equipo
            </label>
            <input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              className="w-full rounded-[6px] border border-borde px-3 py-2 text-sm"
              placeholder="tu@learningheroes.com"
            />
            <button
              type="submit"
              disabled={estado === 'enviando'}
              className="w-full rounded-[6px] bg-rosa px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Enviar enlace de acceso'}
            </button>
            {estado === 'error' && (
              <p className="text-sm text-error">No se pudo enviar el enlace. Inténtalo de nuevo.</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
