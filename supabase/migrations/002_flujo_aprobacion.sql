-- 002 — Flujo de aprobación humana
--
-- El esquema del dataset asume que un envío se registra cuando ya ha salido. Aquí
-- introducimos el paso intermedio: un borrador que un humano revisa antes de aprobar.
--
-- La vista se recrea al final porque `select a.*` expande las columnas en el momento
-- de crearla: sin recrearla, baja_token no aparecería en los candidatos.

-- ─── alumnos ──────────────────────────────────────────────────────────────────

-- Token de la URL de baja. Permite darse de baja sin autenticación y sin exponer
-- el id del alumno ni su correo en la URL.
alter table alumnos
  add column if not exists baja_token uuid not null default gen_random_uuid();

create unique index if not exists idx_alumnos_baja_token on alumnos(baja_token);

-- ─── envios ───────────────────────────────────────────────────────────────────

alter table envios
  add column if not exists estado_envio text not null default 'borrador',
  add column if not exists aprobado_por uuid references auth.users(id),
  add column if not exists aprobado_at timestamptz,
  add column if not exists editado_por_humano boolean not null default false,
  add column if not exists descartado_motivo text,
  add column if not exists envio_real boolean not null default false,
  add column if not exists resend_id text;

-- Un borrador todavía no se ha enviado.
alter table envios alter column enviado_at drop not null;
alter table envios alter column enviado_at drop default;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'envios_estado_envio_check'
  ) then
    alter table envios add constraint envios_estado_envio_check
      check (estado_envio in ('borrador','aprobado','enviado','descartado','fallido'));
  end if;
end $$;

-- Un envío enviado tiene que tener fecha. Un borrador, no.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'envios_enviado_at_coherente'
  ) then
    alter table envios add constraint envios_enviado_at_coherente
      check (estado_envio <> 'enviado' or enviado_at is not null);
  end if;
end $$;

create index if not exists idx_envios_estado on envios(estado_envio, alumno_id);

-- Un alumno no puede tener dos borradores pendientes a la vez: evita que el cron
-- duplique trabajo si se ejecuta dos veces el mismo día.
create unique index if not exists idx_envios_borrador_unico
  on envios(alumno_id) where estado_envio = 'borrador';

-- ─── vista ────────────────────────────────────────────────────────────────────
-- Se recrea con las columnas nuevas. Las condiciones no cambian ni una coma:
-- cualquier cambio aquí sería un cambio de política de contacto.

drop view if exists candidatos_reactivacion;

create view candidatos_reactivacion as
select a.*,
       (current_date - a.ultima_actividad_at) as dias_inactivo,
       case
         when a.estado = 'completado' then 'completado'
         when a.ultima_sesion_completada = 0 then 'nunca_empezo'
         when a.progreso_pct < 0.34 then 'abandono_temprano'
         when a.progreso_pct < 0.7  then 'abandono_medio'
         else 'abandono_tardio'
       end as segmento_calculado
from alumnos a
where a.consentimiento_marketing
  and a.opt_out_at is null
  and not a.hard_bounce
  and not a.queja_spam
  and not a.reactivado
  and a.estado <> 'baja'
  and a.grupo_experimento = 'tratamiento'
  and (current_date - a.ultima_actividad_at) >= 21
  and (a.ultimo_envio_at is null or current_date - a.ultimo_envio_at >= 14)
  and a.emails_enviados_total < 3
order by (current_date - a.ultima_actividad_at) asc, a.progreso_pct desc;
