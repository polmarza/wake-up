'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { clienteNavegador } from '@/lib/supabase/navegador'

const MENSAJES: Record<string, string> = {
  'no-autorizado': 'Ese correo no pertenece al equipo, así que no tiene acceso al panel.',
  'sin-lista':
    'No hay ninguna dirección autorizada configurada (EMAILS_PERMITIDOS), así que no puede entrar ' +
    'nadie. Es un problema de configuración, no de tu cuenta.',
  'enlace-caducado': 'Ese enlace ya se usó o caducó. Pide uno nuevo.',
  'enlace-invalido': 'Supabase no aceptó el enlace.',
  'sin-codigo': 'El enlace llegó incompleto. Pide uno nuevo.',
}

function Formulario() {
  const parametros = useSearchParams()
  const detalle = parametros.get('detalle')
  const base = MENSAJES[parametros.get('error') ?? '']
  // El detalle viene del propio Supabase: es lo que distingue "caducado" de "ya usado".
  const avisoPrevio = base && detalle ? `${base} ${detalle}.` : base

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
    <div className="w-full max-w-sm rounded-[10px] border border-borde bg-white p-8">
      <h1 className="font-display text-2xl font-bold">Wake Up Heroes</h1>
      <p className="mt-1 text-sm text-texto-suave">Reactivación de alumnos de Learning Heroes</p>

      {avisoPrevio && (
        <p className="mt-4 rounded-[6px] bg-aviso/10 px-3 py-2 text-[13px] text-aviso">{avisoPrevio}</p>
      )}

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
  )
}

export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie p-6">
      <Suspense>
        <Formulario />
      </Suspense>
    </main>
  )
}
