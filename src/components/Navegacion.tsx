'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cerrarSesionAccion } from '@/app/(app)/acciones-sesion'

/**
 * Navegación común. Las tres pantallas son un ciclo —se decide, se envía, se mide— y
 * hasta ahora había que volver atrás con el botón del navegador para pasar de una a
 * otra.
 */

const PAGINAS = [
  { href: '/cola', etiqueta: 'Cola', descripcion: 'A quién escribir hoy' },
  { href: '/seguimiento', etiqueta: 'Seguimiento', descripcion: 'Qué pasó después' },
  { href: '/resultados', etiqueta: 'Resultados', descripcion: 'Si sirvió de algo' },
]

export function Navegacion({ correo, pendientes }: { correo: string | null; pendientes: number }) {
  const ruta = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-borde bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-8 py-3">
        <Link href="/cola" className="flex items-center gap-2 whitespace-nowrap">
          <span className="size-2.5 rounded-full bg-rosa" aria-hidden />
          <span className="font-display text-[15px] font-bold">Wake Up Heroes</span>
        </Link>

        <nav className="flex items-center gap-1">
          {PAGINAS.map((pagina) => {
            const activa = ruta === pagina.href || ruta.startsWith(`${pagina.href}/`)
            return (
              <Link
                key={pagina.href}
                href={pagina.href}
                title={pagina.descripcion}
                aria-current={activa ? 'page' : undefined}
                className={`rounded-[6px] px-3 py-1.5 text-sm transition-colors ${
                  activa
                    ? 'bg-petroleo font-medium text-white'
                    : 'text-texto-suave hover:bg-superficie hover:text-texto'
                }`}
              >
                {pagina.etiqueta}
                {pagina.href === '/seguimiento' && pendientes > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[13px] tabular ${
                      activa ? 'bg-white/20' : 'bg-superficie-hover text-texto-suave'
                    }`}
                  >
                    {pendientes}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {correo && <span className="hidden text-[14px] text-texto-tenue sm:block">{correo}</span>}
          <form action={cerrarSesionAccion}>
            <button
              type="submit"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex items-center gap-1.5 rounded-[6px] border border-borde px-2.5 py-1.5 text-[14px] text-texto-suave hover:bg-superficie hover:text-texto"
            >
              <LogOut size={16} strokeWidth={1.5} aria-hidden />
              <span className="hidden md:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
