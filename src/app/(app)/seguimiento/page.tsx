import { bandejaDeResultados } from '@/lib/alumnos/consultas'
import { ETIQUETAS_SEGMENTO, type Segmento } from '@/lib/candidatos/consultas'
import { BotonesResultado } from '@/components/seguimiento/BotonesResultado'

export const dynamic = 'force-dynamic'

const ETIQUETAS_TIPO: Record<string, { texto: string; color: string }> = {
  reinscripcion: { texto: 'Se reinscribió', color: '#ff2878' },
  respuesta_email: { texto: 'Respondió', color: '#12a594' },
  login: { texto: 'Volvió a entrar', color: '#3b82c4' },
}

export default async function Seguimiento() {
  const { pendientes, cerrados, embudo } = await bandejaDeResultados()

  const conSenal = pendientes.filter((envio) => envio.abierto_at || envio.respondido)

  const pasos = [
    { etiqueta: 'Emails enviados', valor: embudo.enviados, color: '#243f4c' },
    { etiqueta: 'Los abrieron', valor: embudo.abiertos, color: '#3b82c4' },
    { etiqueta: 'Respondieron', valor: embudo.respondidos, color: '#12a594' },
    { etiqueta: 'Volvieron', valor: embudo.volvieron, color: '#ff2878' },
  ]

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-8">
      {/* ── Embudo: dónde se cae la gente ──────────────────────────────────── */}
      <section className="rounded-[10px] border border-borde bg-superficie p-6">
        <h1 className="font-display text-[32px] leading-none font-bold">Seguimiento</h1>
        <p className="mt-2 max-w-2xl text-sm text-texto-suave">
          Emails que ya salieron y siguen sin resultado. Mientras un envío esté aquí, el bandit no ha
          aprendido nada de él: registrar lo que pasó es lo que actualiza los priors de la plantilla
          que se usó.
        </p>

        <div className="mt-8 space-y-4">
          {pasos.map((paso) => (
            <div key={paso.etiqueta}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{paso.etiqueta}</span>
                <span className="text-[14px] text-texto-suave tabular">
                  {embudo.enviados > 0
                    ? `${((paso.valor / embudo.enviados) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-8 flex-1 overflow-hidden rounded-[6px] bg-white">
                  <div
                    className="h-full rounded-[6px]"
                    style={{
                      width: `${
                        embudo.enviados > 0
                          ? Math.max((paso.valor / embudo.enviados) * 100, 0.8)
                          : 0
                      }%`,
                      backgroundColor: paso.color,
                    }}
                  />
                </div>
                <span
                  className="w-[52px] text-right font-display text-[22px] font-bold tabular"
                  style={{ color: paso.color }}
                >
                  {paso.valor}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[14px] text-texto-tenue">
          Cada escalón es una oportunidad distinta: quien abrió y no volvió ya levantó la mano, y es
          con quien más rentable resulta gastar el minuto siguiente. Por eso la lista de abajo va
          ordenada por señal y no por fecha.
        </p>
      </section>

      {/* ── Esperando resultado ────────────────────────────────────────────── */}
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">Esperando resultado</h2>
        <span className="text-[14px] text-texto-suave">
          {conSenal.length > 0 && (
            <>
              <span className="font-medium text-info">{conSenal.length}</span> con señal ·{' '}
            </>
          )}
          {pendientes.length} en total
        </span>
      </div>

      {pendientes.length === 0 ? (
        <p className="mt-4 rounded-[10px] border border-borde bg-superficie p-6 text-sm">
          No hay envíos pendientes de resultado.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium">Enviado</th>
                <th className="px-4 py-3 font-medium">Asunto</th>
                <th className="px-4 py-3 font-medium">Señal</th>
                <th className="px-4 py-3 font-medium">¿Qué pasó?</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.slice(0, 60).map((envio) => {
                const senal = envio.respondido || envio.abierto_at
                return (
                  <tr
                    key={envio.id}
                    className={`border-b border-borde last:border-0 ${senal ? 'bg-info/5' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium">
                        {envio.nombre} {envio.apellidos}
                      </div>
                      <div className="text-[14px] text-texto-tenue">
                        {ETIQUETAS_SEGMENTO[envio.segmento as Segmento] ?? envio.segmento} ·{' '}
                        <span className="font-mono text-[13px]">{envio.plantilla_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular">
                      {envio.enviado_at?.slice(0, 10)}
                    </td>
                    <td className="max-w-[320px] px-4 py-2.5">
                      <div className="truncate" title={envio.asunto ?? ''}>
                        {envio.asunto}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {envio.respondido ? (
                        <span className="rounded-full bg-exito/10 px-2 py-0.5 text-[13px] font-medium text-exito">
                          respondió
                        </span>
                      ) : envio.abierto_at ? (
                        <span className="rounded-full bg-info/10 px-2 py-0.5 text-[13px] font-medium text-info">
                          lo abrió
                        </span>
                      ) : (
                        <span className="text-texto-tenue">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <BotonesResultado envioId={envio.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pendientes.length > 60 && (
        <p className="mt-3 text-xs text-texto-tenue">
          Se muestran los 60 primeros de {pendientes.length}, con los que dieron señal arriba del
          todo.
        </p>
      )}

      {/* ── Ya volvieron ───────────────────────────────────────────────────── */}
      {cerrados.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-semibold">Ya volvieron</h2>
          <p className="mt-1 text-[15px] text-texto-suave">
            Cada uno de estos actualizó los priors de la plantilla que lo consiguió.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-borde bg-superficie">
                <tr className="text-xs tracking-wide text-texto-suave uppercase">
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium">Cómo volvió</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium">Plantilla que lo consiguió</th>
                </tr>
              </thead>
              <tbody>
                {cerrados.slice(0, 30).map((envio) => {
                  const tipo = ETIQUETAS_TIPO[envio.tipo_reactivacion ?? '']
                  return (
                    <tr key={envio.id} className="h-12 border-b border-borde last:border-0">
                      <td className="px-4 font-medium">
                        {envio.nombre} {envio.apellidos}
                      </td>
                      <td className="px-4">
                        {tipo ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[14px] font-medium"
                            style={{ backgroundColor: `${tipo.color}1a`, color: tipo.color }}
                          >
                            {tipo.texto}
                          </span>
                        ) : (
                          envio.tipo_reactivacion
                        )}
                      </td>
                      <td className="px-4 text-texto-suave tabular">{envio.reactivado_at}</td>
                      <td className="px-4 font-mono text-[13px] text-texto-tenue">
                        {envio.plantilla_id}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
