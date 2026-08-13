import { describe, it, expect } from 'vitest'
import { validarBorrador, esquemaBorrador } from './esquema'

const base = {
  asunto: 'Te quedaste en la sesión 8, Pol',
  cuerpo:
    'Hola Pol, vi que dejaste Vibe Coding Web en la sesión 8 de 10. Te faltaban dos sesiones ' +
    'para acabarlo, que no es poco después de todo lo que llevabas hecho. Si quieres retomarlo, ' +
    'tu progreso sigue guardado exactamente donde lo dejaste.',
}

describe('validarBorrador', () => {
  it('acepta un borrador correcto', () => {
    expect(validarBorrador(base)).toEqual([])
  })

  it('detecta marcadores de plantilla sin sustituir', () => {
    const problemas = validarBorrador({ ...base, asunto: 'Hola {nombre}, seguimos?' })
    expect(problemas).toHaveLength(1)
    expect(problemas[0].campo).toBe('asunto')
    expect(problemas[0].problema).toContain('{nombre}')
  })

  it.each([
    ['un 20% de descuento si vuelves esta semana', 'descuento'],
    ['te lo dejamos gratis', 'gratuito'],
    ['tienes una beca disponible', 'beca'],
    ['tu plaza reservada te espera', 'plaza reservada'],
    ['te devolvemos 390 € si no te convence', 'importe'],
    ['te regalo el siguiente curso', 'regala'],
  ])('bloquea compromisos que la escuela tendría que cumplir: %s', (fragmento) => {
    const problemas = validarBorrador({ ...base, cuerpo: `${base.cuerpo} ${fragmento}` })
    expect(problemas.length).toBeGreaterThan(0)
    expect(problemas[0].campo).toBe('cuerpo')
  })

  it('no bloquea texto legítimo que se parece a los patrones', () => {
    // "sin coste adicional" no promete nada nuevo, y hablar del progreso no es un precio.
    const problemas = validarBorrador({
      ...base,
      cuerpo: `${base.cuerpo} Retomarlo no tiene ningún paso extra: entras y sigues.`,
    })
    expect(problemas).toEqual([])
  })
})

describe('esquemaBorrador', () => {
  it('rechaza un asunto demasiado corto', () => {
    expect(esquemaBorrador.safeParse({ ...base, asunto: 'Hola' }).success).toBe(false)
  })

  it('rechaza un cuerpo vacío', () => {
    expect(esquemaBorrador.safeParse({ ...base, cuerpo: '' }).success).toBe(false)
  })

  it('rechaza un cuerpo kilométrico', () => {
    expect(esquemaBorrador.safeParse({ ...base, cuerpo: 'a'.repeat(2000) }).success).toBe(false)
  })
})
