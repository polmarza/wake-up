Crea una nueva entrada en `changelog/` siguiendo el protocolo del proyecto.

1. Usa la fecha y hora actuales para nombrar el archivo: `YYYY-MM-DD_HH-MM_descripcion-breve.md`
2. Si el usuario no ha indicado qué cambio registrar, pregúntale.
3. Rellena las tres secciones obligatorias: qué se hizo, qué archivos se modificaron, por qué.
4. Si el cambio afecta algún documento de `docs/`, recuérdale al usuario que hay que actualizarlo en esta misma sesión.

Si el cambio toca las condiciones de la vista `candidatos_reactivacion`, dilo explícitamente en la entrada: es un cambio de política de contacto, no un detalle técnico, y exige además migración, actualización de `docs/data-model.md` y test.
