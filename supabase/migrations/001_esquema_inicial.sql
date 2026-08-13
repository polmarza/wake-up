-- 001 — Esquema inicial de Wake Up Heroes
--
-- Fiel al schema.sql que acompaña al dataset del hackathon: tres tablas, sus índices
-- y la vista candidatos_reactivacion, que es donde vive toda la política de supresión.
--
-- Todos los datos que se cargan sobre este esquema son sintéticos.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ─── alumnos ──────────────────────────────────────────────────────────────────
-- Ficha del alumno y fuente de verdad de la elegibilidad.

create table if not exists alumnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text not null,
  email citext unique not null,
  telefono text,
  idioma text default 'es',
  curso_id text not null,
  curso_nombre text not null,
  cohorte text,
  total_sesiones int not null,
  precio_pagado_eur numeric,
  fuente_captacion text,
  fecha_alta date not null,
  fecha_fin date,
  estado text not null check (estado in ('activo','inactivo','completado','baja')),
  ultima_sesion_completada int default 0,
  progreso_pct numeric generated always as
    (round(ultima_sesion_completada::numeric / nullif(total_sesiones,0), 2)) stored,
  ultima_actividad_at date,
  motivo_abandono_declarado text,
  canal_preferido text default 'email',
  consentimiento_marketing boolean default false,
  consentimiento_at date,
  opt_out_at date,
  hard_bounce boolean default false,
  queja_spam boolean default false,
  grupo_experimento text default 'tratamiento' check (grupo_experimento in ('tratamiento','holdout')),
  emails_enviados_total int default 0,
  ultimo_envio_at date,
  reactivado boolean default false,
  reactivado_at date,
  tipo_reactivacion text
);

-- ─── plantillas ───────────────────────────────────────────────────────────────
-- Variantes de mensaje y su estado en el bandit.
-- alpha = 1 + reactivaciones, beta = 1 + envios - reactivaciones (priors Beta).

create table if not exists plantillas (
  id text primary key,
  segmento text not null,
  tono text, longitud text, cta text,
  asunto_patron text not null,
  hora_envio time,
  activa boolean default true,
  envios int default 0,
  reactivaciones int default 0,
  alpha numeric default 1,
  beta  numeric default 1
);

-- ─── envios ───────────────────────────────────────────────────────────────────
-- Histórico de intentos. Es el registro de auditoría del sistema: no se borra nunca.

create table if not exists envios (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid references alumnos(id) on delete cascade,
  plantilla_id text references plantillas(id),
  segmento text,
  canal text default 'email',
  asunto text,
  cuerpo text,
  modelo_generador text,
  prompt_version text,
  enviado_at timestamptz not null default now(),
  entregado boolean default true,
  abierto_at date, click_at date,
  respondido boolean default false,
  reactivado_at date,
  tipo_reactivacion text,
  unsubscribe boolean default false,
  bounce boolean default false
);

create index if not exists idx_envios_alumno on envios(alumno_id, enviado_at desc);
create index if not exists idx_envios_plantilla on envios(plantilla_id);
create index if not exists idx_alumnos_estado on alumnos(estado, ultima_actividad_at);

-- ─── candidatos_reactivacion ──────────────────────────────────────────────────
-- Candidatos elegibles. Única fuente de la cola.
-- Toda la política de supresión vive aquí, no en el prompt del LLM ni en la aplicación.

create or replace view candidatos_reactivacion as
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
  and (current_date - a.ultima_actividad_at) >= 21          -- no molestar a quien sigue vivo
  and (a.ultimo_envio_at is null or current_date - a.ultimo_envio_at >= 14)  -- cooldown
  and a.emails_enviados_total < 3                            -- techo de intentos
order by (current_date - a.ultima_actividad_at) asc, a.progreso_pct desc;
