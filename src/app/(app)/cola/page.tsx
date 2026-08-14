import Link from 'next/link'
import {
  obtenerCandidatos,
  repartoPorSegmento,
  ETIQUETAS_SEGMENTO,
  ETIQUETAS_MOTIVO,
  TECHO_INTENTOS,
  type Segmento,
} from '@/lib/candidatos/consultas'
import { entorno, destinatariosRealesPermitidos } from '@/lib/config/entorno'

export const dynamic = 'force-dynamic'

const COLOR_SEGMENTO: Record<Segmento, string> = {
  nunca_empezo: '#8b5cf6',
  abandono_temprano: '#f0a202',
  abandono_medio: '#3b82c4',
  abandono_tardio: '#12a594',
  completado: '#ff2878',
}

function Badge({ segmento }: { segmento: Segmento }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: `${COLOR_SEGMENTO[segmento]}1a`, color: COLOR_SEGMENTO[segmento] }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: COLOR_SEGMENTO[segmento] }}
        aria-hidden
      />
      {ETIQUETAS_SEGMENTO[segmento]}
    </span>
  )
}

export default async function Cola() {
  const candidatos = await obtenerCandidatos()
  const reparto = repartoPorSegmento(candidatos)

  // Las únicas direcciones a las que este sistema puede escribir de verdad. El resto
  // del dataset es @example.com y no existe.
  const conBuzonReal = new Set(destinatariosRealesPermitidos())
  const envioRealActivo = entorno().ENVIO_REAL_HABILITADO

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-10">
      <header className="flex items-start justify-between gap-6">
        <div>
        <h1 className="font-display text-[32px] font-bold">Cola de reactivación</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Alumnos elegibles hoy según la política de supresión. Todo el que no aparece aquí está
          excluido por consentimiento, baja, rebote, queja, techo de intentos, periodo de
          enfriamiento o por pertenecer al grupo de control.
        </p>
        </div>
        <Link
          href="/resultados"
          className="shrink-0 rounded-[6px] border border-borde px-3 py-2 text-sm text-texto-suave hover:bg-superficie"
        >
          Resultados →
        </Link>
      </header>

      <section className="mt-8 flex flex-wrap gap-3">
        <div className="rounded-[10px] border border-borde bg-superficie px-5 py-4">
          <div className="font-display text-[40px] leading-none font-bold tabular">
            {candidatos.length}
          </div>
          <div className="mt-1 text-xs tracking-wide text-texto-suave uppercase">
            Candidatos elegibles
          </div>
        </div>

        {Object.entries(reparto)
          .sort((a, b) => b[1] - a[1])
          .map(([segmento, total]) => (
            <div key={segmento} className="rounded-[10px] border border-borde px-5 py-4">
              <div className="font-display text-[40px] leading-none font-bold tabular">{total}</div>
              <div className="mt-2">
                <Badge segmento={segmento as Segmento} />
              </div>
            </div>
          ))}
      </section>

      {candidatos.length === 0 ? (
        <p className="mt-10 rounded-[10px] border border-borde bg-superficie p-6 text-sm">
          Hoy no hay nadie elegible. No es un error: puede que todos estén en periodo de
          enfriamiento o hayan agotado sus tres intentos.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-3 py-3 font-medium">Alumno</th>
                <th className="px-3 py-3 font-medium">Curso</th>
                <th className="px-3 py-3 font-medium">Segmento</th>
                <th className="px-3 py-3 font-medium">Progreso</th>
                <th className="px-3 py-3 font-medium">Inactivo</th>
                <th className="px-3 py-3 font-medium">Motivo declarado</th>
                <th className="px-3 py-3 font-medium">Intentos</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((candidato) => (
                <tr
                  key={candidato.id}
                  className="h-11 border-b border-borde last:border-0 hover:bg-superficie-hover"
                >
                  <td className="px-3">
                    <Link href={`/cola/${candidato.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <span className="font-medium underline-offset-2 hover:underline">
                          {candidato.nombre} {candidato.apellidos}
                        </span>
                        {conBuzonReal.has(candidato.email.toLowerCase()) && (
                          <span className="rounded-full bg-rosa/10 px-2 py-0.5 text-[11px] font-medium text-rosa">
                            buzón real
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-texto-tenue">{candidato.email}</div>
                    </Link>
                  </td>
                  <td className="px-3">{candidato.curso_nombre}</td>
                  <td className="px-3">
                    <Badge segmento={candidato.segmento_calculado} />
                  </td>
                  <td className="px-3 tabular">
                    sesión {candidato.ultima_sesion_completada} de {candidato.total_sesiones}
                  </td>
                  <td className="px-3 tabular">{candidato.dias_inactivo} d</td>
                  <td className="px-3 text-texto-suave">
                    {candidato.motivo_abandono_declarado
                      ? (ETIQUETAS_MOTIVO[candidato.motivo_abandono_declarado] ??
                        candidato.motivo_abandono_declarado)
                      : '—'}
                  </td>
                  <td className="px-3 tabular">
                    {candidato.emails_enviados_total} de {TECHO_INTENTOS}
                  </td>
                  <td className="px-3 text-right">
                    <Link
                      href={`/cola/${candidato.id}`}
                      className="rounded-[6px] border border-borde px-2.5 py-1 text-[12px] whitespace-nowrap hover:bg-white"
                    >
                      Revisar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 space-y-1 text-xs text-texto-tenue">
        <p>
          Ordenados por prioridad: primero quien se fue hace menos tiempo y más lejos había llegado.
          Selecciona un alumno para ver su ficha y revisar el borrador.
        </p>
        <p>
          Los correos del dataset son <span className="font-mono">@example.com</span> y no existen.
          Solo las filas marcadas como <span className="font-medium text-rosa">buzón real</span>{' '}
          pueden recibir un email de verdad
          {envioRealActivo ? '.' : ', y ahora mismo el envío real está desactivado.'}
        </p>
      </div>
    </main>
  )
}
