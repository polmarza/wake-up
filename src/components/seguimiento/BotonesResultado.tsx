'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarResultadoAccion } from '@/app/(app)/resultados/acciones'

const OPCIONES = [
  { tipo: 'reinscripcion', etiqueta: 'Se reinscribió', ayuda: 'Ingreso nuevo' },
  { tipo: 'respuesta_email', etiqueta: 'Respondió', ayuda: 'Contestó al email' },
  { tipo: 'login', etiqueta: 'Volvió a entrar', ayuda: 'Retomó el curso' },
] as const

export function BotonesResultado({ envioId }: { envioId: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function registrar(tipo: (typeof OPCIONES)[number]['tipo']) {
    setError(null)
    iniciar(async () => {
      const resultado = await registrarResultadoAccion(envioId, tipo)
      if (resultado.ok) router.refresh()
      else setError(resultado.error)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.tipo}
          onClick={() => registrar(opcion.tipo)}
          disabled={pendiente}
          title={opcion.ayuda}
          className="rounded-[6px] border border-borde px-2.5 py-1 text-[12px] hover:bg-superficie disabled:opacity-50"
        >
          {opcion.etiqueta}
        </button>
      ))}
      {error && <span className="text-[12px] text-error">{error}</span>}
    </div>
  )
}
