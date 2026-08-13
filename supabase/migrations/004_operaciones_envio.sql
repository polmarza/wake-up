-- 004 — Operaciones de envío y registro de resultado
--
-- Tres funciones que agrupan en una sola transacción todo lo que tiene que pasar
-- junto o no pasar. Están en la base de datos y no en la aplicación por dos motivos:
-- atomicidad, y que los contadores del bandit no se puedan falsear desde la UI.

-- ─── aprobar_envio ────────────────────────────────────────────────────────────
-- Convierte un borrador en un envío. Revalida la elegibilidad contra la vista:
-- entre que se generó el borrador y el clic del operador, el alumno puede haberse
-- dado de baja, haber rebotado o haber consumido su último intento.

create or replace function aprobar_envio(p_envio_id uuid, p_envio_real boolean default false)
returns envios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_envio envios;
begin
  select * into v_envio from envios where id = p_envio_id for update;

  if v_envio.id is null then
    raise exception 'Envío no encontrado: %', p_envio_id;
  end if;

  -- Idempotente: un doble clic no envía dos veces.
  if v_envio.estado_envio = 'enviado' then
    return v_envio;
  end if;

  if v_envio.estado_envio <> 'borrador' then
    raise exception 'Solo se puede aprobar un borrador (estado actual: %)', v_envio.estado_envio;
  end if;

  if not exists (select 1 from candidatos_reactivacion c where c.id = v_envio.alumno_id) then
    raise exception 'El alumno ya no es elegible: se dio de baja, rebotó o agotó sus intentos';
  end if;

  update envios
     set estado_envio = 'enviado',
         enviado_at   = now(),
         aprobado_por = auth.uid(),
         aprobado_at  = now(),
         envio_real   = p_envio_real
   where id = p_envio_id
  returning * into v_envio;

  update alumnos
     set emails_enviados_total = emails_enviados_total + 1,
         ultimo_envio_at       = current_date
   where id = v_envio.alumno_id;

  -- El denominador del bandit: un envío más para esta variante.
  if v_envio.plantilla_id is not null then
    update plantillas
       set envios = envios + 1,
           beta   = 1 + (envios + 1) - reactivaciones
     where id = v_envio.plantilla_id;
  end if;

  return v_envio;
end $$;

-- ─── descartar_envio ──────────────────────────────────────────────────────────
-- Un borrador descartado no cuenta: no consume intento del alumno ni toca los
-- contadores de la plantilla. El alumno vuelve a la cola en el siguiente ciclo.

create or replace function descartar_envio(p_envio_id uuid, p_motivo text)
returns envios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_envio envios;
begin
  select * into v_envio from envios where id = p_envio_id for update;

  if v_envio.id is null then
    raise exception 'Envío no encontrado: %', p_envio_id;
  end if;

  if v_envio.estado_envio = 'enviado' then
    raise exception 'No se puede descartar un envío que ya salió';
  end if;

  update envios
     set estado_envio      = 'descartado',
         descartado_motivo = p_motivo,
         aprobado_por      = auth.uid(),
         aprobado_at       = now()
   where id = p_envio_id
  returning * into v_envio;

  return v_envio;
end $$;

-- ─── registrar_resultado ──────────────────────────────────────────────────────
-- El alumno volvió. Marca la reactivación y actualiza los priors de la plantilla
-- que se usó, que es lo que hace que el bandit aprenda.

create or replace function registrar_resultado(p_envio_id uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno_id   uuid;
  v_plantilla   text;
  v_ya_reactivo boolean;
begin
  if p_tipo not in ('reinscripcion','respuesta_email','login') then
    raise exception 'Tipo de reactivación no válido: %', p_tipo;
  end if;

  select e.alumno_id, e.plantilla_id
    into v_alumno_id, v_plantilla
    from envios e where e.id = p_envio_id;

  if v_alumno_id is null then
    raise exception 'Envío no encontrado: %', p_envio_id;
  end if;

  select a.reactivado into v_ya_reactivo from alumnos a where a.id = v_alumno_id for update;

  -- Idempotente: registrar dos veces el mismo resultado no suma dos veces.
  if v_ya_reactivo then
    return;
  end if;

  update alumnos
     set reactivado        = true,
         reactivado_at     = current_date,
         tipo_reactivacion = p_tipo
   where id = v_alumno_id;

  update envios
     set reactivado_at     = current_date,
         tipo_reactivacion = p_tipo,
         respondido        = (p_tipo = 'respuesta_email')
   where id = p_envio_id;

  -- El numerador del bandit. alpha = 1 + reactivaciones, beta = 1 + envios - reactivaciones.
  if v_plantilla is not null then
    update plantillas
       set reactivaciones = reactivaciones + 1,
           alpha          = 1 + (reactivaciones + 1),
           beta           = 1 + envios - (reactivaciones + 1)
     where id = v_plantilla;
  end if;
end $$;

grant execute on function aprobar_envio(uuid, boolean) to authenticated;
grant execute on function descartar_envio(uuid, text)   to authenticated;
grant execute on function registrar_resultado(uuid, text) to authenticated;
