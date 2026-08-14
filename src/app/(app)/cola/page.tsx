import Link from 'next/link'
import {
  obtenerCandidatos,
  repartoPorSegmento,
  alumnosConBorrador,
  ETIQUETAS_SEGMENTO,
  ETIQUETAS_MOTIVO,
  TECHO_INTENTOS,
  type Segmento,
} from '@/lib/candidatos/consultas'
import { entorno, destinatariosRealesPermitidos } from '@/lib/config/entorno'
import { correoPermitido } from '@/lib/config/acceso'

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
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[14px] font-medium whitespace-nowrap"
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
  const [candidatos, conBorrador] = await Promise.all([obtenerCandidatos(), alumnosConBorrador()])
  const reparto = repartoPorSegmento(candidatos)

  /**
   * Las únicas direcciones a las que este sistema puede escribir de verdad.
   *
   * Se comprueba con `correoPermitido` y no con un `Set.has`: la lista admite
   * dominios enteros (`@learningheroes.com`), y comparar la dirección contra la
   * cadena del dominio nunca casa. Ese fue exactamente el fallo que hizo que un
   * envío pareciera salir sin salir.
   */
  const permitidos = destinatariosRealesPermitidos()
  const envioRealActivo = entorno().ENVIO_REAL_HABILITADO

  const listos = candidatos.filter((candidato) => conBorrador.has(candidato.id))
  const siguiente = listos[0] ?? candidatos[0]

  const ordenSegmentos = (Object.entries(reparto) as [Segmento, number][]).sort((a, b) => b[1] - a[1])

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-8">
      {/* ── Titular: el número grande y la acción, juntos ──────────────────── */}
      <section className="rounded-[10px] border border-borde bg-superficie p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-[32px] leading-none font-bold">Cola de reactivación</h1>
            <p className="mt-2 max-w-xl text-sm text-texto-suave">
              Alumnos a los que hoy se les puede escribir. Los otros 200 del padrón están excluidos
              por consentimiento, baja, rebote, queja, techo de intentos, enfriamiento o por
              pertenecer al grupo de control.
            </p>
          </div>

          {siguiente && (
            <Link
              href={`/cola/${siguiente.id}`}
              className="rounded-[6px] bg-rosa px-5 py-3 text-sm font-medium whitespace-nowrap text-white"
            >
              {listos.length > 0 ? 'Revisar el siguiente borrador →' : 'Empezar por el primero →'}
            </Link>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <div className="font-display text-[44px] leading-none font-bold tabular">
              {candidatos.length}
            </div>
            <div className="mt-1 text-xs tracking-wide text-texto-suave uppercase">Elegibles hoy</div>
          </div>
          <div>
            <div className="font-display text-[44px] leading-none font-bold text-rosa tabular">
              {listos.length}
            </div>
            <div className="mt-1 text-xs tracking-wide text-texto-suave uppercase">
              Borradores ya escritos
            </div>
          </div>

          <div className="min-w-[280px] flex-1">
            {/* Una barra proporcional dice de un vistazo lo que una tabla de cinco
                filas obliga a leer y comparar. */}
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {ordenSegmentos.map(([segmento, total]) => (
                <div
                  key={segmento}
                  title={`${ETIQUETAS_SEGMENTO[segmento]}: ${total}`}
                  style={{
                    width: `${(total / candidatos.length) * 100}%`,
                    backgroundColor: COLOR_SEGMENTO[segmento],
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {ordenSegmentos.map(([segmento, total]) => (
                <span
                  key={segmento}
                  className="flex items-center gap-1.5 text-[14px] text-texto-suave"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: COLOR_SEGMENTO[segmento] }}
                    aria-hidden
                  />
                  {ETIQUETAS_SEGMENTO[segmento]}
                  <span className="font-medium text-texto tabular">{total}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {candidatos.length === 0 ? (
        <p className="mt-8 rounded-[10px] border border-borde bg-superficie p-6 text-sm">
          Hoy no hay nadie elegible. No es un error: puede que todos estén en periodo de
          enfriamiento o hayan agotado sus tres intentos.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[10px] border border-borde">
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-borde bg-superficie">
              <tr className="text-xs tracking-wide text-texto-suave uppercase">
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Progreso</th>
                <th className="px-4 py-3 font-medium">Inactivo</th>
                <th className="px-4 py-3 font-medium">Motivo declarado</th>
                <th className="px-4 py-3 font-medium">Intentos</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((candidato) => (
                <tr
                  key={candidato.id}
                  className="border-b border-borde last:border-0 hover:bg-superficie-hover"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {candidato.nombre} {candidato.apellidos}
                      </span>
                      {correoPermitido(candidato.email, permitidos) && (
                        <span className="rounded-full bg-rosa/10 px-2 py-0.5 text-[13px] font-medium text-rosa">
                          buzón real
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] text-texto-tenue">{candidato.email}</div>
                  </td>
                  <td className="px-4">{candidato.curso_nombre}</td>
                  <td className="px-4">
                    <Badge segmento={candidato.segmento_calculado} />
                  </td>
                  <td className="px-4 tabular">
                    sesión {candidato.ultima_sesion_completada} de {candidato.total_sesiones}
                  </td>
                  <td className="px-4 tabular">{candidato.dias_inactivo} d</td>
                  <td className="px-4 text-texto-suave">
                    {candidato.motivo_abandono_declarado
                      ? (ETIQUETAS_MOTIVO[candidato.motivo_abandono_declarado] ??
                        candidato.motivo_abandono_declarado)
                      : '—'}
                  </td>
                  <td className="px-4 tabular">
                    {candidato.emails_enviados_total} de {TECHO_INTENTOS}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/cola/${candidato.id}`}
                      className={`rounded-[6px] px-2.5 py-1 text-[14px] ${
                        conBorrador.has(candidato.id)
                          ? 'bg-rosa font-medium text-white'
                          : 'border border-borde hover:bg-white'
                      }`}
                    >
                      {conBorrador.has(candidato.id) ? 'Borrador listo →' : 'Revisar →'}
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
          Ordenados por prioridad: primero quien se fue hace menos tiempo y más lejos había llegado,
          que es quien más fácil vuelve.
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
