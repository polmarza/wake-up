# Changelog

Registro estructurado de cada cambio importante del proyecto: qué se hizo, qué se modificó y por qué.

Una entrada por cambio importante, en orden cronológico. Si el cambio afecta a algo documentado en
`docs/`, ese documento se actualiza en la misma sesión.

---

## Cómo añadir una entrada

Usa `/changelog`. El agente crea el archivo con la fecha y hora reales y rellena las secciones.

**Nombre del archivo:** `YYYY-MM-DD_HH-MM_descripcion-breve.md`

**Contenido mínimo:**

```markdown
# [Descripción breve del cambio]

**Fecha:** YYYY-MM-DD HH:MM
**Tipo:** Feature / Fix / Refactor / Migración / Documentación / Configuración

## Qué se hizo
[Descripción de lo que se implementó o modificó]

## Qué se modificó
[Lista de archivos afectados]

## Por qué
[Contexto o motivación del cambio]
```

---

Este archivo es la única excepción: no es una entrada, es la explicación del formato.
Puedes conservarlo o borrarlo cuando el changelog tenga entradas reales.
