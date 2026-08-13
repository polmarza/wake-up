# Fase 1 — Thompson sampling, generación con Claude y aprobación humana

**Fecha:** 2026-08-14 00:20
**Tipo:** Feature

## Qué se hizo

**Thompson sampling** (`src/lib/bandit/thompson.ts`). Muestreo Beta por el método de
Marsaglia-Tsang sobre los priors `alpha`/`beta` de cada variante, con generador de semilla propio
para que los tests sean reproducibles. Diez tests cubren lo que importa: que favorece a la mejor
variante, que **sigue explorando** (la peor no queda a cero), que explora más cuando la muestra es
pequeña, que apaga poco a poco una variante con cero reactivaciones y que nunca elige una plantilla
desactivada.

**Generación con Claude** (`src/lib/generacion/`). Prompt por segmento con el tono, la longitud y el
CTA de la plantilla elegida, y la ficha real del alumno: sesión donde se quedó, días inactivo,
motivo declarado, idioma. Salida estructurada (`output_config.format` con JSON Schema), así que no
hay que pelearse con JSON mal formado. Un reintento y, si el segundo tampoco valida, el borrador se
marca como fallido.

**Validación del texto.** Bloquea marcadores sin sustituir (`{nombre}`) y compromisos que la escuela
tendría que cumplir después: descuentos, gratuidad, becas, reembolsos, plazas reservadas, importes
concretos. No es una lista de estilo — cada patrón implica una obligación real.

**Pantalla de revisión** (`/cola/[id]`). Ficha completa a la izquierda, borrador editable a la
derecha. Muestra qué plantilla eligió el bandit y con qué priors, por qué el alumno es elegible
condición por condición, y el historial de lo que ya se le escribió. Botones: aprobar, probar en mi
buzón, regenerar (con instrucción libre opcional) y descartar.

**Server actions** (`src/app/(app)/cola/acciones.ts`). Aprobar y descartar pasan por las funciones
de base de datos, que revalidan la elegibilidad y mueven los contadores en una sola transacción. El
envío real se intenta *después* de cerrar el registro: si Resend falla, el envío consta igualmente y
el operador ve el motivo, en lugar de quedar un alumno a medias.

**Modelo: `claude-opus-5`** en lugar del Sonnet que decía la documentación. El email *es* el
producto; un texto que suene a plantilla arruina la campaña entera. Se cambia con `ANTHROPIC_MODEL`
si se prefiere abaratar.

**Script de prueba** (`pnpm tsx scripts/probar-generacion.ts [email]`) que genera un borrador real
por consola sin tocar la base de datos ni enviar nada. Es la forma rápida de iterar sobre el prompt.

## Qué se modificó

- `src/lib/bandit/thompson.ts` + tests
- `src/lib/generacion/{prompt,esquema,generar}.ts` + tests de validación
- `src/lib/email/{render,enviar}.ts` — render HTML/texto con enlace de baja y envío guardado
- `src/lib/plantillas/consultas.ts`, `src/lib/candidatos/consultas.ts` (ficha, historial, borrador)
- `src/app/(app)/cola/[id]/page.tsx`, `src/components/cola/BorradorPanel.tsx`, `acciones.ts`
- `src/lib/config/entorno.ts` — variables vacías tratadas como ausentes, y lista de destinatarios
  reales permitidos
- `scripts/probar-generacion.ts`
- `docs/architecture.md`, `docs/roadmap.md`, `CLAUDE.md` — modelo y estado

## Por qué

Es la fase que se presenta. Sin ella el proyecto es una cola bonita: lo que hay que demostrar es que
el sistema elige la variante con criterio estadístico, escribe algo que un profesor firmaría, y no
deja que salga nada sin que una persona lo lea.

## Dos correcciones sobre lo documentado

- **Sin streaming.** La documentación decía que el borrador se mostraría en streaming. Se genera
  entero en 5–8 s con un estado de carga: montar streaming sobre Server Actions añadía complejidad
  sin mejorar la demo.
- **Variables de entorno vacías tumbaban el arranque.** `z.string().min(1).optional()` rechaza la
  cadena vacía en vez de tratarla como ausente, así que un `.env.local` copiado de `.env.example`
  fallaba con un error que señalaba una clave que ni siquiera hacía falta.

## Verificación

- `pnpm build`, `pnpm lint`, `pnpm test` (30 pasan, 14 saltados a la espera de base de datos de test)
- Generación real contra la API en tres perfiles distintos: un `completado` (upsell), el alumno real
  en `abandono_tardio`, y un alumno en catalán que lo dejó por motivos económicos
- El caso económico es el que mejor demuestra el guardarraíl: el email no ofrece ningún descuento,
  que es justo lo que el validador habría bloqueado

## Pendiente

- Dashboard de resultados con el uplift contra el holdout (lo que queda de la Fase 1)
- Claves de Resend, para probar el envío real de verdad
