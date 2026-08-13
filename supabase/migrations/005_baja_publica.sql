-- 005 — Baja pública por token
--
-- La baja tiene que funcionar sin cuenta y sin pedir datos: es un requisito legal y
-- una cuestión de decencia. El único dato que viaja es un token opaco de un solo uso
-- por alumno, nunca el correo ni el id.

create or replace function baja_por_token(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno_id uuid;
begin
  select id into v_alumno_id
    from alumnos
   where baja_token = p_token
     and opt_out_at is null;

  -- Token inexistente o baja ya registrada: no se hace nada y no se dice nada.
  -- La página responde igual en todos los casos para impedir enumeración.
  if v_alumno_id is null then
    return;
  end if;

  update alumnos
     set opt_out_at = current_date
   where id = v_alumno_id;

  -- Marca el último envío como origen de la baja, para poder medir qué mensajes
  -- generan bajas.
  update envios
     set unsubscribe = true
   where id = (
     select e.id from envios e
      where e.alumno_id = v_alumno_id
        and e.estado_envio = 'enviado'
      order by e.enviado_at desc
      limit 1
   );
end $$;

-- Es la única operación que el público puede ejecutar. No devuelve ningún dato.
grant execute on function baja_por_token(uuid) to anon, authenticated;
