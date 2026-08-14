import { obtenerResultados } from '@/lib/resultados/consultas'
import { ETIQUETAS_SEGMENTO, type Segmento } from '@/lib/candidatos/consultas'

export const dynamic = 'force-dynamic'

const COLOR_SEGMENTO: Record<string, string> = {
  nunca_empezo: '#8b5cf6',
  abandono_temprano: '#f0a202',
  abandono_medio: '#3b82c4',
  abandono_tardio: '#12a594',
  completado: '#ff2878',
}

const ETIQUETAS_TIPO: Record<string, string> = {
  reinscripcion: 'Se reinscribió en otro curso',
  respuesta_email: 'Respondió al email',
  login: 'Volvió a entrar en la plataforma',
}

function porcentaje(valor: number): string {
  return `${(valor * 100).toFixed(1)}%`
}

/** Barra proporcional. Sin librería de gráficas: aquí no hace falta ninguna. */
function Barra({ valor, maximo, color }: { valor: number; maximo: number; color: string }) {
  const ancho = maximo > 0 ? Math.max((valor / maximo) * 100, 1.5) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-hover">
      <div className="h-full rounded-full" style={{ width: `${ancho}%`, backgroundColor: color }} />
    </div>
  )
}

export default async function Resultados() {
  const { uplift, porSegmento, porPlantilla, porTipo, reinscripciones, ingresoEstimado, ticketMedio } =
    await obtenerResultados()

  const maxTasaSegmento = Math.max(...porSegmento.map((fila) => fila.tasa), 0.01)
  const maxTasaPlantilla = Math.max(...porPlantilla.map((fila) => fila.tasaObservada), 0.01)

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-10">
      <header>
        <div>
          <h1 className="font-display text-[32px] font-bold">Resultados</h1>
          <p className="mt-1 text-sm text-texto-suave">
            La pregunta que importa no es cuántos volvieron, sino cuántos no habrían vuelto solos.
          </p>
        </div>
      </header>

      {/* ── Uplift ─────────────────────────────────────────────────────────── */}
      <section className="mt-8 rounded-[10px] border border-borde">
        <div className="grid gap-px bg-borde sm:grid-cols-3">
          <div className="bg-white p-6">
            <div className="text-xs tracking-wide text-texto-suave uppercase">Tratamiento (contactados)</div>
            <div className="mt-2 font-display text-[40px] leading-none font-bold tabular">
              {porcentaje(uplift.tratamiento.tasa)}
            </div>
            <div className="mt-2 text-[13px] text-texto-suave tabular">
              {uplift.tratamiento.reactivados} de {uplift.tratamiento.alumnos} alumnos
            </div>
          </div>

          <div className="bg-white p-6">
            <div className="text-xs tracking-wide text-texto-suave uppercase">Holdout (nunca reciben nada)</div>
            <div className="mt-2 font-display text-[40px] leading-none font-bold tabular text-info">
              {porcentaje(uplift.holdout.tasa)}
            </div>
            <div className="mt-2 text-[13px] text-texto-suave tabular">
              {uplift.holdout.reactivados} de {uplift.holdout.alumnos} alumnos
            </div>
          </div>

          <div className="bg-white p-6">
            <div className="text-xs tracking-wide text-texto-suave uppercase">Uplift</div>
            <div className="mt-2 font-display text-[40px] leading-none font-bold tabular text-rosa">
              {uplift.diferenciaPuntos > 0 ? '+' : ''}
              {uplift.diferenciaPuntos.toFixed(1)} pp
            </div>
            <div className="mt-2 text-[13px] text-texto-suave">Diferencia en puntos porcentuales</div>
          </div>
        </div>

        {uplift.holdoutSinReactivaciones && (
          <div className="border-t border-borde bg-aviso/5 px-6 py-4">
            <p className="text-[13px] font-medium text-aviso">
              Este uplift no es creíble, y conviene decirlo antes de que lo diga otro.
            </p>
            <p className="mt-2 text-[13px] text-texto-suave">
              El holdout registra <strong>cero</strong> reactivaciones sobre {uplift.holdout.alumnos}{' '}
              alumnos. En datos reales eso no pasa nunca: siempre hay gente que vuelve sola, y ese
              suelo es justo lo que el grupo de control existe para medir. Aquí es un artefacto del
              dataset sintético, que solo marca como reactivado a quien recibió un email.
            </p>
            <p className="mt-2 text-[13px] text-texto-suave">
              Lo que esta pantalla demuestra es que <strong>la medición está montada</strong>: hay
              grupo de control, se compara contra él y el número saldría igual de rojo si el sistema
              no funcionara. La magnitud necesita datos reales.
            </p>
          </div>
        )}
      </section>

      {/* ── Valor recuperado ───────────────────────────────────────────────── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[10px] border border-borde p-5">
          <div className="font-display text-[32px] leading-none font-bold tabular">{reinscripciones}</div>
          <div className="mt-2 text-[13px] text-texto-suave">
            Reinscripciones. Son las únicas reactivaciones que facturan.
          </div>
        </div>
        <div className="rounded-[10px] border border-borde p-5">
          <div className="font-display text-[32px] leading-none font-bold tabular">
            {Math.round(ingresoEstimado).toLocaleString('es-ES')} €
          </div>
          <div className="mt-2 text-[13px] text-texto-suave">
            Ingreso estimado, a un ticket medio de {Math.round(ticketMedio)} €.
          </div>
        </div>
        <div className="rounded-[10px] border border-borde p-5">
          <div className="font-display text-[32px] leading-none font-bold tabular">
            {uplift.tratamiento.reactivados - reinscripciones}
          </div>
          <div className="mt-2 text-[13px] text-texto-suave">
            Vueltas sin ingreso inmediato: respuestas y logins. Terminan cursos y compran después.
          </div>
        </div>
      </section>

      {/* ── Por segmento ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Qué segmento responde mejor</h2>
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Contactados</th>
                <th className="px-4 py-3 font-medium">Volvieron</th>
                <th className="px-4 py-3 font-medium">Tasa</th>
                <th className="w-[35%] px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {porSegmento.map((fila) => (
                <tr key={fila.segmento} className="h-12 border-b border-borde last:border-0">
                  <td className="px-4 font-medium">
                    {ETIQUETAS_SEGMENTO[fila.segmento as Segmento] ?? fila.segmento}
                  </td>
                  <td className="px-4 tabular">{fila.contactados}</td>
                  <td className="px-4 tabular">{fila.reactivados}</td>
                  <td className="px-4 font-medium tabular">{porcentaje(fila.tasa)}</td>
                  <td className="px-4">
                    <Barra
                      valor={fila.tasa}
                      maximo={maxTasaSegmento}
                      color={COLOR_SEGMENTO[fila.segmento] ?? '#243f4c'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-texto-tenue">
          El segmento de quienes ya terminaron un curso es el de mayor valor: son los únicos cuyo
          email es un upsell, no un rescate.
        </p>
      </section>

      {/* ── Por plantilla ──────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Qué está aprendiendo el bandit</h2>
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-4 py-3 font-medium">Plantilla</th>
                <th className="px-4 py-3 font-medium">Tono</th>
                <th className="px-4 py-3 font-medium">Envíos</th>
                <th className="px-4 py-3 font-medium">Aciertos</th>
                <th className="px-4 py-3 font-medium">Tasa</th>
                <th className="px-4 py-3 font-medium">α / β</th>
                <th className="w-[22%] px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {porPlantilla.map((fila) => (
                <tr key={fila.id} className="h-12 border-b border-borde last:border-0">
                  <td className="px-4 font-mono text-[12px]">{fila.id}</td>
                  <td className="px-4 text-texto-suave">{fila.tono}</td>
                  <td className="px-4 tabular">{fila.envios}</td>
                  <td className="px-4 tabular">{fila.reactivaciones}</td>
                  <td className="px-4 font-medium tabular">{porcentaje(fila.tasaObservada)}</td>
                  <td className="px-4 font-mono text-[12px] text-texto-tenue tabular">
                    {fila.alpha} / {fila.beta}
                  </td>
                  <td className="px-4">
                    <Barra
                      valor={fila.tasaObservada}
                      maximo={maxTasaPlantilla}
                      color={COLOR_SEGMENTO[fila.segmento] ?? '#243f4c'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-texto-tenue">
          Thompson sampling elige en proporción a estos priors, no al máximo observado: por eso una
          variante con poca muestra sigue recibiendo envíos y una con 24 envíos y ningún acierto se
          apaga sola.
        </p>
      </section>

      {/* ── Cómo vuelven ───────────────────────────────────────────────────── */}
      <section className="mt-10 mb-4">
        <h2 className="font-display text-lg font-semibold">Cómo vuelven</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {porTipo.map((fila) => (
            <div key={fila.tipo} className="rounded-[10px] border border-borde px-5 py-4">
              <div className="font-display text-[28px] leading-none font-bold tabular">{fila.total}</div>
              <div className="mt-2 text-[13px] text-texto-suave">
                {ETIQUETAS_TIPO[fila.tipo] ?? fila.tipo}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
