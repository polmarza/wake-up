import Link from 'next/link'
import { bandejaDeResultados } from '@/lib/alumnos/consultas'
import { ETIQUETAS_SEGMENTO, type Segmento } from '@/lib/candidatos/consultas'
import { BotonesResultado } from '@/components/seguimiento/BotonesResultado'

export const dynamic = 'force-dynamic'

const ETIQUETAS_TIPO: Record<string, string> = {
  reinscripcion: 'Se reinscribió',
  respuesta_email: 'Respondió',
  login: 'Volvió a entrar',
}

export default async function Seguimiento() {
  const { pendientes, cerrados } = await bandejaDeResultados()

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[32px] font-bold">Seguimiento</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Emails que ya salieron y siguen sin resultado. Mientras un envío esté aquí, el bandit no
            ha aprendido nada de él: registrar lo que pasó es lo que actualiza los priors de la
            plantilla que se usó.
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
          <div className="font-display text-[40px] leading-none font-bold tabular">{pendientes.length}</div>
          <div className="mt-1 text-xs tracking-wide text-texto-suave uppercase">Sin resultado</div>
        </div>
        <div className="rounded-[10px] border border-borde px-5 py-4">
          <div className="font-display text-[40px] leading-none font-bold tabular text-exito">
            {cerrados.length}
          </div>
          <div className="mt-1 text-xs tracking-wide text-texto-suave uppercase">Volvieron</div>
        </div>
      </section>

      <h2 className="mt-10 font-display text-lg font-semibold">Esperando resultado</h2>
      {pendientes.length === 0 ? (
        <p className="mt-4 rounded-[10px] border border-borde bg-superficie p-6 text-sm">
          No hay envíos pendientes de resultado.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium">Enviado</th>
                <th className="px-4 py-3 font-medium">Asunto</th>
                <th className="px-4 py-3 font-medium">Plantilla</th>
                <th className="px-4 py-3 font-medium">Señales</th>
                <th className="px-4 py-3 font-medium">¿Qué pasó?</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.slice(0, 60).map((envio) => (
                <tr key={envio.id} className="border-b border-borde last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">
                      {envio.nombre} {envio.apellidos}
                    </div>
                    <div className="text-[12px] text-texto-tenue">
                      {ETIQUETAS_SEGMENTO[envio.segmento as Segmento] ?? envio.segmento}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-texto-suave tabular">
                    {envio.enviado_at?.slice(0, 10)}
                  </td>
                  <td className="max-w-[280px] px-4 py-2.5">
                    <div className="truncate" title={envio.asunto ?? ''}>
                      {envio.asunto}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-texto-tenue">
                    {envio.plantilla_id}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-texto-suave">
                    {envio.abierto_at ? 'abrió' : '—'}
                    {envio.respondido ? ' · respondió' : ''}
                  </td>
                  <td className="px-4 py-2.5">
                    <BotonesResultado envioId={envio.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendientes.length > 60 && (
        <p className="mt-3 text-xs text-texto-tenue">
          Se muestran los 60 más recientes de {pendientes.length}.
        </p>
      )}

      {cerrados.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-semibold">Ya volvieron</h2>
          <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-borde bg-superficie">
                <tr className="text-xs tracking-wide text-texto-suave uppercase">
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium">Cómo volvió</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium">Plantilla que lo consiguió</th>
                </tr>
              </thead>
              <tbody>
                {cerrados.slice(0, 30).map((envio) => (
                  <tr key={envio.id} className="h-11 border-b border-borde last:border-0">
                    <td className="px-4 font-medium">
                      {envio.nombre} {envio.apellidos}
                    </td>
                    <td className="px-4 text-exito">
                      {ETIQUETAS_TIPO[envio.tipo_reactivacion ?? ''] ?? envio.tipo_reactivacion}
                    </td>
                    <td className="px-4 text-texto-suave tabular">{envio.reactivado_at}</td>
                    <td className="px-4 font-mono text-[11px] text-texto-tenue">{envio.plantilla_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
