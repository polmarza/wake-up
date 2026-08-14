# Escala tipográfica más grande y botón de cerrar sesión

**Fecha:** 2026-08-14 02:45
**Tipo:** Feature

## Qué se hizo

**Toda la tipografía sube unos 2px.** La escala de Tailwind se redefine en `globals.css`
(`--text-xs` 13px, `--text-sm` 15px, `--text-base` 16px) y los tamaños arbitrarios repartidos por
los componentes suben en la misma proporción: 11→13, 12→14, 13→15.

El suelo pasa a ser 13px y solo para etiquetas. El motivo no es estético: esta herramienta se
enseña proyectada y se lee de pie, y el aviso más importante de la aplicación —el que explica por
qué el uplift no es creíble— estaba escrito a 12px, que es justo el tamaño al que nadie lo lee. Un
aviso que no se lee no es un aviso.

**Botón de cerrar sesión** en la navegación, con icono y etiqueta "Salir". Es una acción de servidor
y no una llamada desde el navegador porque la sesión vive en cookies: borrarla desde el servidor es
lo que garantiza que no queda una cookie huérfana con la que el `proxy` siga dejando pasar.

**La lista de destinatarios reales admite dominios**, igual que la de acceso: `@learningheroes.com`
autoriza a cualquiera de ese dominio. Con una diferencia que conviene tener presente y que quedó
escrita en el código: en la lista de acceso un dominio decide *quién entra*; en esta decide *a quién
se le puede escribir*, y un error acaba en la bandeja de otra persona.

## Qué se modificó

- `src/app/globals.css` — escala tipográfica
- 9 componentes con tamaños arbitrarios
- `src/components/Navegacion.tsx`, `src/app/(app)/acciones-sesion.ts`
- `src/lib/config/entorno.ts` + 2 tests de dominio en la lista de envío
- `docs/design-system.md`
