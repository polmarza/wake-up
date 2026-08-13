import { darDeBajaAccion } from './accion'

/**
 * Página pública de baja. Sin sesión, sin pedir el correo, sin preguntar por qué.
 *
 * Dos decisiones que parecen detalles y no lo son:
 *
 * 1. **La baja se confirma con un botón, no con la propia visita.** Los antivirus y
 *    los escáneres de enlaces de las empresas abren todas las URLs de un correo antes
 *    de que lo vea nadie. Si la baja ocurriera al cargar la página, esos escáneres
 *    darían de baja a media lista sin que ningún humano hubiera hecho clic.
 * 2. **La respuesta es la misma con un token válido y con uno inventado.** Si no,
 *    cualquiera podría probar tokens y averiguar cuáles corresponden a alumnos reales.
 */

export const dynamic = 'force-dynamic'

export default async function Baja({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ hecho?: string }>
}) {
  const { token } = await params
  const { hecho } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie p-6">
      <div className="w-full max-w-md rounded-[10px] border border-borde bg-white p-8">
        <h1 className="font-display text-xl font-bold">Learning Heroes</h1>

        {hecho ? (
          <>
            <p className="mt-4 text-sm">Listo. No volverás a recibir correos nuestros.</p>
            <p className="mt-3 text-sm text-texto-suave">
              Si algún día quieres retomar un curso, puedes escribirnos cuando quieras: esto solo
              cancela los correos que enviamos nosotros.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm">
              ¿Quieres dejar de recibir nuestros correos? Con un clic lo damos por hecho y no te
              volvemos a escribir.
            </p>
            <form action={darDeBajaAccion} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-[6px] bg-petroleo px-4 py-2.5 text-sm font-medium text-white"
              >
                Confirmar la baja
              </button>
            </form>
            <p className="mt-4 text-xs text-texto-tenue">
              No hace falta que nos digas por qué, y no vamos a pedirte ningún dato.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
