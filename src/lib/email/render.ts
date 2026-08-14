import { entorno } from '@/lib/config/entorno'
import { firmaDe, textoBoton, URL_ESCUELA, type Firma } from './firma'

/**
 * Render del email. El modelo escribe el cuerpo en texto plano; aquí se le da forma y
 * se añade todo lo que no debe depender de que el modelo se acuerde: la firma, el
 * botón y el enlace de baja.
 */

export type Contexto = {
  cursoId: string | null
  segmento: string | null
  bajaToken: string
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function urlBaja(bajaToken: string): string {
  return `${entorno().NEXT_PUBLIC_APP_URL}/baja/${bajaToken}`
}

/**
 * Versión HTML. Tipografías de sistema a propósito: esto se lee en Gmail, no en la
 * aplicación, y tiene que parecerse a un correo escrito por una persona.
 */
export function renderHtml(cuerpo: string, contexto: Contexto): string {
  const firma: Firma = firmaDe(contexto.cursoId)

  const parrafos = cuerpo
    .split(/\n{2,}/)
    .map((parrafo) => `<p style="margin:0 0 16px">${escapar(parrafo.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#243f4c;max-width:560px">
${parrafos}

<p style="margin:28px 0 32px">
  <a href="${URL_ESCUELA}" style="display:inline-block;background:#ff2878;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:6px">${escapar(textoBoton(contexto.segmento))}</a>
</p>

<table cellpadding="0" cellspacing="0" style="border-top:1px solid #dde5e9;padding-top:18px;width:100%">
  <tr>
    <td style="padding-top:18px">
      <p style="margin:0;font-weight:600;color:#243f4c">${escapar(firma.nombre)}</p>
      <p style="margin:2px 0 0;font-size:14px;color:#5f7280">${escapar(firma.cargo)} · Learning Heroes</p>
      <p style="margin:2px 0 0;font-size:14px;color:#5f7280">${escapar(firma.correo)}</p>
    </td>
  </tr>
</table>

<p style="margin:26px 0 0;font-size:12px;color:#93a5af">
<a href="${urlBaja(contexto.bajaToken)}" style="color:#93a5af">No quiero recibir más correos</a>
</p>
</div>`
}

/** Versión en texto plano, para clientes que no renderizan HTML. */
export function renderTexto(cuerpo: string, contexto: Contexto): string {
  const firma = firmaDe(contexto.cursoId)

  return `${cuerpo.trim()}

${textoBoton(contexto.segmento)}: ${URL_ESCUELA}

—
${firma.nombre}
${firma.cargo} · Learning Heroes
${firma.correo}

Si no quieres recibir más correos: ${urlBaja(contexto.bajaToken)}`
}
