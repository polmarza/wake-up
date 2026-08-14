# Product Requirements Document (PRD)

**Producto:** Wake Up Heroes
**Versión:** 1.0 (MVP de hackathon)
**Fecha:** 2026-08-13

---

## Resumen ejecutivo

Wake Up Heroes es una herramienta interna de Learning Heroes para **recuperar alumnos que
dejaron un curso a medias**. No es un producto que se venda: es el panel desde el que el equipo
decide, cada semana, a quién merece la pena escribir y qué decirle.

El sistema hace tres cosas que hoy nadie hace a mano: (1) calcula quién es elegible aplicando la
política de supresión —consentimiento, rebotes, quejas, techo de intentos, periodo de enfriamiento—
en SQL y no en la cabeza de nadie; (2) redacta con Claude un email personalizado usando el nombre,
el curso, la sesión exacta donde se quedó el alumno y el motivo de abandono declarado; y (3) mide
si eso funciona de verdad contra un grupo de control que nunca recibe nada.

La pieza que lo diferencia de "otro generador de emails con IA" es que **aprende**. Cada plantilla
guarda sus propios contadores de éxito (`alpha`/`beta`) y el sistema elige cuál usar mediante
Thompson sampling: las variantes que reactivan se envían más, las que no, se apagan solas. Y como
un 15% de los alumnos está en un *holdout* que nunca recibe correo, siempre se puede responder a la
pregunta incómoda: *¿cuántos de estos habrían vuelto igualmente?*

El humano no desaparece del proceso. Ningún email sale sin que alguien lo lea y le dé al botón.

---

## Problema que resuelve

Learning Heroes tiene 300 alumnos registrados. **183 están inactivos** y 77 completaron su curso
sin que nadie les haya ofrecido el siguiente paso. Es decir: dos de cada tres personas que pagaron
están hoy fuera del circuito.

Desde la perspectiva del equipo, el problema no es de falta de ganas, es de coste por unidad:

- **Escribir a mano no escala.** Un email útil para Laura, que se quedó en la sesión 2 de 12 y
  declaró que el nivel le venía grande, no se parece en nada al que necesita Oriol, que terminó el
  curso entero. Personalizar 100 emails a mano es una tarde de trabajo que nunca llega.
- **El mailing masivo es peor que no hacer nada.** Mandar el mismo texto a todos quema la lista,
  dispara las bajas y no convierte. Además hay 33 alumnos sin consentimiento de marketing, 11 con
  rebote duro, 2 que marcaron spam y 19 que se dieron de baja: escribirles no es ineficaz, es un
  problema legal.
- **Nadie sabe qué funciona.** Se han enviado 317 emails históricos con 42 reactivaciones (13,2%),
  pero sin grupo de control esa cifra no dice nada: parte de esa gente habría vuelto sola.
- **La oportunidad tiene fecha de caducidad.** La mediana de inactividad ya es de 222 días. Cuanto
  más se tarda, más frío está el alumno.

Desde la perspectiva del alumno el problema es otro, y conviene no olvidarlo: **se quedó atascado y
nadie se dio cuenta**. Los motivos declarados son concretos y accionables —nivel bajo (26), falta de
tiempo (23), nivel alto (23), económico (20), cambio de trabajo (17), problema técnico (14)—. Un
email que reconozca el motivo real no es spam: es el seguimiento que debería haber existido.

---

## Usuario objetivo

### Perfil principal — Responsable de programa (el que aprueba)

**Persona:** Pol, 38 años. Profesor y responsable de los programas de vibe coding en Learning
Heroes. Conoce a los alumnos por su nombre y le duele ver a alguien caer en la sesión 2.

- **Motivación:** recuperar alumnos sin convertirse en el pesado del email, y saber qué mensaje
  funciona en lugar de intuirlo.
- **Frustración que resolvemos:** hoy la reactivación es una lista de tareas que nunca sube a lo
  alto de la pila. Quiere abrir una pantalla, ver 10 personas concretas con contexto real, revisar
  10 borradores en cinco minutos y darle a enviar.
- **Lo que NO quiere:** una caja negra que mande correos en su nombre sin que él los lea.

### Perfil secundario — Operaciones / marketing (el que mide)

Necesita justificar que la campaña merece la pena: cuánto se ha recuperado, a qué coste, cuál es el
uplift real contra el holdout y si las bajas se mantienen bajo control.

### Usuario final indirecto — El alumno inactivo

No entra en la aplicación: solo recibe el email. Su experiencia es el producto. Si el correo suena a
plantilla, hemos fallado aunque el dashboard diga que todo va bien.

---

## Funcionalidades core (MoSCoW)

### MUST

- **Ingesta del dataset a Supabase.** Esquema (`alumnos`, `plantillas`, `envios`) + vista
  `candidatos_reactivacion` + carga de los 300 alumnos, 8 plantillas y 317 envíos históricos.
- **Motor de elegibilidad en base de datos.** Toda la política de supresión vive en la vista SQL,
  nunca en el prompt del LLM: consentimiento activo, sin opt-out, sin rebote duro, sin queja de
  spam, no reactivado ya, estado ≠ baja, grupo = tratamiento, ≥21 días inactivo, ≥14 días desde el
  último envío, menos de 3 emails acumulados.
- **Segmentación automática** en cinco segmentos calculados a partir del progreso: `nunca_empezo`,
  `abandono_temprano` (<34%), `abandono_medio` (<70%), `abandono_tardio` (≥70%) y `completado`.
- **Cola de revisión priorizada.** Lista de candidatos ordenada, con la ficha del alumno visible:
  curso, sesión donde se quedó, progreso, días inactivo, motivo declarado e historial de envíos.
- **Selección de plantilla por Thompson sampling** sobre los priors Beta (`alpha`/`beta`) de cada
  variante del segmento.
- **Generación del borrador con Claude:** asunto y cuerpo personalizados a partir de la ficha del
  alumno y del tono/longitud/CTA que dicta la plantilla elegida.
- **Aprobación humana obligatoria.** Editar, aprobar o descartar. Nada sale sin clic.
- **Envío simulado por defecto**, registrado en `envios` como si fuera real. Los emails del dataset
  son `@example.com` y no son entregables por diseño.
- **Envío real de prueba a la dirección del operador** vía Resend, con el mismo email renderizado.
- **Firma humana en todos los emails.** Dos profesores ficticios repartidos por curso, con nombre,
  cargo y correo. La añade el render, no el modelo: la identidad de quien escribe no puede depender
  de que Claude se acuerde de firmar.
- **Dashboard de resultados:** tasa de reactivación por segmento y por plantilla, comparación
  tratamiento vs holdout, y evolución de los priors de cada variante.

### SHOULD

- **Registro del resultado** (reactivado / no) con su tipo: reinscripción, respuesta al email o
  login. Alimenta los contadores del bandit.
- **Actualización automática de `alpha`/`beta`** al cerrar el ciclo de un envío.
- **Enlace de baja funcional** en cada email, que escribe `opt_out_at` y saca al alumno de la vista
  de candidatos de inmediato.
- **Generación en catalán** para los 81 alumnos con `idioma = 'ca'`.
- **Regenerar borrador** pidiendo otra variante o dando una instrucción libre al modelo.
- **Filtros de la cola** por curso, segmento, cohorte y días de inactividad.
- **Vista de auditoría por alumno:** todo lo que se le ha enviado y qué pasó después.

### COULD

- **Disparo automático diario** (cron) que precalcula los borradores del día antes de que llegue el
  operador.
- **Respeto de la `hora_envio`** de cada plantilla al programar la salida.
- **Canal WhatsApp** para los 80 alumnos que lo tienen como canal preferido.
- **Export CSV** de la cola y de los resultados.
- **Cálculo de significancia estadística** del uplift, no solo la diferencia bruta.

### WON'T (esta versión)

- **Autenticación multiusuario con roles.** Herramienta interna de un equipo pequeño; una capa de
  acceso simple basta.
- **Editor visual de plantillas.** Las 8 variantes se gestionan en base de datos.
- **Integración con el LMS real de Learning Heroes.** Trabajamos sobre dataset sintético.
- **Envío masivo a direcciones reales.** Fuera de alcance en el hackathon, y el dataset no lo
  permite.
- **Secuencias multi-toque automáticas.** El techo de 3 emails por alumno se respeta; no hay drip.

---

## Flujos de usuario principales

El detalle con diagramas y casos de error está en [user-flows.md](user-flows.md). En resumen:

**Revisar y aprobar (el flujo principal).** El operador abre la cola y ve los candidatos elegibles
del día ordenados por prioridad. Selecciona uno: a la izquierda tiene la ficha completa del alumno,
a la derecha el borrador que Claude ha escrito con la plantilla que el bandit ha elegido. Lo lee, lo
retoca si hace falta, y aprueba. El envío se registra, el alumno entra en periodo de enfriamiento de
14 días y su contador de emails sube. La cola avanza al siguiente.

**Descartar.** Si el borrador no procede —el alumno no está en un buen momento, el mensaje no
encaja—, se descarta con un motivo. No se registra como envío y el alumno vuelve a la cola en el
siguiente ciclo, sin gastar uno de sus tres intentos.

**Probar de verdad.** Desde cualquier borrador, un botón manda ese mismo email a la dirección del
operador vía Resend. Sirve para ver cómo queda en un cliente de correo real antes de aprobar.

**Cerrar el ciclo.** Cuando un alumno vuelve, se marca el resultado. Eso actualiza los contadores de
la plantilla que se usó, y a partir de ahí el bandit la elegirá más a menudo.

**Medir.** El dashboard compara la tasa de reactivación del grupo de tratamiento contra la del
holdout, en global y por segmento.

---

## Modo autónomo (diseñado, sin implementar)

> **Estado: construido y probado.** El endpoint existe, está protegido con `CRON_SECRET` y en su
> primera ejecución real preparó 10 borradores en 62 segundos sin ningún fallo. Ya se puede enseñar
> funcionando, no solo contar.

Hoy el operador abre la aplicación y el sistema genera los borradores mientras él mira. El modo
autónomo invierte el orden: **un cron diario deja el trabajo hecho antes de que llegue nadie.**

Cada mañana, el sistema lee la vista de candidatos, elige plantilla para cada uno mediante Thompson
sampling y le pide a Claude que redacte el email. Cuando el operador entra, no encuentra una cola
vacía: encuentra diez borradores escritos, cada uno con el contexto de su alumno, esperando un sí o
un no. Su trabajo pasa de *redactar* a *decidir*, que es donde un humano aporta algo que el modelo
no puede.

**Dónde está el límite, y por qué está ahí.** El cron prepara, nunca envía. La aprobación humana
sigue siendo obligatoria. No es una limitación técnica —dejar que despache la cola serían pocas
líneas— sino la decisión de producto de la que cuelga todo lo demás: el coste de un email mal
calibrado a un exalumno supera al valor que intenta recuperar.

**Cómo está montado.** `/api/cron/preparar-cola` se dispara de lunes a viernes a las 7:00 (definido
en `vercel.json`), toma los primeros candidatos de la vista, elige plantilla con el bandit y genera
el borrador. Un borrador que falla no tumba la tanda: se anota y sigue. El índice único de borrador
por alumno impide duplicar trabajo si el cron se ejecuta dos veces el mismo día.

La evolución posterior sería permitir el envío automático **solo en el segmento `completado`** —un
upsell a alguien que acabó contento y quedó satisfecho es el mensaje de menor riesgo— manteniendo la
cola de revisión para todo lo demás.

---

## Requisitos no funcionales

**Privacidad y cumplimiento.** El consentimiento de marketing es condición necesaria y se comprueba
en base de datos, no en la interfaz. El opt-out es inmediato e irreversible desde la aplicación.
Ningún dato personal viaja en parámetros de URL. Los datos son sintéticos, pero el sistema se
construye como si no lo fueran.

**Seguridad del contenido generado.** El modelo solo puede usar los campos de la ficha del alumno
que se le pasan explícitamente. Tiene prohibido inventar descuentos, fechas límite, plazas
reservadas o cualquier compromiso comercial que la escuela no pueda cumplir. Todo borrador pasa por
revisión humana antes de salir.

**Guardarraíles de envío, no negociables.** Enfriamiento de 14 días entre correos al mismo alumno,
techo de 3 emails por alumno, y mínimo de 21 días de inactividad para entrar en la cola. Se aplican
en la vista SQL, de modo que ningún camino de la aplicación pueda saltárselos.

**Trazabilidad.** Cada envío guarda qué plantilla se usó, qué modelo lo generó y con qué versión de
prompt. Sin eso, la comparación entre variantes no vale nada.

**Rendimiento.** La cola carga en menos de un segundo con 300 alumnos. La generación de un borrador
puede tardar unos segundos: se muestra en streaming para que la espera se note poco.

**Idioma.** Interfaz en castellano. Emails en el idioma del alumno (`es` / `ca`).

**Accesibilidad.** Contraste mínimo AA, navegación por teclado completa en la cola de revisión —es
una pantalla de uso repetitivo, se recorre con el teclado.

---

## Fuera de alcance (explícito)

| Descartado | Motivo |
|---|---|
| Envío real a las direcciones del dataset | Son `@example.com` (RFC 2606). Rebotarían y ensuciarían la reputación del dominio. |
| Campañas de captación de alumnos nuevos | El producto es de reactivación. Otro problema, otras métricas. |
| Panel para el alumno | El alumno solo recibe el email y puede darse de baja. No hay app para él. |
| Predicción de abandono antes de que ocurra | Interesante, pero es otro producto. Aquí actuamos sobre gente que ya se fue. |
| Automatizar el envío sin revisión humana | Decisión de producto, no técnica: el coste de un email mal escrito a un exalumno es alto. |
| Multi-tenant para otras escuelas | Herramienta interna de Learning Heroes. |
