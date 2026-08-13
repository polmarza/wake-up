# Roadmap

Guía de prioridades, no calendario. El contexto es un hackathon: la Fase 1 tiene que estar viva y
demostrable, y todo lo que no aporte a esa demo espera.

---

## Fase 0 — Cimientos

Sin esto no hay nada que enseñar. Es la fase que no se ve en la demo y sin la cual la demo no
existe.

- [x] Proyecto Next.js 16 + TypeScript + Tailwind 4 con los tokens de marca
- [x] Proyecto Supabase creado y conectado
- [x] Migración `001` — esquema del dataset (tablas, índices, vista `candidatos_reactivacion`)
- [x] Migración `002` — campos del flujo de aprobación
- [x] Script de importación del dataset (`pnpm seed`), idempotente
- [x] Verificación: la vista devuelve ~100 candidatos y ninguno de los 200 suprimidos
- [x] Autenticación con magic link y lista blanca
- [x] Variables de entorno y `ENVIO_REAL_HABILITADO` a `false`

**Criterio de salida:** consultar la vista desde la aplicación y ver la lista real de candidatos.

---

## Fase 1 — MVP demostrable ✅

El producto completo de punta a punta, en su versión mínima. Es lo que se presenta.

### Cola de revisión
- [x] Lista de candidatos priorizada con badge de segmento, días inactivo y progreso
- [x] Ficha del alumno con todo el contexto: curso, sesión donde se quedó, motivo declarado,
      historial de envíos, estado de consentimiento
- [x] Barra de guardarraíles: por qué este alumno es elegible y cuántos intentos le quedan

### Generación
- [x] Selección de plantilla por Thompson sampling sobre `alpha`/`beta`
- [x] Prompt por segmento con tono, longitud y CTA de la plantilla elegida
- [x] Generación con Claude (sin streaming: el borrador tarda 5–8 s y aparece entero)
- [x] Validación del resultado y reintento único si no valida
- [x] Mostrar qué variante se eligió y con qué priors

### Aprobación
- [x] Editar asunto y cuerpo antes de aprobar
- [x] Aprobar → registra el envío, incrementa contadores, activa el enfriamiento
- [x] Descartar con motivo → no consume intento
- [x] Envío real de prueba al buzón del operador vía Resend (a falta de credenciales de Resend)

> Ya funciona además, sin haber estado planificado aquí: generación en el idioma del alumno
> (castellano y catalán) y regenerar el borrador con una instrucción libre del operador.

### Resultados
- [x] Tasa de reactivación por segmento
- [x] Rendimiento por plantilla con sus priors actualizados
- [x] **Uplift tratamiento vs holdout**, con el tamaño de cada grupo a la vista

**Objetivo de validación:** demostrar que el sistema decide *a quién* escribir con criterio
auditable, escribe algo que un humano firmaría sin retocar, y sabe medir si sirvió de algo. La
pregunta que la demo debe responder: *¿cuántos de estos habrían vuelto solos?*

---

## Fase 2 — Cerrar el ciclo

Lo que convierte la demo en una herramienta que se usa cada semana. Aquí es donde el sistema empieza
a aprender de verdad.

- [x] Registrar el resultado de cada envío (reinscripción / respuesta / login)
- [x] Actualización automática de `alpha`/`beta` al registrar resultado
- [x] Enlace de baja funcional con token, y salida inmediata de la cola
- [x] Webhook de Resend: rebotes, quejas y bajas actualizan la supresión solos
- [ ] Filtros de la cola por curso, segmento, cohorte e inactividad
- [x] Vista de auditoría por alumno (historial en la ficha + bandeja de seguimiento)
- [x] Cron diario que precalcula los borradores del día

**Objetivo de validación:** que la cola del día esté lista antes de que llegue el operador y que las
plantillas que no funcionan se apaguen solas sin que nadie las toque.

---

## Fase 3 — Escalado

Solo tiene sentido si la Fase 2 demuestra uplift positivo. Si el uplift es cero, esta fase no se
construye: se replantea el mensaje.

- [ ] Significancia estadística del uplift, no solo la diferencia bruta
- [ ] Canal WhatsApp para los 80 alumnos que lo prefieren
- [ ] Respetar la `hora_envio` de cada plantilla al programar la salida
- [ ] Modo automático en segmentos seguros (`completado` → upsell), manteniendo la cola para el resto
- [ ] Nuevas variantes de plantilla generadas por el propio modelo y metidas en el bandit
- [ ] Roles y permisos: quién puede aprobar y quién solo mirar
- [ ] Segmentación por motivo de abandono, no solo por progreso
- [ ] Export CSV de cola y resultados
- [ ] Paso a datos reales: dominio verificado, SPF/DKIM/DMARC y calentamiento gradual

---

## Descartado (con motivo)

| Funcionalidad | Motivo del descarte |
|---|---|
| Envío autónomo sin revisión humana | El coste de un email mal calibrado a un exalumno supera al valor que intenta recuperar. Decisión de producto, revisable en Fase 3 y solo por segmento. |
| Envío real a las direcciones del dataset | Son `@example.com`. Rebotarían y ensuciarían la reputación del dominio. |
| Editor visual de plantillas | Ocho variantes en base de datos. Construir un editor cuesta más que el problema que resuelve. |
| Predicción de abandono antes de que ocurra | Otro producto, otras métricas. Aquí actuamos sobre gente que ya se fue. |
| Panel para el alumno | El alumno recibe un email y puede darse de baja. Nada más. |
| Multi-tenant para otras escuelas | Herramienta interna de Learning Heroes. |
| Secuencias automáticas de varios toques | El techo de 3 emails por alumno es un guardarraíl, no una limitación técnica que haya que sortear. |
