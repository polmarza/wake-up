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
  // La de mayor tasa esperada, que es por donde el bandit tira más a menudo.
  const mejorPlantilla = [...porPlantilla].sort((a, b) => b.tasaEsperada - a.tasaEsperada)[0]

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-8">
      {/* ── El uplift, que es la única cifra que demuestra causalidad ───────── */}
      <section className="rounded-[10px] border border-borde bg-superficie p-6">
        <h1 className="font-display text-[32px] leading-none font-bold">Resultados</h1>
        <p className="mt-2 max-w-2xl text-sm text-texto-suave">
          La pregunta no es cuántos volvieron, sino cuántos <strong>no habrían vuelto solos</strong>.
          Por eso hay un grupo de control que no recibe nada.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Dos barras a la misma escala: la comparación se ve, no se calcula. */}
          <div className="space-y-5">
            {[
              {
                etiqueta: 'Recibieron email',
                grupo: uplift.tratamiento,
                color: '#ff2878',
              },
              {
                etiqueta: 'Grupo de control',
                grupo: uplift.holdout,
                color: '#3b82c4',
              },
            ].map((fila) => (
              <div key={fila.etiqueta}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] font-medium">{fila.etiqueta}</span>
                  <span className="text-[12px] text-texto-suave tabular">
                    {fila.grupo.reactivados} de {fila.grupo.alumnos} volvieron
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-7 flex-1 overflow-hidden rounded-[6px] bg-white">
                    <div
                      className="flex h-full items-center justify-end rounded-[6px] px-2"
                      style={{
                        width: `${Math.max(fila.grupo.tasa * 100 * 2.5, 2)}%`,
                        backgroundColor: fila.color,
                      }}
                    />
                  </div>
                  <span
                    className="w-[62px] text-right font-display text-[20px] font-bold tabular"
                    style={{ color: fila.color }}
                  >
                    {porcentaje(fila.grupo.tasa)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center rounded-[10px] border border-borde bg-white px-8 py-6 text-center">
            <div className="font-display text-[56px] leading-none font-bold text-rosa tabular">
              {uplift.diferenciaPuntos > 0 ? '+' : ''}
              {uplift.diferenciaPuntos.toFixed(1)}
            </div>
            <div className="mt-2 text-xs tracking-wide text-texto-suave uppercase">
              puntos de uplift
            </div>
          </div>
        </div>

        {uplift.holdoutSinReactivaciones && (
          <div className="mt-6 rounded-[10px] border border-aviso/30 bg-aviso/5 px-5 py-4">
            <p className="text-[13px] font-medium text-aviso">
              Este uplift no es creíble, y conviene decirlo antes de que lo diga otro.
            </p>
            <p className="mt-2 text-[13px] text-texto-suave">
              El grupo de control registra <strong>cero</strong> reactivaciones sobre{' '}
              {uplift.holdout.alumnos} alumnos. En datos reales eso no pasa nunca: siempre hay gente
              que vuelve sola, y ese suelo es justo lo que el control existe para medir. Aquí es un
              artefacto del dataset sintético, que solo marca como reactivado a quien recibió un
              email.
            </p>
            <p className="mt-2 text-[13px] text-texto-suave">
              Lo que esta pantalla demuestra es que <strong>la medición está montada</strong>: hay
              grupo de control, se compara contra él, y el número saldría igual de rojo si el sistema
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
                <tr
                  key={fila.id}
                  className={`h-12 border-b border-borde last:border-0 ${
                    fila.id === mejorPlantilla?.id ? 'bg-exito/5' : ''
                  }`}
                >
                  <td className="px-4 font-mono text-[12px]">
                    {fila.id}
                    {fila.id === mejorPlantilla?.id && (
                      <span className="ml-2 rounded-full bg-exito/15 px-2 py-0.5 font-sans text-[11px] font-medium text-exito">
                        va ganando
                      </span>
                    )}
                    {fila.envios >= 20 && fila.reactivaciones === 0 && (
                      <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 font-sans text-[11px] font-medium text-error">
                        apagándose
                      </span>
                    )}
                  </td>
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
