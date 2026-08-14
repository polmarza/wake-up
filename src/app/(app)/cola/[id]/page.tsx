import Link from 'next/link'
import {
  obtenerCandidato,
  historialDeEnvios,
  borradorPendiente,
  ETIQUETAS_SEGMENTO,
  ETIQUETAS_MOTIVO,
  TECHO_INTENTOS,
  type Segmento,
} from '@/lib/candidatos/consultas'
import { plantillasDeSegmento } from '@/lib/plantillas/consultas'
import { tasaEsperada } from '@/lib/bandit/thompson'
import { entorno, destinatariosRealesPermitidos } from '@/lib/config/entorno'
import { BorradorPanel } from '@/components/cola/BorradorPanel'

export const dynamic = 'force-dynamic'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-borde py-2 last:border-0">
      <span className="text-[12px] tracking-wide text-texto-suave uppercase">{etiqueta}</span>
      <span className="text-right text-[13px] font-medium tabular">{valor}</span>
    </div>
  )
}

export default async function Revisar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const candidato = await obtenerCandidato(id)

  if (!candidato) {
    return (
      <main className="mx-auto max-w-2xl px-8 py-16">
        <h1 className="font-display text-2xl font-bold">Este alumno ya no es elegible</h1>
        <p className="mt-3 text-sm text-texto-suave">
          Puede haberse dado de baja, haber rebotado, haber agotado sus tres intentos o estar en
          periodo de enfriamiento. No aparece en la vista de candidatos, así que no se le puede
          escribir.
        </p>
        <Link href="/cola" className="mt-6 inline-block text-sm text-rosa underline-offset-2 hover:underline">
          ← Volver a la cola
        </Link>
      </main>
    )
  }

  const [historial, borrador, plantillas] = await Promise.all([
    historialDeEnvios(id),
    borradorPendiente(id),
    plantillasDeSegmento(candidato.segmento_calculado),
  ])

  const enviados = historial.filter((envio) => envio.estado_envio === 'enviado')
  const plantillaElegida = borrador?.plantilla_id
    ? plantillas.find((plantilla) => plantilla.id === borrador.plantilla_id)
    : null

  const env = entorno()
  const permitidos = destinatariosRealesPermitidos()
  const buzonReal = permitidos.includes(candidato.email.toLowerCase())
  const envioRealDisponible = env.ENVIO_REAL_HABILITADO && buzonReal

  /**
   * Por qué no se puede enviar de verdad, dicho antes de pulsar nada. Un botón que
   * falla al hacer clic obliga a adivinar; esto se lee y se arregla.
   */
  const motivoSinEnvioReal = envioRealDisponible
    ? null
    : !buzonReal
      ? permitidos.length === 0
        ? 'No hay ninguna dirección autorizada para envíos reales: falta EMAIL_OPERADOR (o ' +
          'ALUMNO_REAL_EMAIL) en el entorno.'
        : `${candidato.email} no está entre las direcciones autorizadas para envíos reales ` +
          `(${permitidos.join(', ')}). Si es un buzón tuyo de verdad, añádelo a ALUMNO_REAL_EMAIL; ` +
          'si es del dataset sintético, no existe y no debe recibir nada.'
      : 'El interruptor ENVIO_REAL_HABILITADO está en false. Ponlo a true en Vercel y vuelve a ' +
        'desplegar para que este email salga de verdad.'

  return (
    <main className="mx-auto max-w-[1440px] px-8 py-10">
      <Link href="/cola" className="text-sm text-texto-suave underline-offset-2 hover:underline">
        ← Cola
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {candidato.nombre} {candidato.apellidos}
            </h1>
            <p className="mt-1 text-sm text-texto-suave">{candidato.email}</p>
          </div>

          <div className="rounded-[10px] border border-borde px-4 py-2">
            <Dato etiqueta="Segmento" valor={ETIQUETAS_SEGMENTO[candidato.segmento_calculado as Segmento]} />
            <Dato etiqueta="Curso" valor={candidato.curso_nombre} />
            <Dato
              etiqueta="Se quedó en"
              valor={`sesión ${candidato.ultima_sesion_completada} de ${candidato.total_sesiones}`}
            />
            <Dato etiqueta="Progreso" valor={`${Math.round(Number(candidato.progreso_pct) * 100)}%`} />
            <Dato etiqueta="Inactivo" valor={`${candidato.dias_inactivo} días`} />
            <Dato
              etiqueta="Motivo declarado"
              valor={
                candidato.motivo_abandono_declarado
                  ? (ETIQUETAS_MOTIVO[candidato.motivo_abandono_declarado] ??
                    candidato.motivo_abandono_declarado)
                  : '—'
              }
            />
            <Dato etiqueta="Idioma" valor={candidato.idioma === 'ca' ? 'Catalán' : 'Castellano'} />
            <Dato
              etiqueta="Intentos"
              valor={`${candidato.emails_enviados_total} de ${TECHO_INTENTOS}`}
            />
          </div>

          <div className="rounded-[10px] border border-borde bg-superficie px-4 py-3">
            <p className="text-[12px] font-medium tracking-wide text-texto-suave uppercase">
              Por qué es elegible
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-texto-suave">
              <li>Dio consentimiento de marketing y no se ha dado de baja</li>
              <li>Sin rebote duro ni queja de spam</li>
              <li>Grupo de tratamiento, no de control</li>
              <li>{candidato.dias_inactivo} días inactivo (mínimo 21)</li>
              <li>
                {candidato.ultimo_envio_at
                  ? `Último email el ${candidato.ultimo_envio_at} (enfriamiento de 14 días superado)`
                  : 'Nunca se le ha escrito'}
              </li>
              <li>Le quedan {TECHO_INTENTOS - candidato.emails_enviados_total} intentos</li>
            </ul>
          </div>

          {plantillaElegida && (
            <div className="rounded-[10px] border border-borde px-4 py-3">
              <p className="text-[12px] font-medium tracking-wide text-texto-suave uppercase">
                Plantilla elegida por el bandit
              </p>
              <p className="mt-1 font-mono text-[13px]">{plantillaElegida.id}</p>
              <p className="mt-1 text-[13px] text-texto-suave">
                Tono {plantillaElegida.tono} · {plantillaElegida.longitud} ·{' '}
                {plantillaElegida.reactivaciones}/{plantillaElegida.envios} reactivaciones
              </p>
              <p className="mt-2 font-mono text-[12px] text-texto-tenue">
                α {plantillaElegida.alpha} · β {plantillaElegida.beta} · esperada{' '}
                {(tasaEsperada(plantillaElegida) * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {enviados.length > 0 && (
            <div className="rounded-[10px] border border-borde px-4 py-3">
              <p className="text-[12px] font-medium tracking-wide text-texto-suave uppercase">
                Ya se le escribió
              </p>
              <ul className="mt-2 space-y-2">
                {enviados.map((envio) => (
                  <li key={envio.id} className="text-[13px]">
                    <span className="text-texto-tenue">{envio.enviado_at?.slice(0, 10)}</span> ·{' '}
                    {envio.asunto}
                    {envio.abierto_at && <span className="text-exito"> · abierto</span>}
                    {envio.respondido && <span className="text-exito"> · respondió</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Borrador</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                envioRealDisponible ? 'bg-rosa/10 text-rosa' : 'bg-superficie text-texto-suave'
              }`}
            >
              {envioRealDisponible ? 'Este sí llega a un buzón real' : 'Envío simulado'}
            </span>
          </div>

          {motivoSinEnvioReal && (
            <p className="mb-4 rounded-[10px] border border-borde bg-superficie px-4 py-3 text-[13px] text-texto-suave">
              {motivoSinEnvioReal} El envío se registrará igualmente en el historial, con todos sus
              efectos: consume intento y activa el enfriamiento de 14 días.
            </p>
          )}

          <BorradorPanel
            alumnoId={id}
            borrador={borrador}
            envioRealDisponible={envioRealDisponible}
          />
        </section>
      </div>
    </main>
  )
}
