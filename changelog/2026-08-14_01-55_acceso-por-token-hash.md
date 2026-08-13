# Acceso por token_hash: el enlace deja de depender del navegador

**Fecha:** 2026-08-14 01:55
**Tipo:** Fix

## Qué pasaba

El enlace de acceso fallaba con `PKCE code verifier not found in storage` incluso pidiéndolo desde
la URL de producción y abriéndolo en el mismo navegador.

## La causa

El flujo PKCE guarda un verificador en el navegador que pidió el enlace y lo necesita para completar
el canje. Cualquier cosa que rompa esa continuidad —el correo abre el enlace en otro navegador o en
otro perfil, la vista web del cliente de correo, un almacenamiento limpiado por el camino— lo deja
sin arreglo posible. No es un problema de configuración: es una dependencia frágil por diseño para
este caso de uso.

## Qué se hizo

Nueva ruta `/auth/confirm` que verifica el `token_hash` **en el servidor** con `verifyOtp()`. No
depende de nada que el navegador tuviera que haber guardado antes, así que el enlace funciona se
abra donde se abra. Es el patrón que Supabase documenta para aplicaciones con servidor.

Requiere cambiar la plantilla de correo (Authentication → Email Templates → Magic Link) para que
use `{{ .TokenHash }}` en vez de `{{ .ConfirmationURL }}`. Está documentado en el README.

`/auth/callback` se mantiene para los enlaces del flujo antiguo que sigan circulando.

El login ahora enseña también el detalle que devuelve Supabase, que es lo que distingue "caducado"
de "ya usado".

## Qué se modificó

- `src/app/auth/confirm/route.ts` — nueva
- `src/proxy.ts` — ruta pública
- `src/app/(auth)/login/page.tsx` — muestra el detalle real
- `README.md` — sección sobre la plantilla de correo

## Lección

Cuando un flujo de autenticación depende de estado guardado en el navegador, el fallo no aparece en
desarrollo —siempre es el mismo navegador— y aparece justo cuando alguien abre el enlace desde el
correo del trabajo. El patrón de servidor no tiene ese modo de fallo.
