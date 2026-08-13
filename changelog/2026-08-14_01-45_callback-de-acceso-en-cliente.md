# El canje del enlace mágico pasa a cliente: el servidor no puede ver el fragmento

**Fecha:** 2026-08-14 01:45
**Tipo:** Fix

## Qué pasaba

Abrir el enlace de acceso llevaba a `/login?error=enlace-caducado` aunque el enlace fuera nuevo.

## La causa

Supabase devuelve la sesión de dos formas distintas según cómo se pidiera el enlace:

- **PKCE** (lo que usa el navegador al pedirlo desde la pantalla de login): `?code=…`, y el canje
  necesita un verificador que guardó ese mismo navegador en esa misma dirección.
- **Implícito** (enlaces generados con la API de administración): `#access_token=…`.

Comprobado siguiendo la redirección real con `curl`:

```
location: https://wake-up-beta.vercel.app/auth/callback#access_token=…&refresh_token=…&type=magiclink
```

El callback era una **ruta de servidor** que solo leía `?code=`. El fragmento `#` no se envía nunca
al servidor —es cosa del navegador—, así que en el flujo implícito el servidor recibía una URL sin
nada. Y cuando sí llegaba un `code`, cualquier fallo del canje se traducía a "enlace caducado", que
manda a buscar el problema justo donde no está.

## Qué se hizo

`/auth/callback` pasa a ser una página de cliente que maneja los tres casos —código PKCE, tokens en
el fragmento y errores devueltos por Supabase— y **explica el motivo real** en pantalla en lugar de
rebotar con un código genérico. Los dos mensajes que ahorran tiempo:

- `otp_expired`: el enlace es de un solo uso, y un antivirus de correo que abra los enlaces antes
  que el usuario lo consume por el camino.
- Fallo de canje PKCE: hay que abrir el enlace **en el mismo navegador y en la misma dirección**
  donde se pidió. Pedirlo en `localhost` y abrirlo en la web publicada no funciona, porque el
  verificador vive en el origen donde se pidió.

## Qué se modificó

- `src/app/auth/callback/route.ts` → eliminado
- `src/app/auth/callback/page.tsx` → nuevo

## Lección

Un mensaje de error inventado por comodidad ("caducado") cuesta más caro que no tener mensaje: manda
a depurar la caducidad de tokens cuando el problema era en qué navegador se abrió el enlace.
