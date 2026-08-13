/**
 * Thompson sampling sobre los priors Beta de cada plantilla.
 *
 * Por qué no "elegir la de mejor tasa": las muestras son pequeñas (entre 21 y 81
 * envíos por variante). Quedarse con el máximo observado engancha el sistema a un
 * resultado que puede ser ruido —`t_abandono_tardio_A` marca 29% con 31 envíos— y
 * deja de explorar para siempre.
 *
 * Thompson sampling saca un número aleatorio de la distribución Beta(alpha, beta) de
 * cada variante y elige la del valor más alto. Una variante con pocos datos tiene una
 * distribución ancha: a veces saca un número alto y se lleva el envío. A medida que
 * acumula resultados la distribución se estrecha y el sistema converge solo.
 */

export type PlantillaBandit = {
  id: string
  segmento: string
  tono: string | null
  longitud: string | null
  cta: string | null
  asunto_patron: string
  activa: boolean
  envios: number
  reactivaciones: number
  alpha: number
  beta: number
}

export type EleccionBandit = {
  elegida: PlantillaBandit
  /** Muestra sacada para cada variante. Es lo que se enseña en la interfaz. */
  muestras: { id: string; muestra: number; alpha: number; beta: number; tasa: number }[]
}

/** Generador con semilla. Sin él, los tests del bandit no serían reproducibles. */
export function generadorConSemilla(semilla: number): () => number {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Muestra de una Gamma(forma, 1) por el método de Marsaglia-Tsang. Es la pieza que
 * permite construir la Beta: Beta(a,b) = X / (X + Y) con X~Gamma(a), Y~Gamma(b).
 */
function muestraGamma(forma: number, aleatorio: () => number): number {
  if (forma < 1) {
    // Ajuste de Johnk para formas menores que 1.
    return muestraGamma(forma + 1, aleatorio) * Math.pow(aleatorio(), 1 / forma)
  }

  const d = forma - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  for (;;) {
    let x: number
    let v: number

    do {
      x = normalEstandar(aleatorio)
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = aleatorio()

    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/** Box-Muller. */
function normalEstandar(aleatorio: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = aleatorio()
  while (v === 0) v = aleatorio()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function muestraBeta(alpha: number, beta: number, aleatorio: () => number): number {
  const x = muestraGamma(alpha, aleatorio)
  const y = muestraGamma(beta, aleatorio)
  return x / (x + y)
}

/**
 * Elige plantilla entre las variantes activas del segmento.
 *
 * Lanza si no hay ninguna: es un fallo de datos, no un caso que la interfaz deba
 * disimular. Un segmento sin plantilla activa significa que no se puede escribir a
 * ese alumno, y eso hay que verlo.
 */
export function elegirPlantilla(
  plantillas: PlantillaBandit[],
  aleatorio: () => number = Math.random,
): EleccionBandit {
  const activas = plantillas.filter((plantilla) => plantilla.activa)

  if (activas.length === 0) {
    throw new Error('No hay ninguna plantilla activa para este segmento')
  }

  const muestras = activas.map((plantilla) => ({
    id: plantilla.id,
    muestra: muestraBeta(Math.max(plantilla.alpha, 1e-6), Math.max(plantilla.beta, 1e-6), aleatorio),
    alpha: plantilla.alpha,
    beta: plantilla.beta,
    tasa: plantilla.envios > 0 ? plantilla.reactivaciones / plantilla.envios : 0,
  }))

  const ganadora = muestras.reduce((mejor, actual) => (actual.muestra > mejor.muestra ? actual : mejor))
  const elegida = activas.find((plantilla) => plantilla.id === ganadora.id)!

  return { elegida, muestras }
}

/**
 * Media de la Beta: el valor esperado de la tasa de reactivación de una variante.
 * Se usa solo para mostrar, nunca para elegir — elegir por la media es exactamente
 * el comportamiento codicioso que Thompson sampling evita.
 */
export function tasaEsperada(plantilla: Pick<PlantillaBandit, 'alpha' | 'beta'>): number {
  return plantilla.alpha / (plantilla.alpha + plantilla.beta)
}
