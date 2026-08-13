# Acceso por dominio, fallo cerrado y aviso de repositorio de prueba

**Fecha:** 2026-08-14 01:25
**Tipo:** Feature

## Qué se hizo

**`EMAILS_PERMITIDOS` admite dominios enteros.** Además de direcciones sueltas, ahora acepta
`@learningheroes.com` (o `learningheroes.com`), para no tener que ir añadiendo a cada persona del
equipo una por una.

La lógica vive en `src/lib/config/acceso.ts`, un módulo puro sin dependencias del entorno: lo usan
el `proxy` —que corre en el edge—, la validación de configuración y los scripts de consola. Que sea
puro es lo que permite probarlo a fondo, y esta lista merece pruebas a fondo: quien entra ve la
ficha completa de 300 alumnos.

**Ahora falla cerrado.** Antes, una lista vacía dejaba pasar a cualquiera con un enlace mágico
válido. Un olvido de configuración se convertía en una puerta abierta y encima silenciosa: todo
parecía funcionar. Ahora una lista vacía deniega a todo el mundo, y el login lo explica con un
mensaje distinto al de "no eres del equipo", porque se arreglan de forma diferente.

**La pantalla de login enseña el motivo del rechazo.** Antes se pasaba `?error=…` en la URL y nadie
lo leía.

**Aviso al principio del README**: este repositorio es una prueba de concepto de hackathon, los 300
alumnos son inventados y las cifras de negocio son ilustrativas. El dominio `example.com` está
reservado por la RFC 2606 y el prefijo `+34 999` no corresponde a números reales.

## Qué se modificó

- `src/lib/config/acceso.ts` + 12 tests
- `src/proxy.ts`, `src/lib/config/entorno.ts`, `scripts/enlace-acceso.ts`
- `src/app/(auth)/login/page.tsx`
- `README.md`, `.env.example`, `.env.local`

## Casos que cubren los tests

Los tres que importan de verdad: un subdominio (`alguien@mail.learningheroes.com`) **no** entra; un
dominio que solo termina igual (`intruso@falsolearningheroes.com`) tampoco, que es lo que rompería
una comparación con `endsWith` mal escrita; y una lista vacía deniega a todos.

## Aviso operativo

El servicio de email integrado de Supabase solo entrega a direcciones preautorizadas del equipo de
la organización. Permitir el dominio en la aplicación no basta para que a esas personas les llegue
el enlace: hace falta SMTP propio.
