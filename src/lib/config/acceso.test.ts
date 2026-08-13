import { describe, it, expect } from 'vitest'
import { listaDeAcceso, correoPermitido } from './acceso'

describe('listaDeAcceso', () => {
  it('separa por comas, quita espacios y baja a minúsculas', () => {
    expect(listaDeAcceso(' Ana@LearningHeroes.com , @learningheroes.com ')).toEqual([
      'ana@learningheroes.com',
      '@learningheroes.com',
    ])
  })

  it('devuelve lista vacía cuando la variable no existe', () => {
    expect(listaDeAcceso(undefined)).toEqual([])
    expect(listaDeAcceso('')).toEqual([])
    expect(listaDeAcceso('  ,  ,')).toEqual([])
  })
})

describe('correoPermitido', () => {
  const lista = listaDeAcceso('polmarza@gmail.com, @learningheroes.com')

  it('acepta una dirección concreta de la lista', () => {
    expect(correoPermitido('polmarza@gmail.com', lista)).toBe(true)
  })

  it('acepta cualquier dirección del dominio permitido', () => {
    expect(correoPermitido('quien.sea@learningheroes.com', lista)).toBe(true)
    expect(correoPermitido('otra.persona@learningheroes.com', lista)).toBe(true)
  })

  it('no distingue mayúsculas ni espacios sobrantes', () => {
    expect(correoPermitido('  Quien.Sea@LearningHeroes.COM ', lista)).toBe(true)
  })

  it('rechaza una dirección de otro dominio', () => {
    expect(correoPermitido('intruso@example.com', lista)).toBe(false)
  })

  it('rechaza subdominios del dominio permitido', () => {
    // mail.learningheroes.com puede pertenecer a otra persona; el permiso es para el
    // dominio exacto, no para todo lo que cuelgue de él.
    expect(correoPermitido('alguien@mail.learningheroes.com', lista)).toBe(false)
  })

  it('rechaza un dominio que solo termina igual', () => {
    // El caso que rompe una comparación con endsWith mal escrita.
    expect(correoPermitido('intruso@falsolearningheroes.com', lista)).toBe(false)
    expect(correoPermitido('intruso@learningheroes.com.evil.net', lista)).toBe(false)
  })

  it('acepta el dominio escrito sin arroba', () => {
    expect(correoPermitido('alguien@learningheroes.com', listaDeAcceso('learningheroes.com'))).toBe(true)
  })

  it('deniega a todo el mundo si la lista está vacía', () => {
    // Falla cerrado: un olvido de configuración deja a todos fuera, no a todos dentro.
    expect(correoPermitido('polmarza@gmail.com', [])).toBe(false)
  })

  it('rechaza entradas que no son direcciones', () => {
    expect(correoPermitido('sin-arroba', lista)).toBe(false)
    expect(correoPermitido('@learningheroes.com', lista)).toBe(false)
    expect(correoPermitido('', lista)).toBe(false)
  })
})
