/**
 * Quién puede entrar en el panel.
 *
 * Módulo puro y sin dependencias del entorno a propósito: lo usa el `proxy`, que se
 * ejecuta en el edge, y también los scripts de consola. Que sea puro es además lo que
 * permite probarlo a fondo, y esta es una lista que conviene probar a fondo: quien
 * entra aquí ve la ficha completa de 300 alumnos.
 *
 * Formatos admitidos en EMAILS_PERMITIDOS, separados por comas:
 *
 *   ana@learningheroes.com     una dirección concreta
 *   @learningheroes.com        cualquier dirección de ese dominio
 *   learningheroes.com         igual que la anterior, por comodidad
 */

export function listaDeAcceso(cruda: string | undefined | null): string[] {
  return (cruda ?? '')
    .split(',')
    .map((entrada) => entrada.trim().toLowerCase())
    .filter(Boolean)
}

export function correoPermitido(correo: string, lista: string[]): boolean {
  /**
   * Lista vacía deniega a todo el mundo.
   *
   * La alternativa —dejar pasar a cualquiera cuando no hay lista— convierte un olvido
   * de configuración en una puerta abierta, y encima silenciosa: todo funcionaría
   * "bien" y nadie se enteraría. Quedarse fuera se nota en tres segundos.
   */
  if (lista.length === 0) return false

  const normalizado = correo.trim().toLowerCase()
  const arroba = normalizado.lastIndexOf('@')
  if (arroba <= 0) return false

  const dominio = normalizado.slice(arroba + 1)
  if (!dominio) return false

  return lista.some((entrada) => {
    // Dominio entero: "@learningheroes.com" o "learningheroes.com".
    if (entrada.startsWith('@')) return dominio === entrada.slice(1)
    if (!entrada.includes('@')) return dominio === entrada

    // Dirección concreta.
    return normalizado === entrada
  })
}
