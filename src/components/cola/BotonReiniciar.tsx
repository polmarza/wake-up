'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reiniciarPruebaAccion } from '@/app/(app)/cola/acciones'

/** Solo aparece en las fichas de las direcciones de prueba del equipo. */
export function BotonReiniciar({ alumnoId }: { alumnoId: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-6">
      <button
        onClick={() =>
          iniciar(async () => {
            const resultado = await reiniciarPruebaAccion(alumnoId)
            if (resultado.ok) router.refresh()
            else setError('error' in resultado ? resultado.error : 'Error desconocido')
          })
        }
        disabled={pendiente}
        className="rounded-[6px] bg-rosa px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendiente ? 'Reiniciando…' : 'Volver a ponerlo en la cola'}
      </button>
      {error && <p className="mt-3 text-sm text-error">{error}</p>}
    </div>
  )
}
