import { clienteServidor } from '@/lib/supabase/servidor'
import { Navegacion } from '@/components/Navegacion'

export const dynamic = 'force-dynamic'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await clienteServidor()

  const [{ data }, { count }] = await Promise.all([
    supabase.auth.getUser(),
    // Envíos que salieron y siguen sin resultado: es trabajo pendiente, así que se
    // enseña en la propia navegación en vez de esconderlo dentro de la pantalla.
    supabase
      .from('envios')
      .select('id', { count: 'exact', head: true })
      .eq('estado_envio', 'enviado')
      .is('reactivado_at', null),
  ])

  return (
    <>
      <Navegacion correo={data.user?.email ?? null} pendientes={count ?? 0} />
      {children}
    </>
  )
}
