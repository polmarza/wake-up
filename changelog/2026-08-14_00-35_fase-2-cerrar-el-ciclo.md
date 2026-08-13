# Fase 2 — Baja pública, seguimiento de resultados, webhook y cron

**Fecha:** 2026-08-14 00:35
**Tipo:** Feature

## Qué se hizo

**Baja pública** (`/baja/[token]`). Sin sesión, sin pedir el correo, sin preguntar por qué. Dos
decisiones que parecen detalles y no lo son:

- **La baja se confirma con un botón, no con la visita.** Los antivirus corporativos y los escáneres
  de enlaces abren todas las URLs de un correo antes de que lo lea nadie. Si la baja ocurriera al
  cargar la página, esos escáneres darían de baja a media lista sin que ningún humano hiciera clic.
- **La acción usa la clave publicable, no la de servicio.** Una ruta pública no necesita privilegios
  de administrador, y dárselos sería ampliar el daño posible de cualquier fallo futuro.

**Seguimiento** (`/seguimiento`). La bandeja del ciclo: envíos que ya salieron y siguen sin
resultado. Un clic registra si el alumno se reinscribió, respondió o volvió a entrar, y eso llama a
`registrar_resultado()`, que **recalcula los priors de la plantilla en la misma transacción**. Es
literalmente el punto donde el bandit aprende.

**Webhook de Resend** (`/api/webhooks/resend`). Aperturas, clics, entregas, rebotes y quejas. Firma
verificada con `resend.webhooks.verify()` del SDK oficial, sobre el cuerpo crudo. Solo el rebote
**permanente** suprime al alumno: un rebote temporal —buzón lleno, servidor caído— no significa que
la dirección no exista, y tratarlo como definitivo borraría alumnos válidos para siempre. Una queja
de spam sí es definitiva.

**Cron diario** (`/api/cron/preparar-cola` + `vercel.json`, laborables a las 7:00). Prepara hasta 10
borradores y **no envía nada**. Ese límite no es técnico —dejar que despache la cola serían pocas
líneas— sino la decisión de producto de la que cuelga todo lo demás. Lo que cambia es de quién es el
trabajo: el operador pasa de redactar a decidir.

## Qué se modificó

- `src/app/baja/[token]/{page.tsx,accion.ts}`
- `src/app/(app)/seguimiento/page.tsx`, `src/components/seguimiento/BotonesResultado.tsx`,
  `src/app/(app)/resultados/acciones.ts`, `src/lib/alumnos/consultas.ts`
- `src/app/api/webhooks/resend/route.ts`, `src/app/api/cron/preparar-cola/route.ts`
- `vercel.json` — programación del cron
- `src/lib/config/entorno.ts` — `RESEND_WEBHOOK_SECRET`
- `src/app/(app)/resultados/page.tsx` — enlace a seguimiento

## Verificación

Todo probado contra el proyecto real, no simulado:

- **Baja**: alumno de prueba creado con `psql`, baja llamada **con la clave pública** (rol `anon`)
  como haría el alumno → HTTP 204, `opt_out_at` escrito y desaparece de `candidatos_reactivacion`.
  Un token inventado devuelve exactamente lo mismo. Alumno de prueba borrado después
- **Cron**: sin secreto → 401; con secreto incorrecto → 401; con secreto válido → **10 borradores
  generados en 62 s, cero fallos**
- **Webhook**: sin secreto configurado → 503; con secreto y firma inválida → 401; sin cabeceras → 401
- `pnpm build`, `pnpm lint`, `pnpm test` (30 pasan, 14 saltados)

## Un dato engañoso que se corrigió

El cron devolvía `candidatosPendientes` calculado sobre una lista ya truncada por el `limit` de su
propia consulta: parecía un total y no lo era. Ahora se cuenta aparte, y se llama
`candidatosElegiblesEnTotal`.

## Efecto secundario buscado

La ejecución de prueba del cron dejó **10 borradores reales esperando en la base de datos**. Al abrir
la aplicación, la cola ya tiene trabajo hecho — que es exactamente la historia que cuenta el modo
autónomo.

## Pendiente de la Fase 2

- Filtros de la cola por curso, segmento, cohorte e inactividad
- El bloque de `next dev` en `CLAUDE.md`: lo añade la propia herramienta en cada arranque y se
  recrea si se borra, así que se deja commiteado
