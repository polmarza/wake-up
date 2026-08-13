-- 003 — Row Level Security
--
-- Modelo simple porque la herramienta es interna: el equipo lo ve todo, el público
-- no ve nada. Lo que sí se acota son las columnas que la aplicación puede escribir.
--
-- Los datos de la ficha del alumno (nombre, curso, progreso, consentimiento…) son de
-- solo lectura desde la aplicación: entran por el seed y no se tocan desde la UI.

alter table alumnos    enable row level security;
alter table plantillas enable row level security;
alter table envios     enable row level security;

-- ─── Privilegios de columna ───────────────────────────────────────────────────
-- Supabase concede permisos amplios sobre el esquema public por defecto.
-- Aquí se retiran y se vuelven a conceder solo los necesarios.

revoke all on alumnos    from anon, authenticated;
revoke all on plantillas from anon, authenticated;
revoke all on envios     from anon, authenticated;

grant select on alumnos to authenticated;
grant update (
  emails_enviados_total,
  ultimo_envio_at,
  reactivado,
  reactivado_at,
  tipo_reactivacion,
  opt_out_at
) on alumnos to authenticated;

grant select on plantillas to authenticated;
grant update (activa) on plantillas to authenticated;

-- envios es la tabla que la aplicación escribe en el día a día.
-- No se concede DELETE a nadie: es el registro de auditoría.
grant select, insert, update on envios to authenticated;

-- ─── Vista ────────────────────────────────────────────────────────────────────
-- Por defecto una vista se evalúa con los privilegios de su propietario, lo que
-- saltaría el RLS de la tabla subyacente. Con security_invoker la vista respeta
-- las políticas de quien la consulta.

alter view candidatos_reactivacion set (security_invoker = on);

revoke all on candidatos_reactivacion from anon, authenticated;
grant select on candidatos_reactivacion to authenticated;

-- ─── Políticas ────────────────────────────────────────────────────────────────

create policy "equipo lee alumnos"
  on alumnos for select to authenticated using (true);

create policy "equipo actualiza campos de campaña"
  on alumnos for update to authenticated using (true) with check (true);

create policy "equipo lee plantillas"
  on plantillas for select to authenticated using (true);

create policy "equipo activa o desactiva plantillas"
  on plantillas for update to authenticated using (true) with check (true);

create policy "equipo lee envios"
  on envios for select to authenticated using (true);

create policy "equipo crea envios"
  on envios for insert to authenticated with check (true);

create policy "equipo actualiza envios"
  on envios for update to authenticated using (true) with check (true);

-- Sin política de DELETE en ninguna tabla: queda denegado para todos.
-- El rol de servicio salta el RLS y es el único que puede sembrar datos.
