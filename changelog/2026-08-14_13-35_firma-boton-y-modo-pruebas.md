# Firma humana, botón de marca y reinicio de fichas de prueba

**Fecha:** 2026-08-14 13:35
**Tipo:** Feature

## Qué se hizo

**Firma en todos los emails.** Dos profesores ficticios —Neus Bagué y Roger Solans— repartidos por
curso: los de producto y desarrollo llevan uno, los de datos y automatización el otro. Nombre, cargo
y correo de la escuela.

**La firma la añade el render, no el modelo.** El prompt le prohíbe firmar precisamente para que la
identidad de quien escribe no dependa de que Claude se acuerde. Un email sin firma parece de un
sistema; el mismo email firmado parece de una persona, y esa diferencia es medio producto.

Dos personas y no cuatro: con más, cada una aparece tan poco que deja de construir relación con el
alumno. Las direcciones son de atrezo —se ven en la firma, pero las respuestas van a la dirección
real desde la que sale el correo.

**Botón de marca** en magenta hacia learningheroes.com, con el texto ajustado al segmento: quien ya
terminó no lee "retoma el curso" —no hay nada que retomar, y el desajuste delata que el mensaje es
automático— sino "ver el siguiente curso".

**Reinicio de fichas de prueba.** Tras aprobar un envío, el alumno sale de la cola por el
enfriamiento de catorce días, lo que hacía imposible probar dos veces seguidas sin tocar la base de
datos a mano. Ahora la pantalla de "ya no es elegible" ofrece devolverlo a la cola.

**No toca la política de supresión.** La vista sigue idéntica: la acción solo pone los contadores de
campaña a cero, igual que si nunca se le hubiera escrito. Y solo funciona con las direcciones
autorizadas para envío real —los buzones del equipo—, así que ningún alumno del dataset puede
recibir un cuarto correo por esta vía. Sin esa condición, esto sería una puerta trasera al techo de
tres intentos.

## Qué se modificó

- `src/lib/email/firma.ts` — nuevo: personas, reparto por curso, texto del botón
- `src/lib/email/render.ts` — firma, botón y baja en HTML y texto plano
- `src/lib/email/enviar.ts`, `src/app/(app)/cola/acciones.ts` — contexto del email
- `src/components/cola/BotonReiniciar.tsx`, `src/app/(app)/cola/[id]/page.tsx`
- `src/lib/candidatos/consultas.ts` — `alumnoPorId`
- `docs/prd.md`, `docs/architecture.md`
