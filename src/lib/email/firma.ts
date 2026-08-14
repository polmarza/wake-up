/**
 * Quién firma el email.
 *
 * La firma **no la escribe el modelo**: la añade el render. El prompt le prohíbe
 * explícitamente firmar, precisamente para que la identidad de quien escribe no
 * dependa de que Claude se acuerde. Un email sin firma parece de un sistema; el
 * mismo email firmado parece de una persona, y esa diferencia es medio producto.
 *
 * Dos profesores ficticios repartidos por curso. Dos y no cuatro: con más, cada uno
 * aparece tan poco que deja de construir relación con el alumno.
 *
 * Las direcciones son de atrezo — se ven en la firma, pero las respuestas van a la
 * dirección real desde la que sale el correo (RESEND_FROM).
 */

export type Firma = {
  nombre: string
  cargo: string
  correo: string
}

const NEUS: Firma = {
  nombre: 'Neus Bagué',
  cargo: 'Profesora del programa',
  correo: 'neus@learningheroes.com',
}

const ROGER: Firma = {
  nombre: 'Roger Solans',
  cargo: 'Profesor del programa',
  correo: 'roger@learningheroes.com',
}

/** Los cursos de producto y desarrollo los lleva Neus; los de datos y automatización, Roger. */
const POR_CURSO: Record<string, Firma> = {
  c_vibe_web: NEUS,
  c_ia_prod: NEUS,
  c_data_sql: ROGER,
  c_n8n: ROGER,
}

export function firmaDe(cursoId: string | null | undefined): Firma {
  return POR_CURSO[cursoId ?? ''] ?? NEUS
}

/**
 * Texto del botón según el segmento. A quien ya terminó no se le dice "retoma el
 * curso": no hay nada que retomar, y el desajuste delata que el mensaje es automático.
 */
export function textoBoton(segmento: string | null | undefined): string {
  if (segmento === 'completado') return 'Ver el siguiente curso'
  if (segmento === 'nunca_empezo') return 'Entrar al curso'
  return 'Retomar el curso'
}

export const URL_ESCUELA = 'https://learningheroes.com'
