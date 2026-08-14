'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  generarBorradorAccion,
  guardarEdicionAccion,
  aprobarAccion,
  descartarAccion,
  probarEnMiBuzonAccion,
} from '@/app/(app)/cola/acciones'

type Borrador = { id: string; asunto: string | null; cuerpo: string | null; plantilla_id: string | null }

export function BorradorPanel({
  alumnoId,
  borrador,
  envioRealDisponible,
}: {
  alumnoId: string
  borrador: Borrador | null
  envioRealDisponible: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()

  const [asunto, setAsunto] = useState(borrador?.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(borrador?.cuerpo ?? '')
  const [editado, setEditado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [instruccion, setInstruccion] = useState('')

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje?: string; error?: string }>) {
    setAviso(null)
    iniciar(async () => {
      const resultado = await accion()
      if (resultado.ok) {
        if (resultado.mensaje) setAviso({ tipo: 'ok', texto: resultado.mensaje })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: resultado.error ?? 'Error desconocido' })
      }
    })
  }

  async function guardarSiHaceFalta() {
    if (editado && borrador) await guardarEdicionAccion(borrador.id, asunto, cuerpo)
  }

  if (!borrador) {
    return (
      <div className="rounded-[10px] border border-borde p-8 text-center">
        <p className="text-sm text-texto-suave">
          Todavía no hay borrador para este alumno. El bandit elegirá la variante y Claude escribirá
          el email con su ficha.
        </p>
        <button
          onClick={() => ejecutar(() => generarBorradorAccion(alumnoId))}
          disabled={pendiente}
          className="mt-5 rounded-[6px] bg-rosa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pendiente ? 'Escribiendo…' : 'Generar borrador'}
        </button>
        {aviso && (
          <p className={`mt-4 text-sm ${aviso.tipo === 'error' ? 'text-error' : 'text-texto-suave'}`}>
            {aviso.texto}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-borde">
        <div className="border-b border-borde bg-superficie px-4 py-2">
          <label htmlFor="asunto" className="text-xs font-medium tracking-wide text-texto-suave uppercase">
            Asunto
          </label>
        </div>
        <input
          id="asunto"
          value={asunto}
          onChange={(evento) => {
            setAsunto(evento.target.value)
            setEditado(true)
          }}
          className="w-full px-4 py-3 text-[15px] font-medium outline-none"
        />
      </div>

      <div className="rounded-[10px] border border-borde">
        <div className="flex items-center justify-between border-b border-borde bg-superficie px-4 py-2">
          <label htmlFor="cuerpo" className="text-xs font-medium tracking-wide text-texto-suave uppercase">
            Cuerpo
          </label>
          {editado && <span className="text-[14px] text-aviso">Editado por ti</span>}
        </div>
        <textarea
          id="cuerpo"
          value={cuerpo}
          onChange={(evento) => {
            setCuerpo(evento.target.value)
            setEditado(true)
          }}
          rows={10}
          className="w-full resize-y px-4 py-3 font-sans text-[15px] leading-relaxed outline-none"
        />
      </div>

      {aviso && (
        <p
          className={`rounded-[6px] px-3 py-2 text-sm ${
            aviso.tipo === 'error' ? 'bg-error/10 text-error' : 'bg-exito/10 text-exito'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/*
        Fija abajo a propósito. El cuerpo del email es largo y, si los botones van
        después, quedan fuera de pantalla: la acción principal de la herramienta
        desaparece justo cuando hace falta.
      */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-2 border-t border-borde bg-white/95 px-1 py-3 backdrop-blur">
        <button
          onClick={() =>
            ejecutar(async () => {
              await guardarSiHaceFalta()
              return aprobarAccion(borrador.id, alumnoId, envioRealDisponible)
            })
          }
          disabled={pendiente}
          className="rounded-[6px] bg-rosa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {envioRealDisponible ? 'Aprobar y enviar de verdad' : 'Aprobar y registrar'}
        </button>

        {envioRealDisponible && (
          <button
            onClick={() =>
              ejecutar(async () => {
                await guardarSiHaceFalta()
                return probarEnMiBuzonAccion(borrador.id)
              })
            }
            disabled={pendiente}
            className="rounded-[6px] border border-rosa px-4 py-2 text-sm font-medium text-rosa disabled:opacity-60"
            title="Manda este mismo email a tu buzón, sin registrarlo ni consumir intento"
          >
            Enviármelo a mí
          </button>
        )}

        <button
          onClick={() => ejecutar(() => generarBorradorAccion(alumnoId, instruccion || undefined))}
          disabled={pendiente}
          className="rounded-[6px] border border-borde px-4 py-2 text-sm disabled:opacity-60"
        >
          Regenerar
        </button>

        <button
          onClick={() => ejecutar(() => descartarAccion(borrador.id, alumnoId, 'Descartado por el operador'))}
          disabled={pendiente}
          className="rounded-[6px] px-4 py-2 text-sm text-texto-suave underline-offset-2 hover:underline disabled:opacity-60"
        >
          Descartar
        </button>
      </div>

      <input
        value={instruccion}
        onChange={(evento) => setInstruccion(evento.target.value)}
        placeholder="Instrucción para regenerar (opcional): «más corto», «menciona que puede escribirme»…"
        className="w-full rounded-[6px] border border-borde px-3 py-2 text-[15px]"
      />

      <p className="text-xs text-texto-tenue">
        Descartar no consume ninguno de los tres intentos del alumno: vuelve a la cola en el siguiente
        ciclo.
      </p>
    </div>
  )
}
