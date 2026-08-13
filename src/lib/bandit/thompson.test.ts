import { describe, it, expect } from 'vitest'
import {
  elegirPlantilla,
  generadorConSemilla,
  muestraBeta,
  tasaEsperada,
  type PlantillaBandit,
} from './thompson'

/**
 * El bandit falla en silencio: si elige mal, no lanza ninguna excepción, solo hace
 * que el sistema aprenda mal durante semanas. Por eso se prueba con semilla fija y
 * sobre muchas repeticiones, no con un par de casos.
 */

function plantilla(parcial: Partial<PlantillaBandit> & { id: string }): PlantillaBandit {
  return {
    segmento: 'abandono_temprano',
    tono: 'empatico',
    longitud: 'corta',
    cta: 'retomar_sesion',
    asunto_patron: '{nombre}, seguimos?',
    activa: true,
    envios: 0,
    reactivaciones: 0,
    alpha: 1,
    beta: 1,
    ...parcial,
  }
}

/** Reparto de elecciones sobre N repeticiones con semilla fija. */
function repartir(plantillas: PlantillaBandit[], repeticiones = 2000): Record<string, number> {
  const aleatorio = generadorConSemilla(42)
  const cuenta: Record<string, number> = {}
  for (let i = 0; i < repeticiones; i++) {
    const { elegida } = elegirPlantilla(plantillas, aleatorio)
    cuenta[elegida.id] = (cuenta[elegida.id] ?? 0) + 1
  }
  return cuenta
}

describe('muestraBeta', () => {
  it('devuelve siempre un valor entre 0 y 1', () => {
    const aleatorio = generadorConSemilla(7)
    for (let i = 0; i < 500; i++) {
      const valor = muestraBeta(2, 5, aleatorio)
      expect(valor).toBeGreaterThan(0)
      expect(valor).toBeLessThan(1)
    }
  })

  it('se concentra alrededor de la media alpha/(alpha+beta)', () => {
    const aleatorio = generadorConSemilla(11)
    const muestras = Array.from({ length: 4000 }, () => muestraBeta(20, 80, aleatorio))
    const media = muestras.reduce((a, b) => a + b, 0) / muestras.length
    expect(media).toBeGreaterThan(0.17)
    expect(media).toBeLessThan(0.23)
  })
})

describe('elegirPlantilla', () => {
  it('favorece con claridad a la variante con mejores priors', () => {
    // Datos reales del dataset: empática 5/54 frente a directa 2/58.
    const reparto = repartir([
      plantilla({ id: 'A', alpha: 6, beta: 50, envios: 54, reactivaciones: 5 }),
      plantilla({ id: 'B', alpha: 3, beta: 57, envios: 58, reactivaciones: 2 }),
    ])
    expect(reparto.A).toBeGreaterThan(reparto.B)
  })

  it('sigue explorando: la peor variante no queda a cero', () => {
    // Es la propiedad que distingue Thompson de "elegir el máximo". Si esto falla,
    // el sistema ha dejado de aprender.
    const reparto = repartir([
      plantilla({ id: 'A', alpha: 6, beta: 50 }),
      plantilla({ id: 'B', alpha: 3, beta: 57 }),
    ])
    expect(reparto.B).toBeGreaterThan(0)
  })

  it('apaga poco a poco una variante con muchos envíos y cero reactivaciones', () => {
    // t_nunca_empezo_B en el dataset: 24 envíos, 0 reactivaciones.
    const reparto = repartir([
      plantilla({ id: 'A', alpha: 4, beta: 19, envios: 21, reactivaciones: 3 }),
      plantilla({ id: 'B', alpha: 1, beta: 25, envios: 24, reactivaciones: 0 }),
    ])
    expect(reparto.B ?? 0).toBeLessThan(reparto.A * 0.2)
  })

  it('explora más cuando una variante tiene poca muestra', () => {
    // Misma tasa observada (10%), pero A con 10 envíos y B con 200. La incertidumbre
    // de A tiene que traducirse en más exploración que en el caso bien medido.
    const pocaMuestra = repartir([
      plantilla({ id: 'A', alpha: 2, beta: 10 }),
      plantilla({ id: 'B', alpha: 6, beta: 50 }),
    ])
    const muchaMuestra = repartir([
      plantilla({ id: 'A', alpha: 21, beta: 181 }),
      plantilla({ id: 'B', alpha: 6, beta: 50 }),
    ])
    expect(pocaMuestra.A).toBeGreaterThan(muchaMuestra.A)
  })

  it('nunca elige una plantilla desactivada', () => {
    const reparto = repartir([
      plantilla({ id: 'A', alpha: 1, beta: 100 }),
      plantilla({ id: 'B', alpha: 99, beta: 1, activa: false }),
    ])
    expect(reparto.B).toBeUndefined()
    expect(reparto.A).toBe(2000)
  })

  it('lanza si el segmento no tiene ninguna plantilla activa', () => {
    expect(() => elegirPlantilla([plantilla({ id: 'A', activa: false })])).toThrow(
      /ninguna plantilla activa/,
    )
  })

  it('es determinista con la misma semilla', () => {
    const plantillas = [plantilla({ id: 'A', alpha: 6, beta: 50 }), plantilla({ id: 'B', alpha: 3, beta: 57 })]
    const primera = elegirPlantilla(plantillas, generadorConSemilla(99)).elegida.id
    const segunda = elegirPlantilla(plantillas, generadorConSemilla(99)).elegida.id
    expect(primera).toBe(segunda)
  })
})

describe('tasaEsperada', () => {
  it('calcula la media de la Beta', () => {
    expect(tasaEsperada({ alpha: 6, beta: 50 })).toBeCloseTo(6 / 56, 5)
  })
})
