# El acceso pasa a flujo implícito para no depender de dónde se abra el enlace

**Fecha:** 2026-08-14 02:10
**Tipo:** Fix

## Qué se descubrió

El enlace de acceso seguía llegando con la plantilla antigua después de cambiarla en Supabase.
Recuperando el correo enviado desde la API de Resend se ve el cuerpo real:

```html
<h2>Your sign-in link</h2>
<p><a href="https://…supabase.co/auth/v1/verify?token=…&type=magiclink
            &redirect_to=https://wake-up-beta.vercel.app/auth/callback">Sign in</a></p>
```

Es `{{ .ConfirmationURL }}`, no `{{ .TokenHash }}`. Y el asunto —"Your sign-in link"— no es el de
Supabase por defecto ni el de la plantilla nueva. Conclusión: **ese correo no lo está generando la
plantilla que se editó**. Con SMTP propio Resend solo transporta, así que si el cuerpo no sale de la
plantilla de Supabase, hay otra cosa generándolo: lo habitual es un *Send Email Hook* configurado en
Authentication → Hooks, que sustituye a las plantillas por completo.

## Qué se hizo

Cambiar el cliente de navegador a **flujo implícito**. Con la plantilla que hay ahora —basada en
`ConfirmationURL`— la sesión llega en el fragmento de la URL, que `/auth/callback` ya sabe manejar, y
el enlace funciona se abra donde se abra.

**Es un intercambio, no una mejora.** PKCE no expone tokens en la barra de direcciones; el flujo
implícito sí, y quedan en el historial del navegador. Para una herramienta interna detrás de una
lista blanca es asumible, pero la solución definitiva sigue siendo `{{ .TokenHash }}` con
`/auth/confirm`, que verifica en el servidor y no tiene ninguno de los dos problemas. Cuando esa
plantilla esté activa, se quita el `flowType` y se vuelve a PKCE.

## Qué se modificó

- `src/lib/supabase/navegador.ts`

## Nota sobre el "entré automáticamente"

Entrar sin pulsar nada en un navegador no significa que el enlace funcionara: significa que ese
navegador ya tenía sesión abierta de un acceso anterior. Las sesiones de Supabase se renuevan solas
mientras la pestaña siga viva.
