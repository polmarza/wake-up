# Wake Up Heroes

> ### ⚠️ Repositorio de hackathon. Nada de aquí es real.
>
> Este proyecto se construyó en unas horas para un hackathon de **Learning Heroes** y es una prueba
> de concepto, no un sistema en producción ni un repositorio filtrado.
>
> - **Los 300 alumnos son inventados.** El dataset es sintético: el dominio `example.com` está
>   reservado por la [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) y el prefijo `+34 999` no
>   corresponde a números reales. Ninguna persona real aparece en estos datos, y un envío accidental
>   no alcanzaría a nadie.
> - **Las cifras de negocio son ilustrativas**, calculadas sobre ese dataset inventado para
>   dimensionar el problema. No son datos de Learning Heroes.
> - **Nunca se ha escrito a un alumno real** con esta herramienta.

Herramienta interna de Learning Heroes para recuperar alumnos que dejaron un curso a medias:
selecciona a quién escribir con criterio auditable, redacta el email con Claude, lo pasa por
revisión humana y mide si sirvió de algo contra un grupo de control.

---

## Qué problema resuelve

Learning Heroes tiene 300 alumnos registrados. **183 están inactivos** y 77 completaron su curso sin
que nadie les ofreciera el siguiente paso. Dos de cada tres personas que pagaron están hoy fuera del
circuito.

Escribirles uno a uno no escala: el email que necesita quien se quedó en la sesión 2 de 12 porque el
nivel le venía grande no se parece al que necesita quien terminó el curso entero. Y mandarles a
todos el mismo texto quema la lista, dispara las bajas y, con 33 alumnos sin consentimiento de
marketing y 19 dados de baja, deja de ser un problema de conversión para ser uno legal.

Wake Up Heroes hace tres cosas:

1. **Decide a quién se puede escribir** aplicando la política de supresión en SQL —consentimiento,
   rebotes, quejas, techo de intentos, periodo de enfriamiento— y no en la cabeza de nadie.
2. **Redacta el email** con Claude, usando el nombre, el curso, la sesión exacta donde se quedó el
   alumno y el motivo de abandono que declaró.
3. **Mide si funciona** contra un *holdout* del 15% que nunca recibe nada, y aprende qué variantes
   convierten mediante Thompson sampling sobre los priors Beta de cada plantilla.

Ningún email sale sin que una persona lo lea y le dé al botón.

---

## Estado del proyecto

**En desarrollo** — MVP de hackathon. **Fases 0, 1 y 2 completadas**:

- [x] Proyecto Next.js 16 + TypeScript + Tailwind 4
- [x] Migraciones SQL (esquema, flujo de aprobación, RLS, funciones, baja pública)
- [x] Script de importación del dataset, idempotente y con verificación de la supresión
- [x] Autenticación con magic link y lista blanca
- [x] Cola de candidatos en modo lectura
- [x] Tests de la política de supresión (a la espera de base de datos de test)
- [x] Base de datos en marcha: migraciones aplicadas y dataset cargado (**97 candidatos elegibles**)
- [x] Thompson sampling sobre los priors Beta de cada plantilla
- [x] Generación del borrador con Claude, validada y con reintento
- [x] Pantalla de revisión: ficha, borrador editable, aprobar / descartar / probar en tu buzón
- [x] Dashboard de resultados con el uplift contra el holdout
- [x] Baja pública por token, seguimiento de resultados, webhook de Resend y cron diario

**Fases 0, 1 y 2 completas.** Del roadmap solo quedan los filtros de la cola y la Fase 3.

Los datos son **100% sintéticos**: dominio `example.com` y prefijo `+34999`, no entregables por
diseño, de modo que un envío accidental no alcanza a nadie. La única excepción es el *alumno real*
opcional que añade el seed (ver `ALUMNO_REAL_*` en `.env.example`), pensado para poder ver un email
de verdad en la demo.

---

## Requisitos previos

- **Node.js 20+**
- **pnpm v11** — no usar npm ni yarn
- Cuenta de **Supabase** (plan gratuito basta)
- Clave de la **Claude API**
- Cuenta de **Resend** (solo para el envío real de prueba)

---

## Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores. Nunca comitees `.env.local`.

Las tres que conviene mirar dos veces:

| Variable | Para qué |
|---|---|
| `SUPABASE_SECRET_KEY` | Solo servidor. Nunca debe llegar al cliente |
| `ENVIO_REAL_HABILITADO` | Interruptor de seguridad. En `false`, ningún email sale al exterior |
| `EMAIL_OPERADOR` y `ALUMNO_REAL_EMAIL` | Las dos únicas direcciones que pueden recibir envíos reales |
| `EMAILS_PERMITIDOS` | Quién entra al panel. Admite direcciones sueltas y dominios enteros: `polmarza@gmail.com,@learningheroes.com` |

---

## Instalación y desarrollo

```bash
pnpm install
```

```bash
pnpm dev
```

Antes de nada hace falta un proyecto de Supabase con las migraciones de
`supabase/migrations/` aplicadas **en orden**. Después, carga del dataset (idempotente, se puede
reejecutar):

```bash
pnpm seed
```

El seed no solo importa: verifica que la vista devuelve candidatos y que **ningún alumno suprimido
se ha colado en la cola**. Si algo de eso falla, aborta con error en vez de dejarte creer que todo
fue bien.

Tests:

```bash
pnpm test
```

---

## Acceso al panel: por qué la plantilla del correo importa

El acceso es por enlace mágico, y Supabase lo puede entregar de dos maneras. La diferencia no es
cosmética:

- **`{{ .ConfirmationURL }}`** (plantilla por defecto) usa el flujo PKCE: guarda un verificador **en
  el navegador que pidió el enlace** y lo necesita para completar el canje. Si el correo abre el
  enlace en otro navegador, en otro perfil, en la vista web de la aplicación de correo o tras
  limpiar el almacenamiento, falla con `PKCE code verifier not found in storage` y no hay forma de
  recuperarlo.
- **`{{ .TokenHash }}`** hace el canje entero en el servidor. No depende de nada guardado antes, así
  que el enlace funciona se abra donde se abra. Es lo que Supabase recomienda para aplicaciones con
  servidor, y lo que usa este proyecto.

En Supabase → Authentication → Email Templates → **Magic Link**, deja el cuerpo así:

```html
<h2>Wake Up Heroes</h2>
<p>Entra al panel con este enlace:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Entrar</a></p>
```

Conviene hacer lo mismo en la plantilla **Confirm signup**, cambiando `type=magiclink` por
`type=signup`: es la que se envía la primera vez que entra alguien cuya cuenta aún no existe.

`/auth/callback` se mantiene para los enlaces del flujo antiguo, pero la ruta buena es
`/auth/confirm`.

---

## Si el enlace de acceso no llega

El correo de acceso **no lo manda Resend**: lo manda Supabase Auth con su servicio de email
integrado, que tiene dos límites importantes y poco visibles:

- **2 mensajes por hora.** Pedir varios enlaces seguidos agota la cuota y los siguientes intentos
  fallan con `over_email_send_rate_limit`.
- **Solo a direcciones preautorizadas** del equipo de la organización en Supabase. Cualquier otra
  recibe *Email address not authorized*.

Para saber qué está pasando de verdad (la pantalla de login oculta el error a propósito, para no
revelar quién pertenece al equipo):

```bash
pnpm tsx scripts/probar-login.ts
```

Para entrar ahora mismo sin depender del correo, genera el enlace por consola con la clave de
servicio:

```bash
pnpm tsx scripts/enlace-acceso.ts
```

Es de un solo uso y caduca. No lo compartas: quien lo tenga entra con esa cuenta.

**La solución definitiva** es configurar SMTP propio en Supabase (Authentication → Emails → SMTP
Settings). Resend sirve para esto, así que la misma cuenta cubre el acceso al panel y el envío real
de prueba.

---

## Despliegue

El repositorio está en [github.com/polmarza/wake-up](https://github.com/polmarza/wake-up) y el
despliegue es Vercel. Importa el repositorio desde el panel (Add New → Project) y añade las
variables de entorno antes del primer despliegue.

### Variables que hay que crear en Vercel

Los valores son los mismos de tu `.env.local`, salvo los dos marcados:

| Variable | Nota |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | |
| `SUPABASE_SECRET_KEY` | Solo servidor |
| `ANTHROPIC_API_KEY` | |
| `ANTHROPIC_MODEL` | `claude-opus-5` |
| `RESEND_API_KEY` | |
| `RESEND_FROM` | |
| `RESEND_WEBHOOK_SECRET` | Se rellena después de crear el webhook |
| `ENVIO_REAL_HABILITADO` | `false` mientras no quieras que salga nada |
| `EMAIL_OPERADOR` | |
| `ALUMNO_REAL_EMAIL` | |
| `EMAILS_PERMITIDOS` | |
| `CRON_SECRET` | |
| `NEXT_PUBLIC_APP_URL` | **Cambia**: la URL de producción, no `localhost` |

`DATABASE_URL` no hace falta en Vercel: solo se usa para migraciones y seed desde tu máquina.

### Dos cosas que rompen en producción si se olvidan

1. **`NEXT_PUBLIC_APP_URL` apuntando a `localhost`.** Es la base del enlace de baja que va dentro de
   cada email: si se queda en local, mandas a los alumnos un enlace que no lleva a ninguna parte.
2. **Las URLs de redirección de Supabase.** En Authentication → URL Configuration hay que añadir la
   URL de producción como *Site URL* y `https://…/auth/callback` a *Redirect URLs*. Sin eso el
   enlace mágico de acceso falla en producción aunque funcione en local.

### Cron

`vercel.json` programa `/api/cron/preparar-cola` de lunes a viernes a las 7:00. En plan Hobby la
expresión es válida —una ejecución al día— pero la hora es aproximada: Vercel documenta una
precisión de ±59 minutos.

---

## Webhook de Resend

El webhook es lo que hace que un rebote o una queja de spam saquen al alumno de la cola sin que
nadie tenga que acordarse. **Resend llama desde sus servidores, así que el endpoint tiene que ser
público y HTTPS**: en `localhost` no hay nada que configurar.

Orden que funciona:

1. **Despliega** (o levanta un túnel con `ngrok` / `cloudflared` si quieres probar en local).
2. **Da de alta el webhook**, por panel —Resend → Webhooks → Add Webhook— o por API:

   ```bash
   pnpm tsx scripts/configurar-webhook.ts https://tu-app.vercel.app
   ```

   Suscríbete solo a los eventos que el endpoint entiende: `email.delivered`, `email.opened`,
   `email.clicked`, `email.bounced`, `email.complained` y `email.failed`. El script guarda la clave
   de firma en `.env.local` en lugar de dejarla en el scroll de la terminal.
3. **Copia `RESEND_WEBHOOK_SECRET` al entorno de Vercel** y vuelve a desplegar. Sin esa variable el
   endpoint responde `503` y no procesa nada; con una firma que no cuadra, `401`.

Estado actual: webhook dado de alta contra `https://wake-up-beta.vercel.app/api/webhooks/resend`.

**Hasta que no hagas un envío real, el webhook no tiene nada que hacer.** Los eventos se casan con
el envío por `resend_id`, y ese campo solo se rellena cuando el email sale de verdad
(`ENVIO_REAL_HABILITADO=true` y destinatario en la lista permitida). Antes de eso, todo evento que
llegue se responde con `envío desconocido`, que es el comportamiento correcto.

---

## Estructura de carpetas

```
docs/                → Documentación funcional y técnica. Leer antes de tocar código
src/app/             → Rutas (App Router). La cola de revisión es la pantalla principal
src/lib/candidatos/  → Lectura de la vista de elegibilidad y priorización
src/lib/bandit/      → Thompson sampling y actualización de priors
src/lib/generacion/  → Prompts, llamada a Claude y validación del resultado
src/lib/email/       → Render del email y cliente de Resend
src/lib/resultados/  → Agregación del uplift, segmentos y plantillas
supabase/migrations/ → Migraciones SQL en orden
scripts/             → Importación del dataset y utilidades de diagnóstico
changelog/           → Registro de cambios importantes
mejoras/             → Backlog de ideas que no entran en el sprint
```

El detalle está en [docs/architecture.md](docs/architecture.md).

---

## Documentación

| Documento | Contenido |
|---|---|
| [prd.md](docs/prd.md) | Qué construimos, para quién y con qué prioridades |
| [business.md](docs/business.md) | Contexto económico, métricas de éxito y riesgos |
| [architecture.md](docs/architecture.md) | Stack, estructura y decisiones técnicas |
| [data-model.md](docs/data-model.md) | Tablas, vista de elegibilidad, RLS y migraciones |
| [design-system.md](docs/design-system.md) | Paleta, tipografía y componentes |
| [user-flows.md](docs/user-flows.md) | Flujos con diagramas y casos de error |
| [roadmap.md](docs/roadmap.md) | Fases y qué se ha descartado |
| [testing.md](docs/testing.md) | Qué se testea y por qué |

---

## Cómo contribuir

Lee [CLAUDE.md](CLAUDE.md) antes de hacer cambios. En resumen:

1. Rama por funcionalidad, nunca directo a `main`.
2. Todo cambio importante lleva su entrada en `changelog/` (`/changelog`).
3. Si el cambio afecta a algo documentado en `docs/`, se actualiza en la misma sesión.
4. Los PRs los abre el agente con la plantilla rellena y el checklist verificado.
5. Antes de mergear a producción, `/security-review`.

**Regla que no se negocia:** cualquier cambio en las condiciones de la vista
`candidatos_reactivacion` es un cambio de política de contacto. Se documenta, se registra en el
changelog y se acompaña de un test.
