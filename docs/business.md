# Modelo de negocio

**Producto:** Wake Up Heroes — herramienta interna de Learning Heroes
**Fecha:** 2026-08-13

---

## Propuesta de valor

Convierte a los alumnos que Learning Heroes ya pagó por captar y que se quedaron a medias en
alumnos que vuelven, escribiéndoles un email personalizado que un humano revisa en segundos y
midiendo de verdad —contra un grupo de control— cuánto de esa recuperación es mérito del sistema.

Dicho corto: **el activo más barato de Learning Heroes es su propia lista de exalumnos, y hoy está
sin trabajar.**

---

## Modelo de monetización

Wake Up Heroes **no se vende**. Es una herramienta interna, y su retorno se mide en ingresos
recuperados, no en suscripciones. El modelo de negocio que soporta es el de la escuela: venta de
cursos de pago único.

### Contexto económico del que partimos

| Dato | Valor |
|---|---|
| Alumnos en el dataset | 300 |
| Facturación representada | ~99.990 € |
| Ticket medio | ~333 € |
| Rango de precio por curso | 227 € (n8n) – 434 € (Datos y SQL) |
| Alumnos inactivos | 183 (61%) |
| Alumnos que completaron sin siguiente paso ofrecido | 77 |

### Cómo genera dinero la herramienta

Por dos vías, con valor económico muy distinto:

1. **Reinscripción a otro curso** — ingreso nuevo y directo. Es la vía que paga el proyecto.
2. **Retorno al curso ya pagado** (login o respuesta al email) — no genera ingreso inmediato, pero
   produce alumnos que terminan: testimonios, reseñas, boca a boca y mucha más probabilidad de
   comprar el siguiente curso.

El segmento `completado` (77 alumnos, 24 elegibles ahora) es el de mayor valor puro: son gente que
acabó y quedó contenta, y el email es un upsell natural. No por casualidad es la plantilla con mejor
tasa histórica del dataset (22,2%).

### Unit economics estimados por ciclo

Con la base histórica del propio dataset, sin optimismo añadido:

| Concepto | Valor |
|---|---|
| Candidatos elegibles hoy | ~100 |
| Tasa de reactivación observada | 13,2% (42 de 317 envíos) |
| De las reactivaciones, cuántas son reinscripción | 31% (13 de 42) |
| Conversión a ingreso por candidato | ~4,1% |
| Valor esperado por candidato contactado | **~13,7 €** |
| Valor esperado del ciclo completo | **~1.370 €** |

El coste marginal por candidato es la generación del borrador con Claude más el envío del email:
dos órdenes de magnitud por debajo de esos 13,7 €. El punto de equilibrio se cruza con la primera
reinscripción del ciclo.

> **Cómo leer estas cifras.** Son la línea base histórica, no una promesa. La tasa del 13,2% incluye
> gente que habría vuelto sola: por eso existe el holdout, y por eso la métrica que manda es el
> uplift, no la tasa bruta. Si el uplift resulta ser cero, el proyecto no vale nada por muy bonito
> que quede el dashboard. Los datos son sintéticos: sirven para dimensionar y para validar la
> mecánica, no para prometer resultados reales.

---

## Competidores y diferenciación

| Alternativa | Qué hace | Diferencia nuestra |
|---|---|---|
| **Mailchimp / Brevo / ActiveCampaign** | Campañas y automatizaciones sobre segmentos. Personalización por merge tags (`{nombre}`). | Nosotros generamos el mensaje entero por alumno con su contexto real (sesión donde se atascó, motivo declarado), no rellenamos huecos en un texto fijo. |
| **Customer.io / Braze** | Automatización de ciclo de vida, potentes en experimentación. | Precio y complejidad de empresa grande. Nosotros resolvemos un caso concreto de una escuela pequeña, en el idioma del alumno y con la política de supresión escrita en el propio dominio. |
| **Hacerlo a mano** | Emails realmente personales del profesor. | Es lo que mejor convierte y lo que nunca se hace, porque no escala. Wake Up Heroes es un intento de conservar ese tono a coste de mailing. |
| **ChatGPT + hoja de cálculo** | Generar textos a mano y pegarlos en el gestor de correo. | Sin política de supresión, sin cooldown, sin medición y sin memoria de qué funcionó. Es exactamente el proceso que este producto sustituye. |
| **No hacer nada** | El estado actual. | 183 inactivos y 77 completados sin siguiente paso. |

**Lo que nos diferencia de verdad no es que use IA.** Es que el sistema *sabe qué mensajes
funcionan* (bandit sobre priors Beta), *sabe cuánto de eso es mérito suyo* (holdout) y *sabe a quién
no debe escribir* (política de supresión en SQL). Cualquiera puede generar 100 emails con un LLM en
una tarde; el trabajo está en no quemar la lista mientras lo haces.

---

## Métricas de éxito

### Métrica que manda

**Uplift de reactivación sobre el holdout.** Tasa del grupo de tratamiento menos tasa del grupo de
control. Objetivo: **> 5 puntos porcentuales**. Es la única cifra que demuestra causalidad.

### Métricas de producto

| Métrica | Base actual | Objetivo |
|---|---|---|
| Tasa de reactivación (tratamiento) | 13,2% | > 18% |
| Reinscripciones por ciclo de 100 candidatos | ~4 | > 6 |
| Tiempo de revisión por borrador | n/a (hoy no existe) | < 30 s |
| Cola del día despachada en una sesión | n/a | > 80% |

### Métricas de salud de la lista (las que frenan)

Si estas se rompen, da igual lo bien que vaya el resto: hay que parar.

| Métrica | Límite |
|---|---|
| Tasa de bajas (opt-out) por envío | < 2% |
| Quejas de spam | < 0,1% |
| Envíos a alumnos suprimidos | **0. Sin excepción.** |
| Emails por alumno | ≤ 3 (techo duro) |

### Métricas del hackathon

Que la demo se sostenga: dataset cargado, cola funcionando, borrador generado en vivo, envío real
recibido en el buzón del presentador y dashboard mostrando el uplift.

---

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Quemar la lista**: los exalumnos perciben la campaña como spam y se dan de baja en masa | Media | Alto | Techo de 3 emails, cooldown de 14 días, mínimo 21 días de inactividad, baja en un clic. Monitorizar opt-out como métrica de freno. |
| **El LLM inventa** un descuento, una plaza reservada o una fecha límite que no existe | Media | Alto | El prompt prohíbe explícitamente compromisos comerciales; solo recibe campos de la ficha; **revisión humana obligatoria** antes de cada envío. |
| **Tono equivocado**: un email de reactivación puede sonar a reproche a quien lo dejó por motivos económicos o personales | Media | Medio | El motivo declarado condiciona el tono. Segmentos sensibles (`economico`, `cambio_trabajo`) con mensaje suave y sin CTA agresivo. |
| **El uplift resulta ser cero**: reactivan igual sin nosotros | Media | Alto para el proyecto | Es precisamente lo que el holdout está ahí para detectar. Mejor saberlo en la semana 2 que en el mes 6. |
| **Problemas de entregabilidad** al pasar a direcciones reales (dominio nuevo, sin calentar) | Alta si se despliega tal cual | Medio | Fuera del alcance del hackathon. Antes de producción: dominio verificado, SPF/DKIM/DMARC y calentamiento gradual. |
| **Cumplimiento (RGPD/LOPDGDD)**: escribir a quien no consintió | Baja por diseño | Muy alto | El consentimiento es condición en la vista SQL. Es imposible llegar a un candidato no elegible desde la aplicación. |
| **Coste del LLM** si el volumen crece | Baja | Bajo | El borrador se genera una vez y se cachea. A este volumen el coste es irrelevante frente al ticket medio. |
| **Sobreajuste del bandit** a poca muestra: una plantilla con 3 envíos y 1 acierto parece la mejor | Alta | Medio | Thompson sampling ya penaliza la incertidumbre por construcción (los priors Beta anchos exploran más). No sustituir por "elegir el máximo observado". |

---

## Restricciones

**Tiempo.** Es un hackathon. El alcance está recortado a lo que se puede demostrar en vivo y
defender. Todo lo que no aporte a esa demo va al roadmap, no al MVP.

**Datos.** El dataset es 100% sintético (generado el 2026-08-13). Los correos son `@example.com` y
los teléfonos `+34999…`: **no son entregables por diseño**, para que un envío accidental no alcance
a nadie. El envío real solo se hace contra la dirección del propio operador.

**Presupuesto.** Cero o casi. Todo el stack debe funcionar en los planes gratuitos de Supabase,
Vercel y Resend durante la demo.

**Equipo.** Una persona construyendo con asistencia de agente. Nada de piezas que requieran
mantenimiento continuo.

**Ética y marca.** Learning Heroes vive de la relación con sus alumnos. Un email de reactivación mal
calibrado cuesta más que los 333 € que intenta recuperar. Ante la duda entre enviar y no enviar, no
se envía: por eso hay un humano en el bucle y por eso el techo de intentos es duro.
