import { entorno } from '@/lib/config/entorno'

/**
 * Render del email. El modelo escribe texto plano; aquí se le da forma y se añade
 * lo que nunca debe salir del modelo: el enlace de baja.
 */

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
export function renderHtml(cuerpo: string, bajaToken: string): string {
  const parrafos = cuerpo
    .split(/\n{2,}/)
    .map((parrafo) => `<p style="margin:0 0 16px">${escapar(parrafo.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#243f4c;max-width:560px">
${parrafos}
<p style="margin:32px 0 0;font-size:12px;color:#93a5af;border-top:1px solid #dde5e9;padding-top:16px">
Learning Heroes · <a href="${urlBaja(bajaToken)}" style="color:#93a5af">No quiero recibir más correos</a>
</p>
</div>`
}

/** Versión en texto plano, para clientes que no renderizan HTML. */
export function renderTexto(cuerpo: string, bajaToken: string): string {
  return `${cuerpo.trim()}\n\n—\nLearning Heroes\nSi no quieres recibir más correos: ${urlBaja(bajaToken)}`
}
