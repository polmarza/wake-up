# Diagnóstico del enlace de acceso y salida sin depender del correo

**Fecha:** 2026-08-14 00:45
**Tipo:** Fix

## Qué se hizo

El enlace mágico de acceso dejó de llegar. Diagnóstico: **no era un fallo de la aplicación**.

`auth.users` muestra que `polmarza@gmail.com` se creó, se confirmó y **firmó sesión** a las 22:27:55
UTC — es decir, el correo llegó y funcionó. Los intentos posteriores fallan con
`429 over_email_send_rate_limit`: el servicio de email integrado de Supabase permite **2 mensajes
por hora** y solo a direcciones preautorizadas del equipo de la organización.

Nada que ver con Resend, que en este proyecto solo interviene en el envío real de prueba.

Se añadieron dos utilidades:

- `scripts/probar-login.ts` — pide el enlace por la misma vía que la pantalla de login y enseña el
  error tal cual viene de la API. La interfaz lo oculta a propósito, para no revelar quién pertenece
  al equipo, y eso hace que un problema de entrega sea indistinguible de un correo no autorizado.
- `scripts/enlace-acceso.ts` — genera el enlace con la API de administración y lo imprime por
  consola, sin pasar por el correo. Comprueba antes que la dirección esté en `EMAILS_PERMITIDOS`,
  porque si no el middleware la echaría nada más entrar.

## Qué se modificó

- `scripts/probar-login.ts`, `scripts/enlace-acceso.ts`
- `README.md` — sección "Si el enlace de acceso no llega"

## Por qué

El límite de 2 correos por hora es fácil de agotar probando, y el mensaje de error que ve el usuario
no distingue entre "no eres del equipo" y "has gastado la cuota". Sin una forma de ver el error real
y otra de entrar sin correo, un problema de quince minutos puede comerse una demo.

## Solución definitiva pendiente

Configurar SMTP propio en Supabase (Authentication → Emails → SMTP Settings). Resend sirve, así que
la misma cuenta cubre el acceso al panel y el envío real de prueba.
