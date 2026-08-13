# Webhook de Resend: corrección en la supresión por rebote y alta por API

**Fecha:** 2026-08-14 00:55
**Tipo:** Fix

## Qué se hizo

**Corregida la condición de supresión por rebote.** El código comprobaba
`bounce.type === 'Permanent'` para marcar `hard_bounce`. La documentación de Resend define
`email.bounced` como "el servidor del destinatario rechazó el correo de forma permanente", y el
campo `bounce.type` distingue `Permanent` de `Temporary`. El problema de la condición anterior es
cómo falla: si algún día el campo llegara vacío, **dejaría de suprimir sin que nadie se enterase** y
seguiríamos escribiendo a direcciones que no existen.

Ahora se suprime **salvo que el rebote sea explícitamente temporal**. Un buzón lleno o un servidor
caído siguen sin suprimir —eso borraría alumnos válidos para siempre—, pero la ausencia del campo ya
no desactiva la protección en silencio.

Añadido `email.failed`: se anota la no entrega sin suprimir, porque no dice nada sobre la dirección.

**Alta del webhook por API** (`scripts/configurar-webhook.ts`): crea el webhook con los seis eventos
que el endpoint entiende y devuelve la clave de firma. Rechaza URLs que no sean HTTPS públicas.

## Qué se modificó

- `src/app/api/webhooks/resend/route.ts`
- `scripts/configurar-webhook.ts`
- `README.md` — sección "Webhook de Resend"

## Incidente durante el desarrollo

Al probar las validaciones del script asumí que `RESEND_API_KEY` seguía vacía. No lo estaba, así que
la ejecución **creó un webhook real** en la cuenta apuntando a `https://ejemplo.vercel.app`. Se
detectó en el momento y se borró (`a948c11b-…`); la cuenta quedó sin webhooks. La clave de firma que
se imprimió pertenecía a ese webhook y ya no sirve.

Lección aplicable: un script que crea recursos externos no se prueba "a ver qué pasa", ni siquiera
para comprobar sus guardas. Primero se mira si hay credenciales.
